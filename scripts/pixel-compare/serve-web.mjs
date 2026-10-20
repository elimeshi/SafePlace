#!/usr/bin/env node
// Starts `expo start --web` for apps/mobile on a free port and prints `READY <url>`
// once it answers. Stays in the foreground until killed (Ctrl-C / SIGTERM).
// Usage: node scripts/pixel-compare/serve-web.mjs [--port 8099]
// The gallery needs no backend, so dummy Supabase values are injected unless set.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argPort = process.argv.indexOf("--port");

function freePort() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.once("error", rej);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

const port = argPort > -1 ? Number(process.argv[argPort + 1]) : await freePort();
const child = spawn("npx", ["expo", "start", "--web", "--port", String(port)], {
  cwd: resolve(root, "apps/mobile"),
  stdio: ["ignore", "inherit", "inherit"],
  env: {
    ...process.env,
    // Not CI=1: that turns Metro's file watcher off, so edits would not reach the page.
    // stdin is ignored (not a TTY), which is what keeps Expo non-interactive.
    EXPO_NO_TELEMETRY: "1",
    EXPO_OFFLINE: "1", // no version-check network calls (they crash the CLI when offline)
    EXPO_NO_DEPENDENCY_VALIDATION: "1",
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:9",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "gallery-dummy-key",
  },
});
const stop = () => {
  child.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 1));

const url = `http://localhost:${port}`;
for (let i = 0; i < 240; i++) {
  try {
    const r = await fetch(url);
    if (r.ok) {
      console.log(`READY ${url}`);
      break;
    }
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 1000));
}
