import { getDefaultConfig } from "expo/metro-config";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
// NativeWind's CJS entry point supports directory resolution; its declaration
// incorrectly requires getCSSForPlatform, which the implementation supplies.
const { withNativeWind } = createRequire(import.meta.url)("nativewind/metro") as {
  withNativeWind: (
    config: ReturnType<typeof getDefaultConfig>,
    options: { input: string },
  ) => ReturnType<typeof getDefaultConfig>;
};
export default withNativeWind(getDefaultConfig(root), { input: "./global.css" });
