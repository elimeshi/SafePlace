import {
  CONTENT_GROUPS,
  type ContentGroup,
  type ContentLevel,
} from "@safeplace/visibility-policy";
import { groupProbabilityFrom } from "./classification";

export type { ContentGroup, ContentLevel };

/**
 * The swappable classifier seam (ADR 0004). Everything upstream of this file
 * — the worker, the band logic, the persisted classification — depends on
 * this interface, never on a specific vendor, and the concrete model is
 * configuration rather than a literal in pipeline code.
 *
 * Why a level plus a confidence per group, rather than a bare probability: a
 * vision LLM is good at answering "what is shown here" and poor at emitting a
 * calibrated probability, so asking for a number directly produces a figure
 * that looks like a probability and is not one. The provider returns what the
 * model can actually give; groupProbabilityFrom projects each group's answer
 * onto the 0..1 scale the product spec (07-moderation-spec.md §2.1) and the
 * tunable thresholds are written in. The three-band mechanism is unchanged.
 */

/** One group's answer. 'uncertain' is a first-class answer (routes to a human). */
export interface GroupVerdict {
  level: ContentLevel | "uncertain";
  /** The model's own certainty in that level, 0..1. */
  confidence: number;
}

export type ClassifierVerdicts = Record<ContentGroup, GroupVerdict>;

/**
 * Either an answer per group, or a refusal: the model declined to describe
 * the image at all. A refusal is information ("it saw something it will not
 * talk about"), never a transport error, so it is a value here, not a throw.
 */
export type ClassifierOutput =
  | { kind: "verdicts"; groups: ClassifierVerdicts }
  | { kind: "refused" };

export const UNCERTAIN_VERDICT: GroupVerdict = { level: "uncertain", confidence: 0 };

export function allUncertain(): ClassifierOutput {
  return {
    kind: "verdicts",
    groups: Object.fromEntries(
      CONTENT_GROUPS.map((g) => [g, UNCERTAIN_VERDICT])
    ) as ClassifierVerdicts,
  };
}

export interface ClassifierInput {
  mediaItemId: string;
  /** Raw image bytes, fetched server-side with the service role. */
  bytes: Uint8Array;
  contentType: string;
}

export interface ClassifierProvider {
  /** Recorded alongside the score, so a threshold reading is attributable. */
  readonly name: string;
  classify(input: ClassifierInput): Promise<ClassifierOutput>;
}

/**
 * The sex-group probability — what the redaction recheck gates on. A refusal
 * resolves to the midpoint, i.e. to human review: nothing was concluded, and
 * nothing unreadable may auto-approve.
 */
export function womanProbabilityFrom(output: ClassifierOutput): number {
  return output.kind === "refused" ? 0.5 : groupProbabilityFrom(output.groups.sex);
}

export interface StubClassifierOptions {
  /** Fixed answers keyed by media item id — for tests that need a given band. */
  byMediaItemId?: Record<string, ClassifierOutput>;
  /** Fallback for ids not listed. Defaults to all-uncertain (routes to a human). */
  fallback?: ClassifierOutput;
}

/**
 * A deterministic, offline classifier behind the same interface — the default
 * provider for development and the only one the test suite uses, so no test
 * run ever spends money or depends on the network.
 *
 * Defaults to all-uncertain, which routes to human review. A stub that
 * silently auto-approved would make a misconfigured deployment look like a
 * working one.
 */
export function createStubClassifier(
  options: StubClassifierOptions = {}
): ClassifierProvider {
  const fallback = options.fallback ?? allUncertain();
  return {
    name: "stub",
    classify: async ({ mediaItemId }: ClassifierInput) =>
      options.byMediaItemId?.[mediaItemId] ?? fallback,
  };
}

/** Convenience for tests: every group 0 except the ones given. */
export function verdictsOf(
  over: Partial<ClassifierVerdicts>,
  confidence = 0.95
): ClassifierOutput {
  const groups = Object.fromEntries(
    CONTENT_GROUPS.map((g) => [g, over[g] ?? { level: 0, confidence }])
  ) as ClassifierVerdicts;
  return { kind: "verdicts", groups };
}
