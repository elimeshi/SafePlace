import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The client-integration suite talks to a live `supabase start` stack; give
    // network round-trips room. It self-skips when SUPABASE_TEST_URL is unset,
    // so the default run stays hermetic.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
