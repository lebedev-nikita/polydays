import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { Effect, Schema } from "effect";

const root = resolve(import.meta.dirname, "..");
const run = Effect.fn("release.run")(
  (command: string, args: string[], cwd = root, env: Record<string, string> = {}) =>
    Effect.tryPromise(async () => {
      const child = Bun.spawn([command, ...args], {
        cwd,
        env: { ...process.env, ...env },
        stdout: "inherit",
        stderr: "inherit",
      });
      if ((await child.exited) !== 0) throw new Error(`${command} failed`);
    }),
);
const output = Effect.fn("release.output")((command: string, args: string[]) =>
  Effect.tryPromise(async () => {
    const child = Bun.spawn([command, ...args], {
      cwd: root,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    const text = await new Response(child.stdout).text();
    if ((await child.exited) !== 0)
      throw new Error(`${command} failed: ${await new Response(child.stderr).text()}`);
    return text.trim();
  }),
);
const files = (version: string) => [
  `Polydays-${version}-android-arm64.apk`,
  `Polydays-${version}-macos-arm64.dmg`,
];
const program = Effect.gen(function* () {
  const action = Schema.decodeUnknownSync(Schema.Literals(["build", "publish"]))(process.argv[2]);
  const app = Schema.decodeUnknownSync(
    Schema.Struct({ expo: Schema.Struct({ version: Schema.String }) }),
  )(
    JSON.parse(
      yield* Effect.tryPromise(() => readFile(join(root, "apps/client/app.json"), "utf8")),
    ),
  );
  const version = app.expo.version;
  if (!/^\d+\.\d+\.\d+$/.test(version))
    return yield* Effect.fail(new Error("Use a stable semver version."));
  const directory = join(root, ".data/releases", version);
  const commit = yield* output("git", ["rev-parse", "HEAD"]);
  const sourceClean = !(yield* output("git", ["status", "--porcelain"]));
  const names = files(version);
  if (action === "build") {
    if (process.platform !== "darwin" || process.arch !== "arm64")
      return yield* Effect.fail(new Error("Build these ARM64 releases on an Apple Silicon Mac."));
    for (const file of [
      "package.json",
      "apps/client/package.json",
      "apps/macos/package.json",
      "apps/macos/src-tauri/tauri.conf.json",
      "apps/macos/src-tauri/Cargo.toml",
    ]) {
      const source = yield* Effect.tryPromise(() => readFile(join(root, file), "utf8"));
      if (!source.includes(`"version": "${version}"`) && !source.includes(`version = "${version}"`))
        return yield* Effect.fail(new Error(`Version mismatch: ${file}`));
    }
    const url = yield* Effect.try(() => new URL(process.env.EXPO_PUBLIC_API_URL ?? ""));
    if (url.protocol !== "https:")
      return yield* Effect.fail(new Error("EXPO_PUBLIC_API_URL must use HTTPS."));
    for (const key of [
      "POLYDAYS_ANDROID_KEYSTORE",
      "POLYDAYS_ANDROID_STORE_PASSWORD",
      "POLYDAYS_ANDROID_KEY_ALIAS",
      "POLYDAYS_ANDROID_KEY_PASSWORD",
    ])
      if (!process.env[key])
        return yield* Effect.fail(new Error(`Missing ${key} in the private .env.`));
    process.env.ANDROID_HOME ||= "/opt/homebrew/share/android-commandlinetools";
    process.env.JAVA_HOME ||= yield* output("/usr/libexec/java_home", ["-v", "21"]);
    yield* run("just", ["check", "test", "build"]);
    yield* run("cargo", ["fmt", "--check"], join(root, "apps/macos/src-tauri"));
    yield* run("cargo", ["test", "--locked"], join(root, "apps/macos/src-tauri"));
    yield* run(
      "bunx",
      ["expo", "prebuild", "--platform", "android", "--no-install"],
      join(root, "apps/client"),
    );
    yield* run(
      "./gradlew",
      [
        ":app:assembleRelease",
        "-PreactNativeArchitectures=arm64-v8a",
        "--init-script",
        join(root, "scripts/android-release.gradle"),
        "--console=plain",
      ],
      join(root, "apps/client/android"),
    );
    yield* run(
      "bun",
      ["run", "tauri", "build", "--bundles", "app,dmg", "--", "--locked"],
      join(root, "apps/macos"),
      { CI: "true", TAURI_BUNDLER_DMG_IGNORE_CI: "false" },
    );
    yield* Effect.tryPromise(async () => {
      await mkdir(directory, { recursive: true });
      await copyFile(
        join(root, "apps/client/android/app/build/outputs/apk/release/app-release.apk"),
        join(directory, names[0]!),
      );
      const dmgDirectory = join(root, "apps/macos/src-tauri/target/release/bundle/dmg");
      const dmg = (await readdir(dmgDirectory)).find(
        (name) => name.endsWith(".dmg") && name.includes(version),
      );
      if (!dmg) throw new Error("macOS disk image missing; neither platform will be published.");
      await copyFile(join(dmgDirectory, dmg), join(directory, names[1]!));
    });
    const bundle = join(root, "apps/macos/src-tauri/target/release/bundle/macos/Polydays.app");
    yield* run("codesign", ["--verify", "--deep", "--strict", bundle]);
    yield* run(join(process.env.ANDROID_HOME, "build-tools/37.0.0/apksigner"), [
      "verify",
      join(directory, names[0]!),
    ]);
    const androidMetadata = yield* output(
      join(process.env.ANDROID_HOME, "build-tools/37.0.0/aapt"),
      ["dump", "badging", join(directory, names[0]!)],
    );
    if (!androidMetadata.includes(`versionName='${version}'`))
      return yield* Effect.fail(new Error("The APK version does not match this release."));
    yield* Effect.tryPromise(async () => {
      const assets = [];
      for (const name of names) {
        const hash = createHash("sha256")
          .update(await readFile(join(directory, name)))
          .digest("hex");
        assets.push({ name, sha256: hash });
      }
      await writeFile(
        join(directory, "SHA256SUMS"),
        assets.map((a) => `${a.sha256}  ${a.name}\n`).join(""),
      );
      await writeFile(
        join(directory, "release.json"),
        JSON.stringify(
          {
            version,
            commit,
            sourceClean,
            apiURL: url.origin,
            macOSSigning: "ad-hoc, not notarized",
            assets,
          },
          null,
          2,
        ) + "\n",
      );
    });
    yield* Effect.log(`Both platform artifacts prepared in ${directory}`);
    return;
  }
  if (yield* output("git", ["status", "--porcelain"]))
    return yield* Effect.fail(new Error("Commit release changes before publishing."));
  const manifest = Schema.decodeUnknownSync(
    Schema.Struct({
      version: Schema.String,
      commit: Schema.String,
      sourceClean: Schema.Literal(true),
      assets: Schema.Array(Schema.Struct({ name: Schema.String, sha256: Schema.String })),
    }),
  )(JSON.parse(yield* Effect.tryPromise(() => readFile(join(directory, "release.json"), "utf8"))));
  if (
    manifest.version !== version ||
    manifest.commit !== commit ||
    names.some((name) => !manifest.assets.some((a) => a.name === name))
  )
    return yield* Effect.fail(
      new Error("Build both platforms from the current release commit first."),
    );
  for (const asset of manifest.assets) {
    const data = yield* Effect.tryPromise(() => readFile(join(directory, asset.name)));
    if (createHash("sha256").update(data).digest("hex") !== asset.sha256)
      return yield* Effect.fail(new Error(`Artifact checksum mismatch: ${asset.name}`));
  }
  yield* run("git", ["push", "origin", "HEAD:main"]);
  const tag = `v${version}`;
  const existingTag = yield* output("git", ["tag", "--list", tag]);
  if (!existingTag) yield* run("git", ["tag", "-a", tag, "-m", `Polydays ${version}`]);
  if ((yield* output("git", ["rev-list", "-n", "1", tag])) !== commit)
    return yield* Effect.fail(new Error("Release tag points to another commit."));
  yield* run("git", ["push", "origin", `refs/tags/${tag}`]);
  const publishedNames = [...names, "SHA256SUMS"];
  const assets = publishedNames.map((name) => join(directory, name));
  yield* run("gh", [
    "release",
    "create",
    tag,
    "--verify-tag",
    "--draft",
    "--title",
    `Polydays ${version}`,
    "--notes-file",
    join(root, "docs/releases", `${version}.md`),
    ...assets,
  ]);
  const uploaded = Schema.decodeUnknownSync(
    Schema.Struct({ assets: Schema.Array(Schema.Struct({ name: Schema.String })) }),
  )(JSON.parse(yield* output("gh", ["release", "view", tag, "--json", "assets"])));
  if (publishedNames.some((name) => !uploaded.assets.some((asset) => asset.name === name)))
    return yield* Effect.fail(
      new Error("Release assets are incomplete; the release stays a draft."),
    );
  yield* run("gh", ["release", "edit", tag, "--draft=false", "--latest"]);
  yield* Effect.log(`Published Android and macOS together: ${tag}`);
});

await Effect.runPromise(program);
