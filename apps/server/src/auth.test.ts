import { expect, it } from "vite-plus/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "./database.ts";
import { createAuth } from "./auth.ts";

const config = {
  baseURL: "http://localhost:3000",
  webOrigin: "http://localhost:8081",
  ownerEmail: "owner@example.com",
  secret: "test-only-session-secret-with-32-characters",
  googleClientId: "test-client.apps.googleusercontent.com",
  googleClientSecret: "test-only-provider-secret",
};

it("initialises Better Auth against the real BoxDB adapter", async () => {
  const db = await openDatabase(":memory:");
  try {
    const auth = await createAuth(db, config);
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
    const tables =
      await db.query`SELECT name FROM sqlite_master WHERE type=${"table"} AND name=${"session"}`.get();
    expect(tables).toEqual({ name: "session" });
  } finally {
    await db.close();
  }
});

it("approves a desktop device in the browser and redeems its code once for a bearer session", async () => {
  const db = await openDatabase(":memory:");
  try {
    const auth = await createAuth(db, config);
    const context = await auth.$context;
    const user = await context.internalAdapter.createUser(
      { name: "Owner", email: config.ownerEmail, emailVerified: true },
      { method: "oauth" },
    );
    const browserSession = await context.internalAdapter.createSession(user.id);
    const headers = new Headers({ Authorization: `Bearer ${browserSession.token}` });
    await expect(auth.api.deviceCode({ body: { client_id: "unknown-client" } })).rejects.toThrow();
    const code = await auth.api.deviceCode({ body: { client_id: "polydays-macos" } });
    expect(code.verification_uri_complete).toContain("/device?user_code=");
    await expect(
      auth.api.deviceApprove({ body: { userCode: code.user_code }, headers: new Headers() }),
    ).rejects.toThrow();
    await auth.api.deviceVerify({ query: { user_code: code.user_code }, headers });
    await auth.api.deviceApprove({ body: { userCode: code.user_code }, headers });
    const body = {
      client_id: "polydays-macos",
      device_code: code.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code" as const,
    };
    const granted = await auth.api.deviceToken({ body });
    const session = await auth.api.getSession({
      headers: new Headers({ Authorization: `Bearer ${granted.access_token}` }),
    });
    expect(session?.user.id).toBe(user.id);
    await expect(auth.api.deviceToken({ body })).rejects.toThrow();
    await auth.api.signOut({
      headers: new Headers({ Authorization: `Bearer ${granted.access_token}` }),
    });
    expect(
      await auth.api.getSession({
        headers: new Headers({ Authorization: `Bearer ${granted.access_token}` }),
      }),
    ).toBeNull();
  } finally {
    await db.close();
  }
});

it("serialises first-time auth schema creation across independent database connections", async () => {
  const directory = await mkdtemp(join(tmpdir(), "polydays-auth-"));
  const clients: Awaited<ReturnType<typeof openDatabase>>[] = [];
  try {
    for (let index = 0; index < 4; index++)
      clients.push(await openDatabase(join(directory, "test.db")));
    const results = await Promise.allSettled(clients.map((db) => createAuth(db, config)));
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
      expect(await result.value.api.getSession({ headers: new Headers() })).toBeNull();
    }
    expect(
      await clients[0]!
        .query`SELECT name FROM sqlite_master WHERE type=${"table"} AND name IN (${"user"}, ${"session"}, ${"account"}, ${"verification"}) ORDER BY name`,
    ).toEqual([
      { name: "account" },
      { name: "session" },
      { name: "user" },
      { name: "verification" },
    ]);
  } finally {
    await Promise.all(clients.map((db) => db.close()));
    await rm(directory, { recursive: true, force: true });
  }
});
