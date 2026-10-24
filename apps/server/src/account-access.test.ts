import { expect, it } from "vite-plus/test";
import { createAccountAccess } from "./account-access.ts";
import { createAuth } from "./auth.ts";
import { openDatabase } from "./database.ts";

it("admits verified accounts and normalizes explicit allowlists without widening legacy access", () => {
  const user = { email: "Alice@example.com", emailVerified: true };
  expect(createAccountAccess()(user)).toBe(true);
  expect(createAccountAccess()({ ...user, emailVerified: false })).toBe(false);
  expect(createAccountAccess()(null)).toBe(false);
  const restricted = createAccountAccess({
    allowedEmails: " alice@example.com, BOB@example.com ",
    ownerEmail: "legacy@example.com",
  });
  expect(restricted(user)).toBe(true);
  expect(restricted({ ...user, email: "bob@example.com" })).toBe(true);
  expect(restricted({ ...user, email: "legacy@example.com" })).toBe(false);
  expect(createAccountAccess({ ownerEmail: "legacy@example.com" })(user)).toBe(false);
  expect(createAccountAccess({ allowedEmails: "*", ownerEmail: "legacy@example.com" })(user)).toBe(
    true,
  );
  expect(() => createAccountAccess({ allowedEmails: "" })).toThrow("ALLOWED_EMAILS");
  expect(() => createAccountAccess({ allowedEmails: "*,alice@example.com" })).toThrow(
    "ALLOWED_EMAILS",
  );
});

it("applies the account policy when registering users through the real auth adapter", async () => {
  const db = await openDatabase(":memory:");
  try {
    const auth = await createAuth(db, {
      baseURL: "http://localhost:3000",
      webOrigin: "http://localhost:3000",
      allowedEmails: "alice@example.com,bob@example.com",
      secret: "test-only-session-secret-with-32-characters",
      googleClientId: "",
      googleClientSecret: "",
    });
    const { internalAdapter } = await auth.$context;
    for (const email of ["alice@example.com", "bob@example.com"])
      expect(
        await internalAdapter.createUser(
          { name: email, email, emailVerified: true },
          { method: "oauth" },
        ),
      ).toMatchObject({ email });
    expect(
      await internalAdapter.createUser(
        { name: "Other", email: "other@example.com", emailVerified: true },
        { method: "oauth" },
      ),
    ).toBeNull();
    expect(
      await internalAdapter.createUser(
        { name: "Unverified", email: "alice@example.com", emailVerified: false },
        { method: "oauth" },
      ),
    ).toBeNull();
  } finally {
    await db.close();
  }
});
