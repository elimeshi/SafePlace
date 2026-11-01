// services/moderation-pipeline/eval/run.ts
// Usage (from services/moderation-pipeline; the key comes from the gitignored .env.local, never the command line):
//   EVAL_MAX_IMAGES=50 pnpm exec tsx --env-file=.env.local eval/run.ts
//   pnpm exec tsx eval/run.ts --compare eval/results-claude-haiku-5-5.jsonl eval/results-reference.jsonl
// Image bytes are fetched into memory and sent to the model; nothing is written to disk but scores.
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { createAnthropicClassifierFromConfig } from "../src/providers/anthropic";
import { resolveMediaOutcome, DEFAULT_THRESHOLDS } from "../src/classification";
import { CONTENT_GROUPS } from "@safeplace/visibility-policy";

// Anthropic pricing page, 2026-10-30, per million tokens, prompts ≤ 100k.
const PRICE = { "claude-haiku-5-5": { in: 0.10, cacheRead: 0.01, cacheWrite: 0.125, out: 0.50 },
                "claude-sonnet-5-5": { in: 2.00, cacheRead: 0.10, cacheWrite: 2.50, out: 10.00 } } as const;

interface Row { id: string; url: string; source: string; license: string; group: string; expected: string }
interface Result { id: string; group: string; expected: string; level: number | "uncertain" | "refused"; confidence: number; outcome: string; usd: number }

// shortcut: naive split, so manifest fields must not contain commas (the manifest builder asserts this).
function parseManifest(path: string): Row[] {
  const [header = "", ...lines] = readFileSync(path, "utf8").trim().split("\n");
  const cols = header.split(",");
  return lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])) as unknown as Row);
}

function matches(expected: string, level: number | "uncertain" | "refused"): boolean | null {
  if (level === "uncertain" || level === "refused") return null;
  return expected === "1+" ? level >= 1 : level === Number(expected);
}

function report(results: Result[]): void {
  for (const g of CONTENT_GROUPS) {
    const rs = results.filter((r) => r.group === g);
    if (rs.length === 0) continue;
    const abstain = rs.filter((r) => r.level === "uncertain" || r.level === "refused").length;
    const judged = rs.filter((r) => matches(r.expected, r.level) !== null);
    const right = judged.filter((r) => matches(r.expected, r.level)).length;
    console.log(`${g}: n=${rs.length} abstain=${(100 * abstain / rs.length).toFixed(1)}% agreement=${judged.length ? (100 * right / judged.length).toFixed(1) : "n/a"}% (${right}/${judged.length})`);
    const byCell = new Map<string, number>();
    for (const r of rs) byCell.set(`${r.expected}→${r.level}`, (byCell.get(`${r.expected}→${r.level}`) ?? 0) + 1);
    console.log("  " + [...byCell.entries()].sort().map(([k, v]) => `${k}:${v}`).join("  "));
  }
  const usd = results.reduce((s, r) => s + r.usd, 0);
  const n = new Set(results.map((r) => r.id)).size;
  console.log(`images=${n} cost=$${usd.toFixed(4)} per-1k=$${((usd / Math.max(n, 1)) * 1000).toFixed(3)}`);
}

function compare(a: string, b: string): void {
  const load = (p: string) => new Map(readFileSync(p, "utf8").trim().split("\n").map((l) => { const r = JSON.parse(l) as Result; return [`${r.id}/${r.group}`, r]; }));
  const A = load(a), B = load(b);
  for (const g of CONTENT_GROUPS) {
    let both = 0, agree = 0;
    for (const [k, ra] of A) {
      const rb = B.get(k);
      if (!rb || ra.group !== g || typeof ra.level !== "number" || typeof rb.level !== "number") continue;
      both++; if (ra.level === rb.level) agree++;
    }
    console.log(`${g}: agreement with reference ${both ? (100 * agree / both).toFixed(1) : "n/a"}% (${agree}/${both})`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] === "--compare") {
    if (!argv[1] || !argv[2]) throw new Error("usage: --compare <results-a.jsonl> <results-b.jsonl>");
    return compare(argv[1], argv[2]);
  }

  const apiKey = process.env.VISION_MODEL_API_KEY;
  const max = Number(process.env.EVAL_MAX_IMAGES);
  const modelId = (process.env.EVAL_MODEL_ID ?? "claude-haiku-5-5") as keyof typeof PRICE;
  if (!apiKey) throw new Error("VISION_MODEL_API_KEY is required");
  if (!Number.isInteger(max) || max <= 0) throw new Error("EVAL_MAX_IMAGES must be a positive integer — this is the spend cap");
  const price = PRICE[modelId];
  if (!price) throw new Error(`no price table for ${modelId}`);

  const out = `eval/results-${modelId}.jsonl`;
  const done = new Set(existsSync(out) ? readFileSync(out, "utf8").trim().split("\n").filter(Boolean).map((l) => (JSON.parse(l) as Result).id) : []);
  let usd = 0;
  let calls = 0, cacheHits = 0;
  const provider = createAnthropicClassifierFromConfig({
    apiKey, modelId,
    onUsage: (u) => {
      usd = (u.inputTokens * price.in + u.cacheReadInputTokens * price.cacheRead + u.cacheCreationInputTokens * price.cacheWrite + u.outputTokens * price.out) / 1e6;
      calls++; if (u.cacheReadInputTokens > 0) cacheHits++;
    },
  });

  const rows = parseManifest("eval/manifest.csv");
  const byImage = new Map<string, Row[]>();
  for (const r of rows) byImage.set(r.id, [...(byImage.get(r.id) ?? []), r]);

  // n counts attempts, dead links included, so EVAL_MAX_IMAGES bounds API calls from above.
  let n = 0, dead = 0, refused = 0;
  const results: Result[] = [];
  for (const [id, labels] of byImage) {
    if (done.has(id)) continue;
    if (n >= max) break;
    n++;
    const first = labels[0];
    if (!first) continue;
    let res: Response;
    try {
      res = await fetch(first.url);
    } catch {
      dead++; console.warn(`skip ${id}: fetch failed`); continue;
    }
    if (!res.ok) { dead++; console.warn(`skip ${id}: HTTP ${res.status}`); continue; }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    usd = 0;
    const output = await provider.classify({ mediaItemId: id, bytes, contentType });
    if (output.kind === "refused") refused++;
    const outcome = resolveMediaOutcome(output, DEFAULT_THRESHOLDS);
    for (const label of labels) {
      const g = label.group as (typeof CONTENT_GROUPS)[number];
      const v = output.kind === "refused" ? { level: "refused" as const, confidence: 0 } : output.groups[g];
      const r: Result = { id, group: g, expected: label.expected, level: v.level, confidence: v.confidence, outcome: outcome.classification, usd: usd / labels.length };
      results.push(r);
      appendFileSync(out, JSON.stringify(r) + "\n");
    }
  }
  report(results);
  console.log(`attempted=${n} dead-links=${dead} api-calls=${calls} cache-read-hits=${cacheHits} refusals=${refused}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
