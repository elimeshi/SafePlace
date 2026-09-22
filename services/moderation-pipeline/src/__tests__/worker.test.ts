import { describe, expect, it, vi } from "vitest";
import { createStubClassifier, type ClassifierProvider } from "../classifier";
import { DEFAULT_THRESHOLDS } from "../classification";
import { drainOnce, type JobStore, type MediaFetcher, type ClaimedJob } from "../worker";

/**
 * The worker's control flow, exercised against an in-memory store. The SQL it
 * drives is covered separately by the PGlite suite in packages/db-testing —
 * these tests are about what the worker decides, not about what Postgres does
 * with it.
 */

function makeStore(jobs: ClaimedJob[]) {
  const completed: Array<{ mediaItemId: string; classification: string; verdict: string }> = [];
  const failed: Array<{ mediaItemId: string; error: string }> = [];
  const store: JobStore = {
    claim: async (batchSize) => jobs.slice(0, batchSize),
    complete: async (result) => {
      completed.push({
        mediaItemId: result.mediaItemId,
        classification: result.classification,
        verdict: result.verdict,
      });
    },
    fail: async (mediaItemId, error) => {
      failed.push({ mediaItemId, error });
    },
  };
  return { store, completed, failed };
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
    const provider = createStubClassifier({ verdict: "woman_present", confidence: 0.95 });

    const summary = await drainOnce(deps(provider, store), 10);

    expect(completed).toEqual([
      { mediaItemId: "m1", classification: "contains_women", verdict: "woman_present" },
    ]);
    expect(summary).toMatchObject({ claimed: 1, classified: 1, failed: 0 });
  });

  it("sends a confident negative to 'general'", async () => {
    const { store, completed } = makeStore([job()]);
    const provider = createStubClassifier({ verdict: "no_woman", confidence: 0.95 });
    await drainOnce(deps(provider, store), 10);
    expect(completed[0]?.classification).toBe("general");
  });

  it("sends an uncertain verdict to human review", async () => {
    const { store, completed } = makeStore([job()]);
    const provider = createStubClassifier({ verdict: "uncertain", confidence: 0.1 });
    await drainOnce(deps(provider, store), 10);
    expect(completed[0]?.classification).toBe("pending_review");
  });

  it("processes every claimed job, not just the first", async () => {
    const { store, completed } = makeStore([job({ mediaItemId: "a" }), job({ mediaItemId: "b" })]);
    await drainOnce(deps(createStubClassifier({ verdict: "no_woman", confidence: 1 }), store), 10);
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
        return { verdict: "no_woman", confidence: 1 };
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
      deps(createStubClassifier({ verdict: "no_woman", confidence: 1 }), store, media),
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
    });
  });
});

describe("drainOnce — logging discloses nothing it shouldn't", () => {
  it("logs the band and outcome but never bytes or the confidence number", async () => {
    const { store } = makeStore([job()]);
    const lines: string[] = [];
    const provider = createStubClassifier({ verdict: "woman_present", confidence: 0.93 });

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
});
