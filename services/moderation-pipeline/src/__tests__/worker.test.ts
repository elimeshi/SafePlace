import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import type { ContentLevels } from "@safeplace/visibility-policy";
import { createStubClassifier, verdictsOf, type ClassifierProvider } from "../classifier";
import { DEFAULT_THRESHOLDS } from "../classification";
import type { MediaHashes } from "../hashes";
import {
  drainOnce,
  type ClaimedJob,
  type CompletedClassification,
  type JobStore,
  type MediaFetcher,
  type ResolvedByHash,
} from "../worker";

const lv = (o: Partial<ContentLevels> = {}): ContentLevels => ({ sex: 0, violence: 0, religion: 0, addictions: 0, ...o });

/**
 * The worker's control flow, exercised against an in-memory store. The SQL it
 * drives is covered separately by the PGlite suite in packages/db-testing —
 * these tests are about what the worker decides, not about what Postgres does
 * with it.
 */

function makeStore(
  jobs: ClaimedJob[],
  opts: { resolved?: (hashes: MediaHashes, excludeId: string) => ResolvedByHash | null } = {}
) {
  const completed: CompletedClassification[] = [];
  const failed: Array<{ mediaItemId: string; error: string }> = [];
  const lookups: Array<{ hashes: MediaHashes; excludeId: string }> = [];
  const store: JobStore = {
    claim: async (batchSize) => jobs.slice(0, batchSize),
    findResolvedByHash: async (hashes, excludeId) => {
      lookups.push({ hashes, excludeId });
      return opts.resolved?.(hashes, excludeId) ?? null;
    },
    complete: async (result) => {
      completed.push(result);
    },
    fail: async (mediaItemId, error) => {
      failed.push({ mediaItemId, error });
    },
  };
  return { store, completed, failed, lookups };
}

const job = (overrides: Partial<ClaimedJob> = {}): ClaimedJob => ({
  mediaItemId: "m1",
  storagePath: "user-1/m1.jpg",
  contentType: "image/jpeg",
  ...overrides,
});

const fetcher = (bytes = new Uint8Array([1, 2, 3])): MediaFetcher => ({
  fetch: async () => bytes,
});

const deps = (provider: ClassifierProvider, store: JobStore, media = fetcher()) => ({
  store,
  media,
  provider,
  modelId: "stub-v1",
  workerId: "worker-test",
  thresholds: DEFAULT_THRESHOLDS,
});

