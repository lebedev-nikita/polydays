import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/server/**/*.test.ts",
      "apps/client/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
  },
  lint: { options: { typeAware: true, typeCheck: true } },
});
