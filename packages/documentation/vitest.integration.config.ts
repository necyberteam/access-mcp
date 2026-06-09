import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    globals: true,
    environment: "node",
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
