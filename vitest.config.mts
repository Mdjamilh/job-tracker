import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Cheap bcrypt rounds in tests; production defaults to 12.
    env: { BCRYPT_COST: "4" },
  },
});
