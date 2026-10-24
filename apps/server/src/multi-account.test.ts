import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toNodeHandler } from "better-auth/node";
import { expect, it } from "vite-plus/test";
import { defaultSlots, type Document } from "@polydays/core";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "./api.ts";
import { createAPI } from "./api.ts";
import { createAuth } from "./auth.ts";
import { openDatabase } from "./database.ts";

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "polydays-accounts-"));
  const databasePath = join(directory, "test.db");
  const db = await openDatabase(databasePath);
  const http = createServer();
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  const baseURL = `http://127.0.0.1:${address.port}`;
  const resource = `${baseURL}/mcp`;
  const config = {
    databasePath,
    baseURL,
    webOrigin: baseURL,
    allowedEmails: "*",
    ownerEmail: "alice@example.com",
    secret: "test-only-session-secret-with-32-characters",
    googleClientId: "",
    googleClientSecret: "",
    devAuth: false,
    staticDirectory: "apps/client/dist",
  };
  const auth = await createAuth(db, config);
  http.on("request", toNodeHandler(auth));
  const options = { ...config, auth };
  const api = createAPI(options);
  const apis = [api];
  await api.ready();
  const context = await auth.$context;
  const account = async (email: string) => {
    const user = await context.internalAdapter.createUser(
      { name: email, email, emailVerified: true },
      { method: "oauth" },
    );
    const session = await context.internalAdapter.createSession(user.id);
    return {
      user,
      headers: new Headers({
        Authorization: `Bearer ${session.token}`,
        Origin: baseURL,
        "content-type": "application/json",
      }),
    };
  };
  const alice = await account("alice@example.com");
  const bob = await account("bob@example.com");
  const oauthPost = (
    path: string,
    body: Record<string, string | string[] | boolean>,
    headers?: Headers,
  ) => {
    const form = path === "/oauth2/token";
    return auth.handler(
      new Request(`${baseURL}/api/auth${path}`, {
        method: "POST",
        headers: headers ?? {
          "content-type": form ? "application/x-www-form-urlencoded" : "application/json",
        },
        body: form ? new URLSearchParams(body as Record<string, string>) : JSON.stringify(body),
      }),
    );
  };
  const register = async (name: string) => {
    const response = await oauthPost("/oauth2/register", {
      client_name: name,
      redirect_uris: ["http://localhost:45678/callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "polydays:read polydays:write offline_access",
    });
    expect(response.status).toBe(201);
    return (await response.json()).client_id as string;
  };
  const sharedClient = await register("Shared MCP client");
  const authorize = async (headers: Headers, clientId = sharedClient) => {
    const verifier = randomBytes(32).toString("base64url");
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: "http://localhost:45678/callback",
      response_type: "code",
      scope: "polydays:read polydays:write offline_access",
      resource,
      state: "test-state",
      prompt: "consent",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    });
    const response = await auth.handler(
      new Request(`${baseURL}/api/auth/oauth2/authorize?${query}`, { headers }),
    );
    expect(response.status).toBe(302);
    const consentURL = new URL(response.headers.get("location")!, baseURL);
    const consent = await oauthPost(
      "/oauth2/consent",
      { accept: true, oauth_query: consentURL.search.slice(1) },
      headers,
    );
    expect(consent.status).toBe(200);
    const callback = new URL((await consent.json()).url);
    return { code: callback.searchParams.get("code")!, verifier, clientId };
  };
  const redeem = (grant: Awaited<ReturnType<typeof authorize>>) =>
    oauthPost("/oauth2/token", {
      grant_type: "authorization_code",
      client_id: grant.clientId,
      code: grant.code,
      code_verifier: grant.verifier,
      redirect_uri: "http://localhost:45678/callback",
      resource,
    });
  const token = async (headers: Headers, clientId = sharedClient) => {
    const response = await redeem(await authorize(headers, clientId));
    expect(response.status).toBe(200);
    return response.json();
  };
  const request = (headers: Headers, path: string, body?: unknown, target = api) =>
    target.handle(
      new Request(baseURL + path, {
        headers,
        method: body === undefined ? "GET" : "POST",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  const rpc = async (token: string, name: string, args: unknown = {}, target = api) => {
    const response = await target.handle(
      new Request(resource, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2025-03-26",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name, arguments: args },
        }),
      }),
    );
    const body = await response.text();
    return {
      status: response.status,
      payload: response.ok
        ? JSON.parse(
            body.startsWith("event:")
              ? body
                  .split("\n")
                  .find((line) => line.startsWith("data: "))!
                  .slice(6)
              : body,
          )
        : null,
    };
  };
  return {
    api,
    auth,
    context,
    alice,
    bob,
    baseURL,
    request,
    rpc,
    token,
    authorize,
    redeem,
    register,
    sharedClient,
    oauthPost,
    restricted: () => {
      const restricted = createAPI({ ...options, allowedEmails: "alice@example.com" });
      apis.push(restricted);
      return restricted;
    },
    close: async () => {
      await Promise.all(apis.map((api) => api.close()));
      http.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        http.close((error) => (error ? reject(error) : resolve())),
      );
      await db.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

it("isolates sync, MCP commands and grants for multiple people using the same and different clients", async () => {
  const f = await setup();
  try {
    const calendar: Document = {
      kind: "calendar",
      data: {
        id: "calendar",
        mode: "fixed",
        frozen: [],
        versions: [{ id: "v1", from: "2026-10-01", timeZone: "Asia/Tbilisi", slots: defaultSlots }],
      },
    };
    for (const account of [f.alice, f.bob]) {
      expect(await (await f.request(account.headers, "/api/session")).json()).toMatchObject({
        user: { id: account.user.id },
      });
      expect(
        (
          await f.request(account.headers, "/api/sync", {
            cursor: 0,
            operations: [{ id: "same-operation", entity: calendar, base: null, at: 1 }],
          })
        ).status,
      ).toBe(200);
    }
    const alice = await f.token(f.alice.headers);
    const bob = await f.token(f.bob.headers);
    const staleRequest = {
      accountId: f.alice.user.id,
      cursor: 0,
      operations: [{ id: "stale-tab", entity: calendar, base: null, at: 1 }],
    };
    expect((await f.request(f.bob.headers, "/api/sync", staleRequest)).status).toBe(401);
    const client = createTRPCClient<AppRouter>({
      links: [
        httpLink({
          url: f.baseURL + "/trpc",
          headers: () => f.bob.headers,
          fetch: (input, init) => {
            if (typeof init?.body !== "string") throw new Error("Expected JSON mutation body");
            return f.api.handle(
              new Request(input, { method: "POST", headers: f.bob.headers, body: init.body }),
            );
          },
        }),
      ],
    });
    await expect(client.sync.mutate(staleRequest)).rejects.toMatchObject({
      data: { code: "UNAUTHORIZED" },
    });
    expect(
      (
        await f.request(f.bob.headers, "/api/sync", {
          ...staleRequest,
          accountId: f.bob.user.id,
          operations: [],
        })
      ).status,
    ).toBe(200);
    const secondClient = await f.register("Alice's second MCP client");
    const secondAlice = await f.token(f.alice.headers, secondClient);
    for (const [tokens, title] of [
      [alice, "Alice private task"],
      [bob, "Bob private task"],
    ] as const) {
      const created = await f.rpc(tokens.access_token, "create_task", {
        requestId: "same-command",
        title,
      });
      expect(created.payload.result.isError).not.toBe(true);
    }
    const readAlice = await f.rpc(alice.access_token, "list_tasks", { view: "inbox" });
    const readBob = await f.rpc(bob.access_token, "list_tasks", { view: "inbox" });
    expect(
      readAlice.payload.result.structuredContent.data.tasks.map(
        (row: { task: { title: string } }) => row.task.title,
      ),
    ).toEqual(["Alice private task"]);
    expect(
      readBob.payload.result.structuredContent.data.tasks.map(
        (row: { task: { title: string } }) => row.task.title,
      ),
    ).toEqual(["Bob private task"]);
    const bobTask = readBob.payload.result.structuredContent.data.tasks[0];
    expect(
      (await f.rpc(alice.access_token, "get_task", { id: bobTask.task.id })).payload.result.isError,
    ).toBe(true);
    expect(
      (
        await f.rpc(alice.access_token, "delete_task", {
          requestId: "cross-user",
          id: bobTask.task.id,
          revision: bobTask.revision,
        })
      ).payload.result.isError,
    ).toBe(true);
    const synced = await (
      await f.request(f.alice.headers, "/api/sync", {
        cursor: 0,
        operations: [],
        userId: f.bob.user.id,
      })
    ).json();
    expect(
      synced.changes
        .filter((row: { document: Document }) => row.document.kind === "task")
        .map((row: { document: Document }) => row.document.data),
    ).toMatchObject([{ title: "Alice private task" }]);
    const aliceConsents = await f.auth.api.getOAuthConsents({ headers: f.alice.headers });
    const bobConsents = await f.auth.api.getOAuthConsents({ headers: f.bob.headers });
    expect(aliceConsents).toHaveLength(2);
    expect(bobConsents).toHaveLength(1);
    const connections = await (await f.request(f.bob.headers, "/connect")).text();
    expect(connections).toContain("bob@example.com");
    expect(connections).not.toContain("alice@example.com");
    expect(
      (await f.request(f.alice.headers, "/connect/revoke", { id: bobConsents[0]!.id })).status,
    ).toBe(404);
    const outstandingBob = await f.authorize(f.bob.headers);
    expect(
      (
        await f.request(f.alice.headers, "/connect/revoke", {
          id: aliceConsents.find((c) => c.clientId === f.sharedClient)!.id,
        })
      ).status,
    ).toBe(200);
    expect((await f.rpc(alice.access_token, "get_context")).status).toBe(401);
    expect((await f.rpc(bob.access_token, "get_context")).status).toBe(200);
    expect((await f.rpc(secondAlice.access_token, "get_context")).status).toBe(200);
    expect((await f.redeem(outstandingBob)).status).toBe(200);
    expect(
      (
        await f.oauthPost("/oauth2/token", {
          grant_type: "refresh_token",
          client_id: f.sharedClient,
          refresh_token: alice.refresh_token,
          resource: f.baseURL + "/mcp",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await f.oauthPost("/oauth2/token", {
          grant_type: "refresh_token",
          client_id: f.sharedClient,
          refresh_token: bob.refresh_token,
          resource: f.baseURL + "/mcp",
        })
      ).status,
    ).toBe(200);
  } finally {
    await f.close();
  }
});

it("rechecks allowlists and email verification for existing sessions and MCP tokens", async () => {
  const f = await setup();
  try {
    const bob = await f.token(f.bob.headers);
    const restricted = f.restricted();
    expect(
      await (await f.request(f.bob.headers, "/api/session", undefined, restricted)).json(),
    ).toEqual({ user: null });
    expect(
      (await f.request(f.bob.headers, "/api/sync", { cursor: 0, operations: [] }, restricted))
        .status,
    ).toBe(401);
    expect((await f.request(f.bob.headers, "/connect", undefined, restricted)).status).toBe(403);
    expect((await f.rpc(bob.access_token, "get_context", {}, restricted)).status).toBe(403);
    expect(
      (await f.request(f.alice.headers, "/api/sync", { cursor: 0, operations: [] }, restricted))
        .status,
    ).toBe(200);
    await f.context.adapter.update({
      model: "user",
      where: [{ field: "id", value: f.bob.user.id }],
      update: { emailVerified: false },
    });
    expect(await (await f.request(f.bob.headers, "/api/session")).json()).toEqual({ user: null });
    expect((await f.rpc(bob.access_token, "get_context")).status).toBe(403);
  } finally {
    await f.close();
  }
});
