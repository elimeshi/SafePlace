/**
 * The classification worker's control flow.
 *
 * Shaped as a single drainOnce() pass rather than a loop with its own timer:
 * the worker is deployed as a stateless handler invoked on a schedule (ADR
 * 0009), so "run until the queue is empty and exit" is the unit of work, and
 * several invocations may overlap. Concurrency safety lives in the claim
 * query's `for update skip locked`, not here.
 *
 * Every dependency is injected so the decision logic can be tested without a
 * network, and so the same code can run against the real Supabase client or
 * against PGlite in the parity harness.
 */
import {
  resolveConfidenceBand,
  resolveMediaOutcome,
  type ClassificationThresholds,
} from "./classification";
import { womanProbabilityFrom, type ClassifierProvider } from "./classifier";
import {
  coverageFraction,
  padRegion,
  type RegionLocalizer,
} from "./regions";
import type { ImageRedactor } from "./redactor";
import type { MediaClassification } from "@safeplace/visibility-policy";

export interface ClaimedJob {
  mediaItemId: string;
  storagePath: string;
  contentType: string;
}

export interface CompletedClassification {
  mediaItemId: string;
  classification: MediaClassification;
  provider: string;
  modelId: string;
  verdict: string;
  confidence: number;
  womanProbability: number;
}

export interface JobStore {
  claim(batchSize: number, workerId: string): Promise<ClaimedJob[]>;
  complete(result: CompletedClassification): Promise<void>;
  fail(mediaItemId: string, error: string): Promise<void>;
}

export interface MediaFetcher {
  fetch(storagePath: string): Promise<Uint8Array>;
}

/**
 * Structured log entries. Deliberately narrow: the media id, the surface, the
 * resolved band and classification, and timings. No bytes, and no confidence
 * number — the score is retained in the database on purpose, under a defined
 * retention window and reachable only by the service role, and a log line is a
 * different surface with different retention.
 */
export interface WorkerLogEntry {
  event:
    | "classified"
    | "failed"
    | "skipped_unsupported"
    | "redacted"
    | "redaction_declined";
  mediaItemId: string;
  classification?: MediaClassification;
  band?: string;
  durationMs?: number;
  error?: string;
}

export interface Logger {
  log(entry: WorkerLogEntry): void;
}

export interface WorkerDeps {
  store: JobStore;
  media: MediaFetcher;
  provider: ClassifierProvider;
  modelId: string;
  workerId: string;
  thresholds: ClassificationThresholds;
  logger?: Logger;
  /** Omit to keep the previous behaviour: filtered viewers get no image. */
  redaction?: RedactionDeps;
}

export interface DrainSummary {
  claimed: number;
  classified: number;
  failed: number;
}

/** MVP classifies images only — see ADR 0010 on video. */
const SUPPORTED_CONTENT_TYPES = /^image\/(jpeg|png|webp|gif|heic|heif)$/i;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function processJob(
  deps: WorkerDeps,
  job: ClaimedJob
): Promise<"classified" | "failed"> {
  const startedAt = Date.now();

  // A video cannot be judged by an image classifier, and must not be left
  // unclassified either — under fail-closed visibility that means invisible to
  // everyone but its uploader, indefinitely. A human decides instead.
  if (!SUPPORTED_CONTENT_TYPES.test(job.contentType)) {
    await deps.store.complete({
      mediaItemId: job.mediaItemId,
      classification: "pending_review",
      provider: deps.provider.name,
      modelId: deps.modelId,
      verdict: "unsupported_media",
      confidence: 0,
      womanProbability: 0.5,
    });
    deps.logger?.log({
      event: "skipped_unsupported",
      mediaItemId: job.mediaItemId,
      classification: "pending_review",
      durationMs: Date.now() - startedAt,
    });
    return "classified";
  }

  try {
    const bytes = await deps.media.fetch(job.storagePath);
    const output = await deps.provider.classify({
      mediaItemId: job.mediaItemId,
      bytes,
      contentType: job.contentType,
    });

    const outcome = resolveMediaOutcome(output, deps.thresholds);
    const classification = outcome.classification;
    const womanProbability = womanProbabilityFrom(output);

    await deps.store.complete({
      mediaItemId: job.mediaItemId,
      classification,
      provider: deps.provider.name,
      modelId: deps.modelId,
      // replaced in Task 11 (store takes levels, not a single verdict)
      verdict: output.kind === "refused" ? "refused" : "levels",
      confidence: output.kind === "refused" ? 0 : output.groups.sex.confidence,
      womanProbability,
    });

    deps.logger?.log({
      event: "classified",
      mediaItemId: job.mediaItemId,
      classification,
      band: resolveConfidenceBand(womanProbability, deps.thresholds),
      durationMs: Date.now() - startedAt,
    });

    // Only flagged media is worth redacting, and only if it is configured.
    // Runs AFTER the classification is written: this stage is additive, and a
    // failure in it must not undo or retry a classification that succeeded.
    if (classification === "contains_women" && deps.redaction) {
      await runRedaction(deps, job, bytes);
    }

    return "classified";
  } catch (error) {
    const message = messageOf(error);
    await deps.store.fail(job.mediaItemId, message);
    deps.logger?.log({
      event: "failed",
      mediaItemId: job.mediaItemId,
      error: message,
      durationMs: Date.now() - startedAt,
    });
    return "failed";
  }
}

