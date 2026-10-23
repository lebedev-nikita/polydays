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
        sidebar: "#faf9f7",
        ink: "#202020",
        muted: "#666666",
        line: "#e8e8e8",
        accent: "#dc3424",
        selected: "#ffefe5",
      },
    },
  },
} satisfies Config;
