import { spawn, type ChildProcess } from "node:child_process";
import { Effect, Schema } from "effect";

const backendURL = `http://localhost:${process.env.PORT || "3000"}`;
const existingBackend = await Effect.runPromise(
  Effect.tryPromise(async () => {
    const response = await fetch(`${backendURL}/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    if (!response.ok) return false;
    Schema.decodeUnknownSync(
      Schema.Struct({ ok: Schema.Literal(true), database: Schema.Literal("BoxDB") }),
    )(await response.json());
    return true;
  }).pipe(Effect.catch(() => Effect.succeed(false))),
);
const children: ChildProcess[] = [];
if (existingBackend) console.info(`Using the running Polydays server at ${backendURL}.`);
if (!existingBackend)
  children.push(
    spawn(
      "node",
      [
        "--watch",
        "--env-file-if-exists=.env",
        "--experimental-strip-types",
        "apps/server/src/+server.ts",
      ],
      { stdio: "inherit", env: { ...process.env, POLYDAYS_DEV_AUTH: "1" } },
    ),
  );
children.push(
  spawn("bun", ["--cwd", "apps/client", "start", "--web", "--port", "8081"], {
    stdio: "inherit",
    env: process.env,
  }),
);
let stopping = false;
const close = () => {
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
for (const child of children)
  child.once("exit", (code) => {
    if (stopping) return;
    process.exitCode = code ?? 1;
    close();
  });
