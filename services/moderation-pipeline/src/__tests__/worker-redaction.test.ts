import { describe, expect, it, vi } from "vitest";
import { DEFAULT_THRESHOLDS } from "../classification";
import { createStubClassifier, verdictsOf, type ClassifierProvider } from "../classifier";
import { createStubLocalizer, type Region } from "../regions";
import { drainOnce, type ClaimedJob, type JobStore, type MediaFetcher, type WorkerDeps } from "../worker";
import type { ImageRedactor } from "../redactor";
import type { DerivativeStore, RedactionRecord } from "../worker";

/**
 * The redaction stage. Its governing property: every uncertainty here falls
 * back to withholding the original, which is exactly the behaviour that
 * existed before this feature. Blurring is an improvement offered when the
 * pipeline is confident; it is never a weaker substitute for withholding.
 */

const smallRegion: Region = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };

function harness(options: {
  localizerRegions?: Region[];
  foundAll?: boolean;
  recheck?: ClassifierProvider;
  redactor?: ImageRedactor;
  maxCoverage?: number;
}) {
  const completed: string[] = [];
  const stored: Array<{ mediaItemId: string; bytes: Uint8Array }> = [];
  const attached: RedactionRecord[] = [];

  const store: JobStore = {
    claim: async () => [
      { mediaItemId: "m1", storagePath: "u/1.jpg", contentType: "image/jpeg" } as ClaimedJob,
    ],
    findResolvedByHash: async () => null,
    complete: async (r) => {
      completed.push(r.classification);
    },
    fail: async () => {},
  };

  const derivatives: DerivativeStore = {
    put: async (mediaItemId, bytes) => {
      stored.push({ mediaItemId, bytes });
      return `u/${mediaItemId}.redacted`;
    },
    attach: async (record) => {
      attached.push(record);
    },
  };

  const media: MediaFetcher = { fetch: async () => new Uint8Array([9, 9, 9]) };

  const deps: WorkerDeps = {
    store,
    media,
    // The first pass flags it, which is what sends it to the redaction stage.
    provider: createStubClassifier({ fallback: verdictsOf({ sex: { level: 1, confidence: 0.99 } }, 0.99) }),
    modelId: "stub-v1",
    workerId: "w",
    thresholds: DEFAULT_THRESHOLDS,
    redaction: {
      localizer: createStubLocalizer({
        regions: options.localizerRegions ?? [smallRegion],
        foundAll: options.foundAll ?? true,
      }),
      redactor:
        options.redactor ?? { redact: async () => new Uint8Array([1, 1, 1]) },
      derivatives,
      // The gate: the blurred output must come back clean.
      recheck:
        options.recheck ?? createStubClassifier({ fallback: verdictsOf({}, 0.99) }),
      maxCoverage: options.maxCoverage ?? 0.5,
      padding: 0.15,
    },
  };

  return { deps, completed, stored, attached };
}

describe("redaction stage", () => {
  it("produces and attaches a derivative when everything checks out", async () => {
    const { deps, completed, stored, attached } = harness({});
    await drainOnce(deps, 10);

    expect(completed).toEqual(["contains_women"]);
    expect(stored).toHaveLength(1);
    expect(attached[0]).toMatchObject({
      mediaItemId: "m1",
      storagePath: "u/m1.redacted",
      regionCount: 1,
      verified: true,
    });
  });

  it("gives up when the localizer will not claim it found everyone", async () => {
    // A partial set of boxes would blur some women and expose the rest, while
    // the viewer believes the filter worked.
    const { deps, stored, attached } = harness({ foundAll: false });
    await drainOnce(deps, 10);
    expect(stored).toHaveLength(0);
    expect(attached).toHaveLength(0);
  });

  it("gives up when no regions come back at all", async () => {
    const { deps, stored } = harness({ localizerRegions: [], foundAll: true });
    await drainOnce(deps, 10);
    expect(stored).toHaveLength(0);
  });

  it("does not bother when the regions cover most of the frame", async () => {
    // Blurring 80% of an image is visually the same as withholding it, so it
    // buys nothing and costs two model calls.
    const { deps, stored } = harness({
      localizerRegions: [{ x: 0, y: 0, width: 0.9, height: 0.9 }],
      maxCoverage: 0.5,
    });
    await drainOnce(deps, 10);
    expect(stored).toHaveLength(0);
  });

  it("discards the derivative when the re-check still sees a woman", async () => {
    // The gate that makes the whole feature safe: a missed woman shows up
    // here, and the item falls back to being withheld entirely.
    const { deps, stored, attached } = harness({
      recheck: createStubClassifier({ fallback: verdictsOf({ sex: { level: 1, confidence: 0.95 } }) }),
    });
    await drainOnce(deps, 10);
    // Nothing that fails the gate reaches storage at all: an unverified
    // derivative of someone's photo sitting in the bucket is an orphan nobody
    // audits.
    expect(stored).toHaveLength(0);
    expect(attached).toHaveLength(0);
  });

  it("discards the derivative when the re-check is merely unsure", async () => {
    const { deps, attached } = harness({
      recheck: createStubClassifier({ fallback: verdictsOf({ sex: { level: "uncertain", confidence: 0.5 } }) }),
    });
    await drainOnce(deps, 10);
    expect(attached).toHaveLength(0);
  });

  it("keeps the classification when redaction itself fails", async () => {
    // The classification already succeeded and is already written; a failure
    // in this optional extra stage must not undo it or retry the job.
    const { deps, completed, attached } = harness({
      redactor: {
        redact: async () => {
          throw new Error("libvips exploded");
        },
      },
    });
    const summary = await drainOnce(deps, 10);

    expect(completed).toEqual(["contains_women"]);
    expect(attached).toHaveLength(0);
    expect(summary).toMatchObject({ classified: 1, failed: 0 });
  });

  it("never runs for media that was not flagged", async () => {
    const { deps, stored } = harness({});
    const locate = vi.fn();
    deps.provider = createStubClassifier({ fallback: verdictsOf({}, 0.99) });
    deps.redaction!.localizer = { name: "never", locate };

    await drainOnce(deps, 10);

    expect(locate).not.toHaveBeenCalled();
    expect(stored).toHaveLength(0);
  });

  it("does nothing at all when redaction is not configured", async () => {
    const { deps, completed } = harness({});
    delete deps.redaction;
    await drainOnce(deps, 10);
    expect(completed).toEqual(["contains_women"]);
  });
});
