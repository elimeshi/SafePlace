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
  resolveClassificationFromBand,
  resolveConfidenceBand,
  type ClassificationThresholds,
} from "./classification";
import {
  womanProbabilityFrom,
  type ClassifierProvider,
  type ClassifierVerdict,
} from "./classifier";
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
  verdict: ClassifierVerdict | "unsupported_media";
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
  event: "classified" | "failed" | "skipped_unsupported";
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

    const womanProbability = womanProbabilityFrom(output);
    const band = resolveConfidenceBand(womanProbability, deps.thresholds);
    const classification = resolveClassificationFromBand(band);

    await deps.store.complete({
      mediaItemId: job.mediaItemId,
      classification,
      provider: deps.provider.name,
      modelId: deps.modelId,
      verdict: output.verdict,
      confidence: output.confidence,
      womanProbability,
    });

    deps.logger?.log({
      event: "classified",
      mediaItemId: job.mediaItemId,
      classification,
      band,
      durationMs: Date.now() - startedAt,
    });
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
