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
