import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node", 
    include: ["src/**/*.integration.test.ts"],
    timeout: 30000, // Longer timeout for real API calls
  },
});