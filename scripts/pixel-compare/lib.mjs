// Shared helpers for the pixel-compare tooling. No npm dependencies: Playwright is
// resolved from the workspace, a global install, or the npx cache; the image diff runs
// inside Chromium (canvas), so no pixelmatch/pngjs is needed.
import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const VIEWPORT = { width: 390, height: 844 }; // = reference PNG size, so deviceScaleFactor is 1

export function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, "playwright"];
  const npx = join(homedir(), ".npm", "_npx");
  if (existsSync(npx)) {
    for (const d of readdirSync(npx)) candidates.push(join(npx, d, "node_modules", "playwright"));
  }
  for (const c of candidates.filter(Boolean)) {
    try {
      return createRequire(import.meta.url)(c);
    } catch {
      /* try next */
    }
  }
  throw new Error(
    "playwright not found. Run once: npx -y playwright@1.64.1 --version  (or set PLAYWRIGHT_MODULE to its path)."
  );
}

/**
 * The Playwright package and the downloaded browser can be different versions
 * (npx cache vs ~/.cache/ms-playwright). Use the package's own browser if present,
 * else the newest Chromium already on disk. PLAYWRIGHT_CHROMIUM overrides.
 */
function pickChromium(chromium) {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  try {
    if (existsSync(chromium.executablePath())) return undefined;
  } catch {
    /* fall through */
  }
  const base = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(base)) return undefined;
  const dirs = readdirSync(base).sort().reverse();
  for (const d of dirs) {
    for (const rel of ["chrome-headless-shell-linux64/chrome-headless-shell", "chrome-linux/chrome", "chrome-linux64/chrome"]) {
      const p = join(base, d, rel);
      if (d.startsWith("chromium") && existsSync(p)) return p;
    }
  }
  return undefined;
}

/** Launch Chromium with the reference-matching mobile emulation and forced reduced motion. */
export async function launch({ scale = 1, reducedMotion = "reduce" } = {}) {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ executablePath: pickChromium(chromium) });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: scale,
    isMobile: true,
    hasTouch: true,
    reducedMotion,
    locale: "he-IL",
  });
  return { browser, context };
}

/**
 * Screenshot `url` (optionally clipped to the first match of `selector`) to `out` (PNG).
 * Waits for web fonts and one extra frame so layout has settled.
 */
export async function shoot(context, { url, out, selector, waitFor, settleMs = 400 }) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load" });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(settleMs);
  mkdirSync(dirname(out), { recursive: true });
  const target = selector ? page.locator(selector).first() : page;
  if (selector) await target.waitFor({ timeout: 30000 });
  await target.screenshot(selector ? { path: out } : { path: out, fullPage: false });
  await page.close();
  return out;
}

/**
 * Diff two PNGs inside Chromium. Per-pixel YIQ distance (the pixelmatch metric,
 * threshold 0.1) -> mismatch count. Writes a diff PNG (mismatches red over a faded
 * copy of the reference) and returns { width, height, mismatched, percent }.
 * Differently sized images are compared on the larger canvas; the overhang counts
 * as mismatch.
 */
export async function diffImages(context, { a, b, diffOut, threshold = 0.1 }) {
  const page = await context.newPage();
  const toUrl = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;
  const res = await page.evaluate(
    async ({ ua, ub, threshold }) => {
      const load = (u) =>
        new Promise((r, j) => {
          const i = new Image();
          i.onload = () => r(i);
          i.onerror = j;
          i.src = u;
        });
      const [ia, ib] = await Promise.all([load(ua), load(ub)]);
      const w = Math.max(ia.width, ib.width);
      const h = Math.max(ia.height, ib.height);
      const px = (img) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const x = c.getContext("2d", { willReadFrequently: true });
        x.clearRect(0, 0, w, h);
        x.drawImage(img, 0, 0);
        return { d: x.getImageData(0, 0, w, h).data, bounds: [img.width, img.height] };
      };
      const A = px(ia);
      const B = px(ib);
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const octx = out.getContext("2d");
      const od = octx.createImageData(w, h);
      const maxDelta = 35215 * threshold * threshold;
      let bad = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const inA = x < A.bounds[0] && y < A.bounds[1];
          const inB = x < B.bounds[0] && y < B.bounds[1];
          let mismatch = false;
          if (inA !== inB) mismatch = true;
          else if (inA) {
            const blend = (c, al) => 255 + (c - 255) * (al / 255);
            const ra = blend(A.d[i], A.d[i + 3]), ga = blend(A.d[i + 1], A.d[i + 3]), ba = blend(A.d[i + 2], A.d[i + 3]);
            const rb = blend(B.d[i], B.d[i + 3]), gb = blend(B.d[i + 1], B.d[i + 3]), bb = blend(B.d[i + 2], B.d[i + 3]);
            const yA = ra * 0.29889531 + ga * 0.58662247 + ba * 0.11448223;
            const iA = ra * 0.59597799 - ga * 0.2741761 - ba * 0.32180189;
            const qA = ra * 0.21147017 - ga * 0.52261711 + ba * 0.31114694;
            const yB = rb * 0.29889531 + gb * 0.58662247 + bb * 0.11448223;
            const iB = rb * 0.59597799 - gb * 0.2741761 - bb * 0.32180189;
            const qB = rb * 0.21147017 - gb * 0.52261711 + bb * 0.31114694;
            const delta = 0.5053 * (yA - yB) ** 2 + 0.299 * (iA - iB) ** 2 + 0.1957 * (qA - qB) ** 2;
            mismatch = delta > maxDelta;
          }
          if (mismatch) {
            bad++;
            od.data[i] = 255; od.data[i + 1] = 0; od.data[i + 2] = 60; od.data[i + 3] = 255;
          } else {
            const g = inA ? Math.round(255 - (255 - (A.d[i] * 0.3 + A.d[i + 1] * 0.59 + A.d[i + 2] * 0.11)) * 0.25) : 255;
            od.data[i] = od.data[i + 1] = od.data[i + 2] = g;
            od.data[i + 3] = 255;
          }
        }
      }
      octx.putImageData(od, 0, 0);
      return { width: w, height: h, bad, diff: out.toDataURL("image/png"), sizeA: A.bounds, sizeB: B.bounds };
    },
    { ua: toUrl(a), ub: toUrl(b), threshold }
  );
  await page.close();
  if (diffOut) {
    mkdirSync(dirname(diffOut), { recursive: true });
    writeFileSync(diffOut, Buffer.from(res.diff.split(",")[1], "base64"));
  }
  return {
    width: res.width,
    height: res.height,
    sizeA: res.sizeA,
    sizeB: res.sizeB,
    mismatched: res.bad,
    percent: (res.bad / (res.width * res.height)) * 100,
  };
}
