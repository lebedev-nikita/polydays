import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins/bearer";
import { jwt } from "better-auth/plugins/jwt";
import { mcp } from "@better-auth/mcp";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { deviceAuthorization } from "better-auth/plugins/device-authorization";
import { expo } from "@better-auth/expo";
import { betterAuthAdapter } from "@boxdb/better-auth-adapter";
import type { BoxDB } from "@boxdb/client";
import { Schema } from "effect";

export type AuthConfig = {
  readonly baseURL: string;
  readonly secret: string;
  readonly webOrigin: string;
  readonly googleClientId: string;
  readonly googleClientSecret: string;
  readonly ownerEmail: string;
  readonly additionalOrigins?: ReadonlyArray<string>;
};

export const mcpScopes = ["polydays:read", "polydays:write"] as const;

export function authOptions(db: BoxDB, config: AuthConfig) {
  const allowed = config.ownerEmail.trim().toLowerCase();
  const options = {
    appName: "Polydays",
    baseURL: config.baseURL,
    secret: config.secret,
    database: betterAuthAdapter(db),
    trustedOrigins: [config.webOrigin, ...(config.additionalOrigins ?? []), "polydays://"],
    plugins: [
      expo(),
      bearer(),
      jwt(),
      mcp({
        loginPage: "/connect/login",
        consentPage: "/connect/consent",
        resource: `${config.baseURL}/mcp`,
        scopes: ["openid", "profile", "email", "offline_access", ...mcpScopes],
        resources: [{ identifier: `${config.baseURL}/mcp`, allowedScopes: [...mcpScopes] }],
        grantTypes: ["authorization_code", "refresh_token"],
        accessTokenExpiresIn: 900,
        customAccessTokenClaims: async ({ user }) => ({
          polydays_consents: user
            ? Schema.decodeUnknownSync(Schema.Array(Schema.Struct({ id: Schema.String })))(
                await db.query`SELECT id FROM oauthConsent WHERE userId = ${user.id}`,
              ).map((row) => row.id)
            : [],
        }),
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        clientRegistrationDefaultApplicationType: "infer",
      }),
      cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
      deviceAuthorization({
        verificationUri: `${config.baseURL}/device`,
        validateClient: (clientId) => clientId === "polydays-macos",
        expiresIn: "10m",
        interval: "5s",
      }),
    ],
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
  return options;
}

export async function createAuth(db: BoxDB, config: AuthConfig) {
  const options = authOptions(db, config);
  {
    await using tx = await db.begin({ mode: "immediate" });
    const exists =
      await tx.query`SELECT name FROM sqlite_master WHERE type=${"table"} AND name=${"user"}`.get();
    if (!exists) {
      const schemaOptions = { ...options, plugins: [expo(), bearer()] };
      const adapter = betterAuthAdapter(db)(schemaOptions);
      const schema = await adapter.createSchema?.(schemaOptions);
      if (!schema) throw new Error("Адаптер BoxDB не смог создать схему авторизации.");
      await tx.exec(schema.code);
    }
    await tx.commit();
  }
  return betterAuth(options);
}
export type Auth = Awaited<ReturnType<typeof createAuth>>;
