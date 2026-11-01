/**
 * Public surface of the classification pipeline.
 *
 * The invariants this service is built to keep (docs/architecture/
 * moderation-pipeline.md §2, CLAUDE.md invariants #1, #2 and #8):
 *
 * 1. Classification never sits in the synchronous path of a publish. The
 *    worker drains a queue; no API handler a user is waiting on calls it.
 * 2. Every media item from every surface in visibility-model.md §4 flows
 *    through here. That is enforced by a trigger on media_items rather than by
 *    convention, so a new upload surface cannot skip it (migration 0008).
 * 3. Only the resolved MediaClassification enum reaches anything a client can
 *    read. Verdicts and confidence numbers stay in the moderation schema,
 *    which no client role has rights on.
 */
export {
  DEFAULT_THRESHOLDS,
  groupProbabilityFrom,
  resolveClassificationFromBand,
  resolveConfidenceBand,
  resolveMediaOutcome,
  type ClassificationThresholds,
  type ConfidenceBand,
  type MediaOutcome,
  type ReviewReason,
} from "./classification";

export {
  UNCERTAIN_VERDICT,
  allUncertain,
  createStubClassifier,
  verdictsOf,
  womanProbabilityFrom,
  type ClassifierInput,
  type ClassifierOutput,
  type ClassifierProvider,
  type ClassifierVerdicts,
  type GroupVerdict,
} from "./classifier";

export {
  createAnthropicClassifier,
  createAnthropicClassifierFromConfig,
  type ClassifierUsage,
} from "./providers/anthropic";

export {
  createEscalatingClassifier,
  type EscalatingClassifierOptions,
} from "./providers/escalating";

export {
  clampRegion,
  coverageFraction,
  createStubLocalizer,
  padRegion,
  readLocalizerOutput,
  type LocalizerOutput,
  type Region,
  type RegionLocalizer,
} from "./regions";

export { createSharpRedactor, type ImageRedactor } from "./redactor";

export { createAnthropicLocalizer } from "./providers/anthropic-localizer";

export { LOCALIZER_SYSTEM_PROMPT, LOCALIZER_OUTPUT_SCHEMA } from "./localizer-prompt";

export {
  drainOnce,
  type DerivativeStore,
  type RedactionDeps,
  type RedactionRecord,
  type ClaimedJob,
  type CompletedClassification,
  type DrainSummary,
  type JobStore,
  type Logger,
  type MediaFetcher,
  type ResolvedByHash,
  type WorkerDeps,
  type WorkerLogEntry,
} from "./worker";

export { resolvedFromRow, type ResolvedRow } from "./supabase-store";

export {
  sweepOrphans,
  type ObjectRemover,
  type OrphanStore,
  type SweepSummary,
} from "./sweep";

export {
  CLASSIFIER_SYSTEM_PROMPT,
  CLASSIFIER_OUTPUT_SCHEMA,
} from "./classifier-prompt";

export {
  CONTENT_GROUP_LABELS_HE,
  CONTENT_NOTICE_HE,
  PENDING_REVIEW_NOTICE_HE,
  PROCESSING_NOTICE_HE,
} from "./notice-copy";

export { dhashHex, hashMedia, sha256Hex, type MediaHashes } from "./hashes";
