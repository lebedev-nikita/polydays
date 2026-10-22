import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";

const directory = "apps/client/dist";
async function files(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(join(path, entry.name))
          : Promise.resolve([join(path, entry.name)]),
      ),
    )
  ).flat();
}
const manifest = {
  name: "Polydays",
  short_name: "Polydays",
  lang: "ru",
  start_url: "/current",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#faf9f6",
  icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }],
};
await writeFile(join(directory, "manifest.webmanifest"), JSON.stringify(manifest));
await writeFile(join(directory, "icon.png"), await readFile("apps/client/assets/icon.png"));
const indexPath = join(directory, "index.html");
const html = (await readFile(indexPath, "utf8"))
  .replace('<html lang="en">', '<html lang="ru">')
  .replace(
    "</head>",
    '<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#faf9f6"></head>',
  );
await writeFile(indexPath, html);
const assets = (await files(directory))
  .filter((path) => !path.endsWith("sw.js") && !path.endsWith(".map"))
  .sort();
const hash = createHash("sha256");
for (const path of assets) hash.update(await readFile(path));
const built = await Bun.build({
  entrypoints: ["scripts/web/+service-worker.ts"],
  target: "browser",
  minify: true,
  define: {
    __PRECACHE__: JSON.stringify(assets.map((path) => "/" + relative(directory, path))),
    __CACHE_VERSION__: JSON.stringify(`polydays-shell-${hash.digest("hex").slice(0, 16)}`),
  },
});
if (!built.success || !built.outputs[0]) throw new Error("Service worker build failed.");
await writeFile(join(directory, "sw.js"), await built.outputs[0].text());
console.info(`Offline shell prepared: ${assets.length} assets.`);
