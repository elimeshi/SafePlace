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
  resolveClassificationFromBand,
  resolveConfidenceBand,
  type ClassificationThresholds,
  type ConfidenceBand,
} from "./classification";

export {
  createStubClassifier,
  womanProbabilityFrom,
  type ClassifierInput,
  type ClassifierOutput,
  type ClassifierProvider,
  type ClassifierVerdict,
} from "./classifier";

export {
  createAnthropicClassifier,
  createAnthropicClassifierFromConfig,
} from "./providers/anthropic";

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
  type WorkerDeps,
  type WorkerLogEntry,
} from "./worker";

export {
  CLASSIFIER_SYSTEM_PROMPT,
  CLASSIFIER_OUTPUT_SCHEMA,
} from "./classifier-prompt";

export {
  PENDING_REVIEW_NOTICE_HE,
  PROCESSING_NOTICE_HE,
  WOMEN_DETECTED_NOTICE_HE,
} from "./notice-copy";
