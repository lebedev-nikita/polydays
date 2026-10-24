import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { toNodeHandler } from "better-auth/node";
import { expect, it } from "vite-plus/test";
import { createAuth } from "./auth.ts";
import { openDatabase } from "./database.ts";
import { createAppMcp, protectAppMcp } from "./mcp.ts";
import { oauthPage } from "./oauth-pages.ts";
import { createAccountAccess } from "./account-access.ts";

it("completes OAuth PKCE and immediately revokes JWT access without reviving it on reconnection", async () => {
  const db = await openDatabase(":memory:");
  const http = createServer();
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  const baseURL = `http://127.0.0.1:${address.port}`;
  const resource = `${baseURL}/mcp`;
  const auth = await createAuth(db, {
    baseURL,
    webOrigin: baseURL,
    secret: "test-only-session-secret-with-32-characters",
    ownerEmail: "owner@example.com",
    googleClientId: "",
    googleClientSecret: "",
  });
  http.on("request", toNodeHandler(auth));
  const handler = createAppMcp({
    snapshot: async () => [],
    command: async () => {
      throw new Error("Must not write");
    },
  });
  const canAccess = createAccountAccess({ ownerEmail: "owner@example.com" });
  const protectedMcp = protectAppMcp(auth, handler, resource, canAccess);
  try {
    const metadata = await auth.handler(
      new Request(`${baseURL}/.well-known/oauth-protected-resource/mcp`),
    );
    expect(metadata.status).toBe(200);
    expect(await metadata.json()).toMatchObject({
      resource,
      authorization_servers: [`${baseURL}/api/auth`],
    });
    const context = await auth.$context;
    const user = await context.internalAdapter.createUser(
      { name: "Owner", email: "owner@example.com", emailVerified: true },
      { method: "oauth" },
    );
    const session = await context.internalAdapter.createSession(user.id);
    const headers = new Headers({
      Authorization: `Bearer ${session.token}`,
      Origin: baseURL,
      "content-type": "application/json",
    });
    const request = (
      path: string,
      body: Record<string, string | string[] | boolean>,
      browser = false,
    ) =>
      auth.handler(
        new Request(`${baseURL}/api/auth${path}`, {
          method: "POST",
          headers: browser
            ? headers
            : {
                "content-type":
                  path === "/oauth2/token"
                    ? "application/x-www-form-urlencoded"
                    : "application/json",
              },
          body:
            path === "/oauth2/token"
              ? new URLSearchParams(body as Record<string, string>)
              : JSON.stringify(body),
        }),
      );
    const registration = await request("/oauth2/register", {
      client_name: "Test MCP",
      redirect_uris: ["http://localhost:45678/callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "polydays:read offline_access",
    });
    expect(registration.status).toBe(201);
    const client = await registration.json();
    const authorize = async () => {
      const verifier = randomBytes(32).toString("base64url");
      const query = new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: "http://localhost:45678/callback",
        response_type: "code",
        scope: "polydays:read offline_access",
        resource,
        state: "test-state",
        prompt: "consent",
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
      });
      const authorization = await auth.handler(
        new Request(`${baseURL}/api/auth/oauth2/authorize?${query}`, { headers }),
      );
      expect(authorization.status).toBe(302);
      const consentURL = new URL(authorization.headers.get("location")!, baseURL);
      expect(consentURL.pathname).toBe("/connect/consent");
      const consent = await request(
        "/oauth2/consent",
        { accept: true, oauth_query: consentURL.search.slice(1) },
        true,
      );
      expect(consent.status).toBe(200);
      const redirect = await consent.json();
      const callback = new URL(redirect.url);
      expect(callback.searchParams.get("state")).toBe("test-state");
      return { code: callback.searchParams.get("code")!, verifier };
    };
    const grant = await authorize();
    const invalidGrant = await authorize();
    const invalidProof = await request("/oauth2/token", {
      grant_type: "authorization_code",
      client_id: client.client_id,
      code: invalidGrant.code,
      code_verifier: randomBytes(32).toString("base64url"),
      redirect_uri: "http://localhost:45678/callback",
      resource,
    });
    expect(invalidProof.status).toBe(400);
    const tokenBody = {
      grant_type: "authorization_code",
      client_id: client.client_id,
      code: grant.code,
      code_verifier: grant.verifier,
      redirect_uri: "http://localhost:45678/callback",
      resource,
    };
    const tokenResponse = await request("/oauth2/token", tokenBody);
    expect(tokenResponse.status).toBe(200);
    const tokens = await tokenResponse.json();
    expect(tokens.access_token.split(".")).toHaveLength(3);
    expect(tokens.refresh_token).toBeTruthy();
    expect((await request("/oauth2/token", tokenBody)).status).toBe(400);
    const mcpRequest = (name = "get_context") =>
      new Request(resource, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2025-03-26",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name, arguments: {} },
        }),
      });
    expect((await protectedMcp(new Request(resource))).status).toBe(401);
    expect((await protectedMcp(mcpRequest())).status).toBe(200);
    expect((await protectedMcp(mcpRequest("create_task"))).status).toBe(403);
    const outstanding = await authorize();
    const consents = await auth.api.getOAuthConsents({ headers });
    const revoke = await oauthPage(
      new Request(`${baseURL}/connect/revoke`, {
        method: "POST",
        headers,
        body: JSON.stringify({ id: consents[0]!.id }),
      }),
      auth,
      canAccess,
      baseURL,
    );
    expect(revoke.status).toBe(200);
    expect((await protectedMcp(mcpRequest())).status).toBe(401);
    expect(
      (
        await request("/oauth2/token", {
          grant_type: "refresh_token",
          client_id: client.client_id,
          refresh_token: tokens.refresh_token,
          resource,
        })
      ).status,
    ).toBe(400);
    await authorize();
    expect((await protectedMcp(mcpRequest())).status).toBe(401);
    expect(
      (
        await request("/oauth2/token", {
          ...tokenBody,
          code: outstanding.code,
          code_verifier: outstanding.verifier,
        })
      ).status,
    ).toBe(400);
  } finally {
    await handler.close();
    http.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      http.close((error) => (error ? reject(error) : resolve())),
    );
    await db.close();
  }
});
