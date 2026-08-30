import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirror the `@/*` alias from tsconfig so tests import modules by the same path the
  // application does. Divergent module resolution between tests and app is a classic
  // source of "passes in CI, breaks in prod".
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    // Content loading and resolvers are Node-side domain code; none of it touches a DOM.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
