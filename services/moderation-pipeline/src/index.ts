/**
 * Entry point for the async classification worker.
 *
 * This is a SKELETON — it defines the shape of the job-processing loop and
 * the required guarantees, but does not yet integrate with a real queue or
 * vision model provider (both are open questions — see
 * docs/decisions/open-questions-backlog.md, section A: "LLM vendor
 * selection").
 *
 * Non-negotiable invariants for whatever fills this in (see
 * docs/architecture/moderation-pipeline.md §2 and CLAUDE.md invariant #8):
 *
 * 1. This worker must never sit in the synchronous request path of a
 *    publish/upload action. It consumes a queue; it does not get called
 *    directly from an API handler that a user is waiting on.
 * 2. Every media item from every surface in
 *    docs/architecture/visibility-model.md §4 must flow through here —
 *    don't build a second, parallel classification path for a new upload
 *    surface.
 * 3. Only the resolved `MediaClassification` enum is written back to the
 *    row that `@safeplace/visibility-policy` and RLS policies read. Raw
 *    confidence scores stay internal to this service (see classification.ts).
 */

import { resolveClassificationFromBand, resolveConfidenceBand } from "./classification";
import type { ClassificationJob, ClassificationResult } from "./classification";

async function processJob(job: ClassificationJob): Promise<ClassificationResult> {
  // TODO: replace with a real vision-model call once a provider is chosen
  // (see open-questions-backlog.md). This stub exists only so the queue
  // consumer loop below has a concrete shape to build against.
  throw new Error(
    `processJob not yet implemented — wire up a vision model provider for job ${job.mediaItemId}`
  );
}

async function main() {
  // TODO: replace with a real queue subscription (e.g. Supabase Realtime
  // on an `unclassified` media rows table, or a dedicated queue service).
  console.log(
    "[moderation-pipeline] worker skeleton started — no queue wired up yet."
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[moderation-pipeline] fatal error:", err);
    process.exit(1);
  });
}

export { processJob, resolveConfidenceBand, resolveClassificationFromBand };
