#!/usr/bin/env node
// Pixel comparison CLI. See README.md.
//
//   shot    --url U --out a.png [--selector S] [--wait-for S] [--scale 1]
//   diff    --a a.png --b b.png [--diff d.png] [--threshold-pct 0.5]
//   compare --url U --ref ref.png [--selector S] [--out o.png] [--diff d.png] [--threshold-pct 0.5]
//   suite   --cases cases.json --base http://localhost:PORT --out-dir DIR [--threshold-pct 1]
//
// Exit code 1 when any mismatch percentage exceeds the threshold.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { diffImages, launch, shoot } from "./lib.mjs";

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) flags[rest[i].slice(2)] = rest[i + 1]?.startsWith("--") || rest[i + 1] == null ? true : rest[++i];
}
const num = (v, d) => (v == null || v === true ? d : Number(v));
const thresholdPct = num(flags["threshold-pct"], 0.5);
const fmt = (r) => `${r.percent.toFixed(3)}% (${r.mismatched}/${r.width * r.height}px, ${r.sizeA.join("x")} vs ${r.sizeB.join("x")})`;

async function main() {
  if (!["shot", "diff", "compare", "suite"].includes(cmd)) {
    console.error("usage: pixel-compare.mjs shot|diff|compare|suite ... (see scripts/pixel-compare/README.md)");
    process.exit(2);
  }
  const { browser, context } = await launch({ scale: num(flags.scale, 1) });
  let failed = false;
  try {
    if (cmd === "shot") {
      await shoot(context, { url: flags.url, out: flags.out, selector: flags.selector, waitFor: flags["wait-for"] });
      console.log(`wrote ${flags.out}`);
    } else if (cmd === "diff") {
      const r = await diffImages(context, { a: flags.a, b: flags.b, diffOut: flags.diff, threshold: num(flags.threshold, 0.1) });
      console.log(fmt(r));
      failed = r.percent > thresholdPct;
    } else if (cmd === "compare") {
      const out = flags.out ?? "/tmp/pixel-compare/shot.png";
      await shoot(context, { url: flags.url, out, selector: flags.selector, waitFor: flags["wait-for"] });
      const r = await diffImages(context, { a: flags.ref, b: out, diffOut: flags.diff ?? out.replace(/\.png$/, ".diff.png"), threshold: num(flags.threshold, 0.1) });
      console.log(fmt(r));
      failed = r.percent > thresholdPct;
    } else {
      // suite: each case renders the same thing twice — the lab (ground truth, a local HTML file) and the app —
      // and diffs the two crops. Case: { name, lab: {screen, selector}, app: {url, selector, waitFor?}, thresholdPct? }
      const cases = JSON.parse(readFileSync(flags.cases, "utf8"));
      const outDir = resolve(flags["out-dir"] ?? "/tmp/pixel-compare");
      mkdirSync(outDir, { recursive: true });
      const labFile = pathToFileURL(resolve(flags.lab ?? "docs/design/phase-4-feed/feed-lab.html")).href;
      const only = flags.only ? String(flags.only).split(",") : null;
      const rows = [];
      for (const c of cases) {
        if (only && !only.includes(c.name)) continue;
        const labPng = join(outDir, `${c.name}.lab.png`);
        const appPng = join(outDir, `${c.name}.app.png`);
        await shoot(context, { url: `${labFile}?bare=1&screen=${c.lab.screen}`, out: labPng, selector: c.lab.selector ?? ".screen", waitFor: ".screen" });
        const appUrl = c.app.url.startsWith("http") ? c.app.url : `${flags.base}${c.app.url}`;
        await shoot(context, { url: appUrl, out: appPng, selector: c.app.selector, waitFor: c.app.waitFor ?? c.app.selector });
        const r = await diffImages(context, { a: labPng, b: appPng, diffOut: join(outDir, `${c.name}.diff.png`), threshold: num(flags.threshold, 0.1) });
        const limit = c.thresholdPct ?? thresholdPct;
        const ok = r.percent <= limit;
        failed ||= !ok;
        rows.push({ name: c.name, percent: Number(r.percent.toFixed(3)), size: `${r.sizeA.join("x")}|${r.sizeB.join("x")}`, ok });
        console.log(`${ok ? "PASS" : "FAIL"} ${c.name.padEnd(18)} ${fmt(r)}`);
      }
      writeFileSync(join(outDir, "report.json"), JSON.stringify(rows, null, 2));
    }
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
