import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // fetch is replaced by a mock provider in the OAuth tests
    unstubGlobals: true,
    unstubEnvs: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text-summary", "text", "html"],
      // CI gate, a few points below the current coverage: raise it along with the tests
      thresholds: {
        statements: 95,
        branches: 85,
        functions: 95,
        lines: 95,
      },
    },
  },
});