/**
 * Claim up to `batchSize` jobs and process them. One job's failure never stops
 * the pass — a single poison item must not stall the queue behind it.
 */
export async function drainOnce(
  deps: WorkerDeps,
  batchSize: number
): Promise<DrainSummary> {
  const jobs = await deps.store.claim(batchSize, deps.workerId);
  const summary: DrainSummary = { claimed: jobs.length, classified: 0, failed: 0 };

  for (const job of jobs) {
    const outcome = await processJob(deps, job);
    if (outcome === "classified") summary.classified += 1;
    else summary.failed += 1;
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Redaction stage (ADR 0012)
//
// Optional and additive. When it is not configured, or when anything about it
// is uncertain, the pipeline behaves exactly as it did before: the original is
// withheld from viewers the filter applies to. Blurring is an improvement
// offered when the pipeline is confident, never a weaker substitute for
// withholding.
// ---------------------------------------------------------------------------

export interface RedactionRecord {
  mediaItemId: string;
  storagePath: string;
  regionCount: number;
  coverage: number;
  localizer: string;
  modelId: string;
  verified: boolean;
}

export interface DerivativeStore {
  /** Store the redacted bytes; returns the object path. */
  put(mediaItemId: string, bytes: Uint8Array): Promise<string>;
  /** Point the media row at the derivative and record what was done. */
  attach(record: RedactionRecord): Promise<void>;
}

export interface RedactionDeps {
  localizer: RegionLocalizer;
  redactor: ImageRedactor;
  derivatives: DerivativeStore;
  /**
   * Re-classifies the REDACTED output. This is the gate that makes the whole
   * feature safe: a woman the localizer missed is still visible in the
   * derivative, and this is what notices.
   */
  recheck: ClassifierProvider;
  /**
   * Above this fraction of the frame, don't bother. Blurring most of an image
   * looks the same as withholding it, so it buys nothing and costs two model
   * calls.
   */
  maxCoverage: number;
  /** Grown on each side, to absorb the imprecision of model coordinates. */
  padding: number;
}

/**
 * Produce and attach a redacted derivative, or decline. Declining is a normal
 * outcome, not an error: the caller has already written the classification,
 * and without a derivative the media is simply withheld as before.
 *
 * Every failure inside here is swallowed for that reason — the job is done.
 */
async function runRedaction(
  deps: WorkerDeps,
  job: ClaimedJob,
  bytes: Uint8Array
): Promise<void> {
  const redaction = deps.redaction;
  if (!redaction) return;

  const decline = (reason: string): void =>
    deps.logger?.log({
      event: "redaction_declined",
      mediaItemId: job.mediaItemId,
      error: reason,
    });

  try {
    const located = await redaction.localizer.locate({
      mediaItemId: job.mediaItemId,
      bytes,
      contentType: job.contentType,
    });

    // A partial set of boxes is the dangerous case: it would blur some of the
    // women and leave the rest visible, to a viewer who believes the filter
    // worked. Only a complete answer is usable.
    if (!located.foundAll || located.regions.length === 0) {
      decline("no complete set of regions");
      return;
    }

    const padded = located.regions.map((r) => padRegion(r, redaction.padding));
    const coverage = coverageFraction(padded);
    if (coverage > redaction.maxCoverage) {
      decline("regions cover too much of the frame");
      return;
    }

    const redacted = await redaction.redactor.redact(
      bytes,
      padded,
      job.contentType
    );

    // The gate. Anything short of a confident "no woman here" means the
    // derivative is not trustworthy, and it never reaches storage.
    const recheck = await redaction.recheck.classify({
      mediaItemId: job.mediaItemId,
      bytes: redacted,
      contentType: job.contentType,
    });
    const recheckBand = resolveConfidenceBand(
      womanProbabilityFrom(recheck),
      deps.thresholds
    );
    if (recheckBand !== "low") {
      decline("redacted output did not come back clean");
      return;
    }

    const storagePath = await redaction.derivatives.put(job.mediaItemId, redacted);
    await redaction.derivatives.attach({
      mediaItemId: job.mediaItemId,
      storagePath,
      regionCount: padded.length,
      coverage,
      localizer: redaction.localizer.name,
      modelId: deps.modelId,
      verified: true,
    });

    deps.logger?.log({
      event: "redacted",
      mediaItemId: job.mediaItemId,
      classification: "contains_women",
    });
  } catch (error) {
    // The classification stands; only the extra derivative was lost.
    decline(error instanceof Error ? error.message : String(error));
  }
}
