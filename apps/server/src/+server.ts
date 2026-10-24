import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Config, Effect } from "effect";
import { createAPI } from "./api.ts";
import { createAuth } from "./auth.ts";
import { openDatabase } from "./database.ts";

const config = await Effect.runPromise(
  Effect.gen(function* () {
    const port = yield* Config.Int("PORT").pipe(Config.withDefault(3000));
    const host = yield* Config.String("HOST").pipe(Config.withDefault("127.0.0.1"));
    const databasePath = yield* Config.String("DATABASE_PATH").pipe(
      Config.withDefault(".data/polydays.db"),
    );
    const webOrigin = yield* Config.String("WEB_ORIGIN").pipe(
      Config.withDefault("http://localhost:8081"),
    );
    const baseURL = yield* Config.String("BETTER_AUTH_URL").pipe(
      Config.withDefault(`http://localhost:${port}`),
    );
    const googleClientId = yield* Config.String("GOOGLE_CLIENT_ID").pipe(Config.withDefault(""));
    const googleClientSecret = yield* Config.String("GOOGLE_CLIENT_SECRET").pipe(
      Config.withDefault(""),
    );
    const ownerEmail = yield* Config.String("OWNER_EMAIL").pipe(Config.withDefault(""));
    const secret = yield* Config.String("BETTER_AUTH_SECRET").pipe(Config.withDefault(""));
    const devAuth = yield* Config.Boolean("POLYDAYS_DEV_AUTH").pipe(Config.withDefault(false));
    const additionalOrigins = (yield* Config.String("ADDITIONAL_ORIGINS").pipe(
      Config.withDefault(""),
    ))
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return {
      port,
      host,
      databasePath,
      webOrigin,
      baseURL,
      googleClientId,
      googleClientSecret,
      ownerEmail,
      secret,
      devAuth,
      additionalOrigins,
    };
  }),
);

if (
  config.devAuth &&
  (process.env.NODE_ENV === "production" ||
    !["127.0.0.1", "localhost", "::1"].includes(config.host))
)
  throw new Error("Локальный режим разрешён только на loopback в окружении разработки.");
const googleReady = Boolean(config.googleClientId && config.googleClientSecret);
if (googleReady && (!config.ownerEmail || config.secret.length < 32))
  throw new Error(
    "Для Google-входа задайте OWNER_EMAIL и BETTER_AUTH_SECRET длиной не менее 32 символов.",
  );
if (!googleReady && !config.devAuth)
  throw new Error(
    "Настройте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET. Для локальной разработки используйте just dev.",
  );
const authDatabase = googleReady ? await openDatabase(config.databasePath) : null;
const auth = authDatabase
  ? await createAuth(authDatabase, {
      ...config,
      secret: config.secret || randomBytes(32).toString("hex"),
    })
  : null;
const api = createAPI({ ...config, auth, staticDirectory: "apps/client/dist" });
await api.ready();
const server = createServer(async (incoming, outgoing) => {
  const abort = new AbortController();
  outgoing.once("close", () => abort.abort());
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of incoming) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 5_000_000) {
        outgoing.writeHead(413);
        outgoing.end("Request too large");
        return;
      }
      chunks.push(buffer);
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers))
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    const method = incoming.method ?? "GET";
    const response = await api.handle(
      new Request(new URL(incoming.url ?? "/", config.baseURL), {
        method,
        headers,
        signal: abort.signal,
        ...(method === "GET" || method === "HEAD" ? {} : { body: Buffer.concat(chunks) }),
      }),
    );
    const responseHeaders: Record<string, string | string[]> = Object.fromEntries(response.headers);
    const cookies = response.headers.getSetCookie();
    if (cookies.length) responseHeaders["set-cookie"] = cookies;
    outgoing.writeHead(response.status, responseHeaders);
    if (response.body) await pipeline(Readable.from(response.body), outgoing);
    else outgoing.end();
  } catch (error) {
    if (abort.signal.aborted) return;
    console.error(error instanceof Error ? error.message : "Server request failed");
    if (!outgoing.headersSent) outgoing.writeHead(500, { "Content-Type": "application/json" });
    outgoing.end(JSON.stringify({ error: "Сервер не смог обработать запрос." }));
  }
});
server.listen(config.port, config.host, () => console.info(`Polydays server: ${config.baseURL}`));
const shutdown = () => {
  server.close(() => {
    void api.close().then(() => authDatabase?.close());
  });
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
