import { spawn } from "node:child_process";

const children = [
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
  spawn("bun", ["--cwd", "apps/client", "start", "--web", "--port", "8081"], {
    stdio: "inherit",
    env: process.env,
  }),
];
const close = () => {
  for (const child of children) child.kill("SIGTERM");
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
let stopping = false;
for (const child of children)
  child.once("exit", (code) => {
    if (stopping) return;
    stopping = true;
    process.exitCode = code ?? 1;
    close();
  });
