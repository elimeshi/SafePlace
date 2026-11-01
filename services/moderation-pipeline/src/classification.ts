import {
  CONTENT_GROUPS,
  MAX_LEVEL_BY_GROUP,
  PROHIBITED_LEVEL,
  type ContentGroup,
  type ContentLevel,
  type ContentLevels,
  type MediaClassification,
} from "@safeplace/visibility-policy";
import type { ClassifierOutput, GroupVerdict } from "./classifier";

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

/** "Nothing can be concluded": lands in the medium band for any sane threshold pair. */
const UNDECIDED = 0.5;

/**
 * Same projection the single axis used: a confident 0 sits near 0, a confident
 * >=1 near 1. Fails safe: an unreadable confidence resolves to the midpoint,
 * i.e. to human review.
 */
export function groupProbabilityFrom(v: GroupVerdict): number {
  if (v.level === "uncertain") return UNDECIDED;
  if (!Number.isInteger(v.level) || v.level < 0 || v.level > 3) return UNDECIDED;
  if (!Number.isFinite(v.confidence) || v.confidence < 0 || v.confidence > 1) return UNDECIDED;
  return v.level === 0 ? UNDECIDED - v.confidence / 2 : UNDECIDED + v.confidence / 2;
}

export type ReviewReason = "ai_medium_confidence" | "ai_prohibited_content" | "ai_refusal";

export interface MediaOutcome {
  classification: MediaClassification;
  /** Resolved levels, or null whenever the item goes to a human. */
  levels: ContentLevels | null;
  reviewReason: ReviewReason | null;
  /** Groups the model could not settle — what an escalation re-asks. */
  undecided: ContentGroup[];
}

export function resolveMediaOutcome(
  output: ClassifierOutput,
  thresholds: ClassificationThresholds = DEFAULT_THRESHOLDS
): MediaOutcome {
  if (output.kind === "refused") {
    return { classification: "pending_review", levels: null, reviewReason: "ai_refusal", undecided: [] };
  }

  const resolved: Partial<Record<ContentGroup, ContentLevel>> = {};
  const undecided: ContentGroup[] = [];
  for (const g of CONTENT_GROUPS) {
    const v = output.groups[g];
    const validLevel =
      v.level === "uncertain" ||
      (Number.isInteger(v.level) && v.level >= 0 && v.level <= MAX_LEVEL_BY_GROUP[g]);
    const band = !validLevel ? "medium" : resolveConfidenceBand(groupProbabilityFrom(v), thresholds);
    if (v.level === "uncertain" || band === "medium") {
      undecided.push(g);
    } else {
      resolved[g] = v.level;
    }
  }

  if (undecided.length > 0) {
    return { classification: "pending_review", levels: null, reviewReason: "ai_medium_confidence", undecided };
  }
  const levels = resolved as ContentLevels;
  if (CONTENT_GROUPS.some((g) => levels[g] === PROHIBITED_LEVEL)) {
    return { classification: "pending_review", levels: null, reviewReason: "ai_prohibited_content", undecided: [] };
  }
  return {
    classification: levels.sex >= 1 ? "contains_women" : "general",
    levels,
    reviewReason: null,
    undecided: [],
  };
}
