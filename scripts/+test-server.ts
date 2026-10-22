import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const directory = await mkdtemp(join(tmpdir(), "polydays-e2e-"));
const child = spawn("node", ["--experimental-strip-types", "apps/server/src/+server.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: "3400",
    HOST: "127.0.0.1",
    BETTER_AUTH_URL: "http://localhost:3400",
    WEB_ORIGIN: "http://localhost:3400",
    DATABASE_PATH: join(directory, "test.db"),
    POLYDAYS_DEV_AUTH: "1",
    NODE_ENV: "test",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  },
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => child.kill(signal));
child.once("exit", (code) => {
  void rm(directory, { recursive: true, force: true }).then(() => {
    process.exitCode = code ?? 0;
  });
});
