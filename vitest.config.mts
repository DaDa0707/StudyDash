import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["core/**/*.test.ts", "src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
