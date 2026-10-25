import { mutationOptions, queryOptions } from "@tanstack/react-query";
import * as Schema from "effect/Schema";
import { apiFetch } from "./transport";
import { queryClient } from "./query";

const ServerConfig = Schema.Struct({ google: Schema.Boolean, devAuth: Schema.Boolean });
const GoogleConfig = Schema.Struct({ clientId: Schema.NonEmptyString });
const Session = Schema.Struct({
  user: Schema.NullOr(
    Schema.Struct({ id: Schema.String, name: Schema.String, email: Schema.String }),
  ),
});

export const serverConfigQuery = (apiURL: string) =>
  queryOptions({
    queryKey: ["server-config", apiURL],
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const response = await apiFetch(`${apiURL}/api/config`, { signal });
      if (!response.ok) throw new Error("Не удалось получить настройки сервера.");
      return Schema.decodeUnknownSync(ServerConfig)(await response.json());
    },
  });

export const googleConfigQuery = (apiURL: string) =>
  queryOptions({
    queryKey: ["google-config", apiURL],
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const response = await apiFetch(`${apiURL}/api/google-config`, { signal });
      if (!response.ok) throw new Error("Google-вход пока не настроен.");
      return Schema.decodeUnknownSync(GoogleConfig)(await response.json());
    },
  });

export const sessionQuery = (
  apiURL: string,
  accountId: string | null,
  dev: boolean,
  headers: () => Promise<Record<string, string>>,
) =>
  queryOptions({
    queryKey: ["session", apiURL, accountId, dev],
    // Login and session checks must always reach the server.
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const response = await apiFetch(`${apiURL}/api/session`, {
        credentials: "include",
        headers: dev ? { "x-polydays-dev": "1" } : await headers(),
        signal,
      });
      if (!response.ok) throw new Error("Не удалось проверить вход.");
      return Schema.decodeUnknownSync(Session)(await response.json());
    },
  });

export const deviceAuthorizationMutation = (apiURL: string, accountId: string | null) =>
  mutationOptions({
    mutationKey: ["device-authorization", apiURL, accountId],
    mutationFn: async ({ code, approve }: { code: string; approve: boolean }) => {
      await queryClient.fetchQuery({
        queryKey: ["device-code", apiURL, accountId, code],
        staleTime: 0,
        gcTime: 0,
        queryFn: async ({ signal }) => {
          const verified = await apiFetch(
            `${apiURL}/api/auth/device?user_code=${encodeURIComponent(code)}`,
            { credentials: "include", signal },
          );
          if (!verified.ok)
            throw new Error("Код недействителен или истёк. Начните вход на Mac заново.");
          return true;
        },
      });
      const response = await apiFetch(`${apiURL}/api/auth/device/${approve ? "approve" : "deny"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode: code }),
      });
      if (!response.ok) throw new Error("Не удалось подтвердить вход. Проверьте код и повторите.");
    },
  });
