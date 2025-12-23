import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "**/*.d.ts", "**/*.config.*", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@access-mcp/shared": resolve(__dirname, "./packages/shared/src"),
    },
  },
});
