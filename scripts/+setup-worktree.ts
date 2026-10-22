import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { chmod, copyFile, realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

// This runs before dependency installation, so it only uses Node's standard library.
const commonDirectory = execFileSync(
  "git",
  ["rev-parse", "--path-format=absolute", "--git-common-dir"],
  { encoding: "utf8" },
).trim();
const projectRoot = resolve(process.env.T3CODE_PROJECT_ROOT || dirname(commonDirectory));
const destinationRoot = await realpath(process.cwd());
const sourceRoot = await realpath(projectRoot);

if (sourceRoot === destinationRoot) {
  console.info("Using the project root's existing .env.");
} else {
  try {
    await copyFile(
      join(sourceRoot, ".env"),
      join(destinationRoot, ".env"),
      constants.COPYFILE_EXCL,
    );
    await chmod(join(destinationRoot, ".env"), 0o600);
    console.info("Copied the project .env into this worktree (mode 0600).");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    console.info("Keeping this worktree's existing .env.");
  }
}
