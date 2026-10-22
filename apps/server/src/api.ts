import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { initTRPC, TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { decodeSyncRequest } from "@polydays/sync";
import { Effect, ManagedRuntime } from "effect";
import { Database } from "./database.ts";
import type { Auth } from "./auth.ts";

type User = { readonly id: string; readonly name: string; readonly email: string };
export type APIContext = {
  readonly user: User | null;
  readonly exchange: (
    userId: string,
    request: ReturnType<typeof decodeSyncRequest>,
  ) => Promise<unknown>;
};
const t = initTRPC.context<APIContext>().create();
const authenticated = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Войдите через Google, чтобы синхронизировать задачи.",
    });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
export const appRouter = t.router({
  sync: authenticated
    .input(decodeSyncRequest)
    .mutation(({ ctx, input }) => ctx.exchange(ctx.user.id, input)),
});
export type AppRouter = typeof appRouter;

export type ServerOptions = {
  readonly databasePath: string;
  readonly auth: Auth | null;
  readonly webOrigin: string;
  readonly ownerEmail: string;
  readonly googleClientId: string;
  readonly devAuth: boolean;
  readonly staticDirectory: string;
};

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json",
};

export function createAPI(options: ServerOptions) {
  const runtime = ManagedRuntime.make(Database.layer(options.databasePath));
  const exchange = (userId: string, request: ReturnType<typeof decodeSyncRequest>) =>
    runtime.runPromise(Database.use((database) => database.exchange(userId, request)));
  const getUser = async (request: Request): Promise<User | null> => {
    if (options.devAuth && request.headers.get("x-polydays-dev") === "1")
      return {
        id: "local-developer",
        name: "Локальное пространство",
        email: "development@localhost",
      };
    const session = await options.auth?.api.getSession({ headers: request.headers });
    if (!session || session.user.email.toLowerCase() !== options.ownerEmail.toLowerCase())
      return null;
    return { id: session.user.id, name: session.user.name, email: session.user.email };
  };
  const handle = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const allowedOrigin = origin === options.webOrigin || origin === url.origin;
    const cors: Record<string, string> =
      allowedOrigin && origin
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            Vary: "Origin",
          }
        : {};
    const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
    if (request.method === "OPTIONS") {
      if (origin && !allowedOrigin) return json({ error: "Недопустимый источник запроса." }, 403);
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Headers": "content-type,x-polydays-dev",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
      });
    }
    if (url.pathname === "/api/health") return json({ ok: true, database: "BoxDB" });
    if (url.pathname === "/api/config")
      return json({ google: options.auth !== null, devAuth: options.devAuth });
    if (url.pathname === "/api/google-config") return json({ clientId: options.googleClientId });
    if (url.pathname.startsWith("/api/auth/")) {
      if (!options.auth) return json({ error: "Google-вход ещё не настроен на сервере." }, 503);
      const response = await options.auth.handler(request);
      for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
      return response;
    }
    if (
      (url.pathname.startsWith("/api/") || url.pathname.startsWith("/trpc/")) &&
      request.method !== "GET" &&
      origin &&
      !allowedOrigin &&
      !origin.startsWith("polydays://")
    )
      return json({ error: "Недопустимый источник запроса." }, 403);
    if (url.pathname === "/api/session") return json({ user: await getUser(request) });
    if (url.pathname === "/api/sync" || url.pathname.startsWith("/trpc/")) {
      const user = await getUser(request);
      if (url.pathname.startsWith("/trpc/")) {
        const response = await fetchRequestHandler({
          endpoint: "/trpc",
          req: request,
          router: appRouter,
          createContext: () => ({ user, exchange }),
        });
        for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
        return response;
      }
      if (!user)
        return json(
          { error: "Сессия истекла. Войдите снова; локальные изменения сохранены." },
          401,
        );
      if (request.method !== "POST") return json({ error: "Используйте POST." }, 405);
      try {
        return json(await exchange(user.id, decodeSyncRequest(await request.json())));
      } catch (error) {
        return json(
          { error: error instanceof Error ? error.message : "Не удалось синхронизировать данные." },
          400,
        );
      }
    }
    if (request.method !== "GET") return json({ error: "Страница не найдена." }, 404);
    const base = resolve(options.staticDirectory);
    let file = resolve(base, `.${decodeURIComponent(url.pathname)}`);
    if (file !== base && !file.startsWith(base + sep))
      return json({ error: "Страница не найдена." }, 404);
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    } catch {
      file = resolve(base, "index.html");
    }
    try {
      const data = await readFile(file);
      return new Response(data, {
        headers: {
          "Content-Type": mime[extname(file)] ?? "application/octet-stream",
          "Cache-Control":
            extname(file) === ".html" || file.endsWith("sw.js")
              ? "no-cache"
              : "public, max-age=3600",
        },
      });
    } catch {
      return json(
        { error: "Веб-сборка ещё не создана. Выполните just build или запустите just dev." },
        404,
      );
    }
  };
  return {
    handle,
    close: () => runtime.dispose(),
    exchange,
    ready: () => runtime.runPromise(Database.use((database) => Effect.succeed(database.client))),
  };
}
