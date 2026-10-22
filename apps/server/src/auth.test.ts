import { expect, it } from "vite-plus/test";
import { openDatabase } from "./database.ts";
import { createAuth } from "./auth.ts";

it("initialises Better Auth against the real BoxDB adapter", async () => {
  const db = await openDatabase(":memory:");
  try {
    const auth = await createAuth(db, {
      baseURL: "http://localhost:3000",
      webOrigin: "http://localhost:8081",
      ownerEmail: "owner@example.com",
      secret: "test-only-session-secret-with-32-characters",
      googleClientId: "test-client.apps.googleusercontent.com",
      googleClientSecret: "test-only-provider-secret",
    });
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
    const tables =
      await db.query`SELECT name FROM sqlite_master WHERE type=${"table"} AND name=${"session"}`.get();
    expect(tables).toEqual({ name: "session" });
  } finally {
    await db.close();
  }
});
