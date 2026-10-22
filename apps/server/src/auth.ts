import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuthAdapter } from "@boxdb/better-auth-adapter";
import type { BoxDB } from "@boxdb/client";

export type AuthConfig = {
  readonly baseURL: string;
  readonly secret: string;
  readonly webOrigin: string;
  readonly googleClientId: string;
  readonly googleClientSecret: string;
  readonly ownerEmail: string;
};

export async function createAuth(db: BoxDB, config: AuthConfig) {
  const allowed = config.ownerEmail.trim().toLowerCase();
  const options = {
    appName: "Polydays",
    baseURL: config.baseURL,
    secret: config.secret,
    database: betterAuthAdapter(db),
    trustedOrigins: [config.webOrigin, "polydays://"],
    plugins: [expo()],
    socialProviders:
      config.googleClientId && config.googleClientSecret
        ? {
            google: { clientId: config.googleClientId, clientSecret: config.googleClientSecret },
          }
        : {},
    databaseHooks: {
      user: {
        create: {
          before: async (user: { email: string; emailVerified: boolean }) => {
            if (!allowed || user.email.toLowerCase() !== allowed || !user.emailVerified)
              return false as const;
            return { data: user };
          },
        },
      },
    },
  };
  {
    await using tx = await db.begin({ mode: "immediate" });
    const exists =
      await tx.query`SELECT name FROM sqlite_master WHERE type=${"table"} AND name=${"user"}`.get();
    if (!exists) {
      const adapter = betterAuthAdapter(db)(options);
      const schema = await adapter.createSchema?.(options);
      if (!schema) throw new Error("Адаптер BoxDB не смог создать схему авторизации.");
      await tx.exec(schema.code);
    }
    await tx.commit();
  }
  return betterAuth(options);
}
export type Auth = Awaited<ReturnType<typeof createAuth>>;