describe("drainOnce", () => {
  it("classifies a claimed job and completes it with the resolved enum", async () => {
    const { store, completed } = makeStore([job()]);
    const provider = createStubClassifier({ fallback: verdictsOf({ sex: { level: 1, confidence: 0.95 } }) });

    const summary = await drainOnce(deps(provider, store), 10);

    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({
      mediaItemId: "m1",
      classification: "contains_women",
      verdict: "levels",
      levels: lv({ sex: 1 }),
    });
    expect(summary).toMatchObject({ claimed: 1, classified: 1, failed: 0 });
  });

  it("writes levels, reason and hashes; dedupes an identical image without calling the model", async () => {
    const bytes = new Uint8Array(
      await sharp({ create: { width: 16, height: 16, channels: 3, background: "#fff" } }).png().toBuffer()
    );
    const { store, completed, lookups } = makeStore([job({ mediaItemId: "m1" }), job({ mediaItemId: "m2" })], {
      // the second lookup finds the first item
      resolved: (_h, exclude) =>
        exclude === "m2" ? { sourceMediaItemId: "m1", classification: "general", levels: lv() } : null,
    });
    const provider = createStubClassifier({ fallback: verdictsOf({}) });
    const classify = vi.spyOn(provider, "classify");
    await drainOnce(deps(provider, store, fetcher(bytes)), 10);

    expect(classify).toHaveBeenCalledTimes(1);
    expect(completed[0]).toMatchObject({
      mediaItemId: "m1", classification: "general", levels: lv(), reviewReason: null, provider: "stub",
    });
    expect(completed[0]?.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(completed[0]?.contentDhash).toMatch(/^[0-9a-f]{16}$/);
    expect(completed[1]).toMatchObject({
      mediaItemId: "m2", provider: "dedupe", modelId: "copy:m1", verdict: "duplicate", levels: lv(),
      contentSha256: completed[0]?.contentSha256,
    });
    expect(lookups.length).toBe(2);
  });

  it("a dedupe lookup that throws fails the job for retry; it never classifies", async () => {
    const { store, completed, failed } = makeStore([job()]);
    store.findResolvedByHash = async () => {
      throw new Error("dedupe lookup: connection reset");
    };
    const provider = createStubClassifier({ fallback: verdictsOf({}) });
    const classify = vi.spyOn(provider, "classify");
    const summary = await drainOnce(deps(provider, store), 10);
    expect(classify).not.toHaveBeenCalled();
    expect(completed).toEqual([]);
    expect(failed).toEqual([{ mediaItemId: "m1", error: "dedupe lookup: connection reset" }]);
    expect(summary).toMatchObject({ classified: 0, failed: 1 });
  });

  it("level 3 → pending_review with ai_prohibited_content and the raw answer", async () => {
    const { store, completed } = makeStore([job()]);
    const provider = createStubClassifier({ fallback: verdictsOf({ violence: { level: 3, confidence: 0.99 } }) });
    await drainOnce(deps(provider, store), 10);
    expect(completed[0]).toMatchObject({
      classification: "pending_review",
      levels: null,
      reviewReason: "ai_prohibited_content",
      aiLevels: { violence: 3 },
      confidence: 0,
    });
  });

  it("refusal → pending_review with ai_refusal, not a failure", async () => {
    const { store, completed, failed } = makeStore([job()]);
    const provider = createStubClassifier({ fallback: { kind: "refused" } });
    await drainOnce(deps(provider, store), 10);
    expect(failed).toEqual([]);
    expect(completed[0]).toMatchObject({
      classification: "pending_review", reviewReason: "ai_refusal", verdict: "refused", aiLevels: null,
    });
  });

  it("records the lowest group confidence when resolved", async () => {
    const { store, completed } = makeStore([job()]);
    const provider = createStubClassifier({
      fallback: verdictsOf({ religion: { level: 1, confidence: 0.85 } }, 0.97),
    });
    await drainOnce(deps(provider, store), 10);
    expect(completed[0]).toMatchObject({ classification: "general", confidence: 0.85 });
  });

  it("sends a confident negative to 'general'", async () => {
    const { store, completed } = makeStore([job()]);
    const provider = createStubClassifier({ fallback: verdictsOf({}, 0.95) });
    await drainOnce(deps(provider, store), 10);
    expect(completed[0]?.classification).toBe("general");
  });

  it("sends an uncertain verdict to human review", async () => {
    const { store, completed } = makeStore([job()]);
    const provider = createStubClassifier({ fallback: verdictsOf({ sex: { level: "uncertain", confidence: 0.1 } }) });
    await drainOnce(deps(provider, store), 10);
    expect(completed[0]?.classification).toBe("pending_review");
  });

  it("processes every claimed job, not just the first", async () => {
    const { store, completed } = makeStore([job({ mediaItemId: "a" }), job({ mediaItemId: "b" })]);
    await drainOnce(deps(createStubClassifier({ fallback: verdictsOf({}, 1) }), store), 10);
    expect(completed.map((c) => c.mediaItemId)).toEqual(["a", "b"]);
  });

  it("fails the job when the provider throws, and keeps draining the rest", async () => {
    const { store, completed, failed } = makeStore([
      job({ mediaItemId: "bad" }),
      job({ mediaItemId: "good" }),
    ]);
    const provider: ClassifierProvider = {
      name: "flaky",
      classify: async ({ mediaItemId }) => {
        if (mediaItemId === "bad") throw new Error("provider timeout");
        return verdictsOf({}, 1);
      },
    };

    const summary = await drainOnce(deps(provider, store), 10);

    expect(failed).toEqual([{ mediaItemId: "bad", error: "provider timeout" }]);
    expect(completed.map((c) => c.mediaItemId)).toEqual(["good"]);
    expect(summary).toMatchObject({ claimed: 2, classified: 1, failed: 1 });
  });

  it("fails the job when the bytes cannot be fetched", async () => {
    const { store, failed } = makeStore([job()]);
    const media: MediaFetcher = {
      fetch: async () => {
        throw new Error("object missing");
      },
    };
    await drainOnce(
      deps(createStubClassifier({ fallback: verdictsOf({}, 1) }), store, media),
      10
    );
    expect(failed[0]).toMatchObject({ mediaItemId: "m1", error: "object missing" });
  });

  it("routes a non-image to human review without calling the model", async () => {
    // Video is out of scope for MVP (no frame sampling). A video item must not
    // be guessed at by an image classifier, and must not sit unclassified —
    // which under fail-closed visibility means invisible to everyone.
    const { store, completed } = makeStore([job({ contentType: "video/mp4" })]);
    const classify = vi.fn();
    const provider: ClassifierProvider = { name: "never", classify };

    await drainOnce(deps(provider, store), 10);

    expect(classify).not.toHaveBeenCalled();
    expect(completed[0]).toMatchObject({
      classification: "pending_review",
      verdict: "unsupported_media",
      levels: null,
      reviewReason: null,
      aiLevels: null,
      contentSha256: null,
      contentDhash: null,
    });
  });
});

describe("drainOnce — logging discloses nothing it shouldn't", () => {
  it("logs the band and outcome but never bytes or the confidence number", async () => {
    const { store } = makeStore([job()]);
    const lines: string[] = [];
    const provider = createStubClassifier({ fallback: verdictsOf({ sex: { level: 1, confidence: 0.93 } }) });

    await drainOnce(
      { ...deps(provider, store), logger: { log: (entry) => lines.push(JSON.stringify(entry)) } },
      10
    );

    const joined = lines.join("\n");
    expect(joined).toContain("m1");
    expect(joined).toContain("contains_women");
    // The score is retained in the database, deliberately, but a log line is a
    // different surface with different retention — it stays out of there.
    expect(joined).not.toContain("0.93");
    expect(joined).not.toContain("confidence");
    expect(joined).not.toContain("1,2,3");
  });

  it("a dedupe logs the classification only — no hashes, no source id", async () => {
    const { store, completed } = makeStore([job()], {
      resolved: () => ({ sourceMediaItemId: "src-1", classification: "general", levels: lv() }),
    });
    const entries: unknown[] = [];
    await drainOnce(
      { ...deps(createStubClassifier(), store), logger: { log: (e) => entries.push(e) } },
      10
    );
    expect(entries).toEqual([
      { event: "deduped", mediaItemId: "m1", classification: "general", durationMs: expect.any(Number) },
    ]);
    expect(JSON.stringify(entries)).not.toContain(completed[0]!.contentSha256!);
  });
});
