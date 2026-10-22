import type { Config } from "tailwindcss";
import { createRequire } from "node:module";
const nativewind = createRequire(import.meta.url)("nativewind/preset") as Config;

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [nativewind],
  theme: {
    extend: {
      colors: {
        canvas: "#ffffff",
        sidebar: "#faf9f6",
        ink: "#252421",
        muted: "#66645f",
        line: "#e9e7e2",
        accent: "#b9382e",
        selected: "#f9e9e4",
      },
    },
  },
} satisfies Config;
