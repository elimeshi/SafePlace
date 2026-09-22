/**
 * The swappable classifier seam (ADR 0004). Everything upstream of this file
 * — the worker, the band logic, the persisted classification — depends on
 * this interface, never on a specific vendor, and the concrete model is
 * configuration rather than a literal in pipeline code.
 *
 * Why a verdict plus a confidence, rather than a bare probability: a vision
 * LLM is good at answering "is a woman shown here" and poor at emitting a
 * calibrated probability, so asking for a number directly produces a figure
 * that looks like a probability and is not one. The provider returns what the
 * model can actually give; womanProbabilityFrom projects that onto the 0..1
 * scale the product spec (07-moderation-spec.md §2.1) and the tunable
 * thresholds are written in. The three-band mechanism is unchanged.
 */

/**
 * What the model is asked to decide. 'uncertain' is a first-class answer, not
 * a failure: the medium band exists precisely so the model can decline to
 * call it and a human decides instead.
 */
export type ClassifierVerdict = "woman_present" | "no_woman" | "uncertain";

export interface ClassifierOutput {
  verdict: ClassifierVerdict;
  /** The model's own certainty in its verdict, 0..1. */
  confidence: number;
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
 * The midpoint: "nothing can be concluded". Lands in the medium band for any
 * sane threshold pair, so it routes to a human.
 */
const UNDECIDED = 0.5;

function isUsableConfidence(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

/**
 * Project a provider's answer onto the probability-the-content-contains-women
 * scale. A confident verdict reaches the end of the scale; an unsure one stays
 * near the middle, where the thresholds route it to review.
 *
 * Fails safe: any output that cannot be read — a non-finite or out-of-range
 * confidence, an unknown verdict, a missing object — resolves to the midpoint
 * and therefore to human review. A remote model behind a JSON schema can still
 * return nonsense, and nonsense must never auto-approve.
 */
export function womanProbabilityFrom(output: ClassifierOutput): number {
  if (output === null || typeof output !== "object") return UNDECIDED;
  if (!isUsableConfidence(output.confidence)) return UNDECIDED;

  switch (output.verdict) {
    case "woman_present":
      return UNDECIDED + output.confidence / 2;
    case "no_woman":
      return UNDECIDED - output.confidence / 2;
    case "uncertain":
      return UNDECIDED;
    default:
      return UNDECIDED;
  }
}

export interface StubClassifierOptions {
  /** Fixed answers keyed by media item id — for tests that need a given band. */
  byMediaItemId?: Record<string, ClassifierOutput>;
  /** Fallback verdict for any id not listed above. */
  verdict?: ClassifierVerdict;
  /** Fallback confidence for any id not listed above. */
  confidence?: number;
}

/**
 * A deterministic, offline classifier behind the same interface — the default
 * provider for development and the only one the test suite uses, so no test
 * run ever spends money or depends on the network.
 *
 * Defaults to 'uncertain', which routes to human review. A stub that silently
 * auto-approved would make a misconfigured deployment look like a working one.
 */
export function createStubClassifier(
  options: StubClassifierOptions = {}
): ClassifierProvider {
  const fallback: ClassifierOutput = {
    verdict: options.verdict ?? "uncertain",
    confidence: options.confidence ?? 0,
  };

  return {
    name: "stub",
    classify: async ({ mediaItemId }: ClassifierInput) =>
      options.byMediaItemId?.[mediaItemId] ?? fallback,
  };
}
