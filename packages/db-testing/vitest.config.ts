import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each PGlite instance boots its own Postgres (WASM). Booting + applying
    // migrations per test file is the isolation boundary; keep a generous
    // timeout for the first-boot compile.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
