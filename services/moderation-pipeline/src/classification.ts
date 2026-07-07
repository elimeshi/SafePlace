import type { MediaClassification } from "@safeplace/visibility-policy";

/**
 * The three-tier confidence model from
 * docs/product/07-moderation-spec.md §2.1. Thresholds are configuration,
 * not constants — see the note on ClassificationThresholds below. Do not
 * hardcode specific percentages in logic; read them from config so they
 * can be tuned post-MVP without a code change.
 */
export type ConfidenceBand = "low" | "medium" | "high";

export interface ClassificationThresholds {
  /** Below this score → 'low' band (auto-approved). */
  lowMax: number;
  /** At or above this score → 'high' band (auto-flagged). */
  highMin: number;
}

/**
 * PLACEHOLDER — see docs/product/07-moderation-spec.md §2.1: exact
 * thresholds are explicitly deferred pending real performance data from
 * the AI team. Direction stated in the spec: be conservative toward
 * over-flagging (prefer false-positive over false-negative).
 */
export const DEFAULT_THRESHOLDS: ClassificationThresholds = {
  lowMax: 0.2,
  highMin: 0.8,
};

export interface ClassificationJob {
  mediaItemId: string;
  storageUrl: string;
  /** Which surface this media belongs to — see visibility-model.md §4. */
  surface:
    | "post"
    | "comment"
    | "profile_photo"
    | "poll_option"
    | "story"
    | "message";
  enqueuedAt: string;
}

export interface ClassificationResult {
  mediaItemId: string;
  rawConfidenceScore: number;
  confidenceBand: ConfidenceBand;
  resolvedClassification: MediaClassification;
  classifiedAt: string;
}

export function resolveConfidenceBand(
  score: number,
  thresholds: ClassificationThresholds = DEFAULT_THRESHOLDS
): ConfidenceBand {
  if (score < thresholds.lowMax) return "low";
  if (score >= thresholds.highMin) return "high";
  return "medium";
}

export function resolveClassificationFromBand(
  band: ConfidenceBand
): MediaClassification {
  switch (band) {
    case "low":
      return "general";
    case "medium":
      return "pending_review";
    case "high":
      return "contains_women";
  }
}
