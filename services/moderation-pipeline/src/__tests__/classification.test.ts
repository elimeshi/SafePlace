import { describe, expect, it } from "vitest";
import {
  DEFAULT_THRESHOLDS,
  groupProbabilityFrom,
  resolveClassificationFromBand,
  resolveConfidenceBand,
  resolveMediaOutcome,
} from "../classification";
import type { ClassifierOutput } from "../classifier";

/**
 * The confidence-band → classification mapping is load-bearing for the whole
 * visibility system: it decides whether media is auto-approved, frozen for
 * human review, or auto-flagged as containing women. Covered here per the
 * project's testing ethos (CLAUDE.md §5), even though the surrounding worker
 * is still a skeleton.
 */
describe("resolveConfidenceBand", () => {
  it("scores below lowMax are 'low' (auto-approved)", () => {
    expect(resolveConfidenceBand(0)).toBe("low");
    expect(resolveConfidenceBand(0.19)).toBe("low");
  });

  it("scores at or above highMin are 'high' (auto-flagged)", () => {
    expect(resolveConfidenceBand(0.8)).toBe("high");
    expect(resolveConfidenceBand(1)).toBe("high");
  });

  it("scores between the thresholds are 'medium' (routed to human review)", () => {
    expect(resolveConfidenceBand(0.2)).toBe("medium"); // lowMax is exclusive
    expect(resolveConfidenceBand(0.5)).toBe("medium");
    expect(resolveConfidenceBand(0.79)).toBe("medium");
  });

  it("honors caller-supplied thresholds over the defaults", () => {
    const strict: { lowMax: number; highMin: number } = { lowMax: 0.05, highMin: 0.5 };
    expect(resolveConfidenceBand(0.1, strict)).toBe("medium");
    expect(resolveConfidenceBand(0.6, strict)).toBe("high");
  });

  it("DEFAULT_THRESHOLDS lean conservative (wide medium band biased to over-flagging)", () => {
    expect(DEFAULT_THRESHOLDS.lowMax).toBe(0.2);
    expect(DEFAULT_THRESHOLDS.highMin).toBe(0.8);
  });
});

describe("resolveClassificationFromBand", () => {
  it("maps each band to the classification the visibility layer reads", () => {
    expect(resolveClassificationFromBand("low")).toBe("general");
    expect(resolveClassificationFromBand("medium")).toBe("pending_review");
    expect(resolveClassificationFromBand("high")).toBe("contains_women");
  });
});

const verdicts = (
  over: Partial<
    Record<
      "sex" | "violence" | "religion" | "addictions",
      { level: 0 | 1 | 2 | 3 | "uncertain"; confidence: number }
    >
  >
): ClassifierOutput => ({
  kind: "verdicts",
  groups: {
    sex: { level: 0, confidence: 0.95 },
    violence: { level: 0, confidence: 0.95 },
    religion: { level: 0, confidence: 0.95 },
    addictions: { level: 0, confidence: 0.95 },
    ...over,
  },
});

describe("groupProbabilityFrom", () => {
  it("projects level 0 below the midpoint and level >= 1 above it", () => {
    expect(groupProbabilityFrom({ level: 0, confidence: 0.9 })).toBeCloseTo(0.05);
    expect(groupProbabilityFrom({ level: 2, confidence: 0.9 })).toBeCloseTo(0.95);
    expect(groupProbabilityFrom({ level: "uncertain", confidence: 1 })).toBe(0.5);
  });

  it("a malformed level is the midpoint, never a confident answer", () => {
    expect(groupProbabilityFrom({ level: 1.5 as never, confidence: 0.9 })).toBe(0.5);
  });
});

describe("resolveMediaOutcome", () => {
  it("all clear → general with zero levels", () => {
    const o = resolveMediaOutcome(verdicts({}), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("general");
    expect(o.levels).toEqual({ sex: 0, violence: 0, religion: 0, addictions: 0 });
    expect(o.reviewReason).toBeNull();
  });

  it("confident woman → contains_women with sex level", () => {
    const o = resolveMediaOutcome(verdicts({ sex: { level: 1, confidence: 0.9 } }), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("contains_women");
    expect(o.levels?.sex).toBe(1);
  });

  it("a confident non-sex level alone is still 'general' lifecycle with levels set", () => {
    const o = resolveMediaOutcome(verdicts({ violence: { level: 2, confidence: 0.9 } }), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("general");
    expect(o.levels?.violence).toBe(2);
  });

  it("any medium-band or uncertain group → pending_review, levels null, undecided lists it", () => {
    const o = resolveMediaOutcome(verdicts({ religion: { level: 1, confidence: 0.3 } }), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("pending_review");
    expect(o.levels).toBeNull();
    expect(o.reviewReason).toBe("ai_medium_confidence");
    expect(o.undecided).toEqual(["religion"]);
    const u = resolveMediaOutcome(verdicts({ sex: { level: "uncertain", confidence: 0 } }), DEFAULT_THRESHOLDS);
    expect(u.undecided).toEqual(["sex"]);
  });

  it("level 3 anywhere → pending_review with ai_prohibited_content, even when confident", () => {
    const o = resolveMediaOutcome(verdicts({ violence: { level: 3, confidence: 0.99 } }), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("pending_review");
    expect(o.reviewReason).toBe("ai_prohibited_content");
    expect(o.undecided).toEqual([]);
  });

  it("a level above the group's ladder is treated as uncertain", () => {
    const o = resolveMediaOutcome(verdicts({ addictions: { level: 3, confidence: 0.99 } }), DEFAULT_THRESHOLDS);
    expect(o.undecided).toEqual(["addictions"]);
  });

  it("a malformed level routes to review instead of resolving", () => {
    const o = resolveMediaOutcome(
      verdicts({ violence: { level: "banana" as never, confidence: 0.99 } }),
      DEFAULT_THRESHOLDS
    );
    expect(o.classification).toBe("pending_review");
    expect(o.undecided).toContain("violence");
  });

  it("refusal → pending_review with ai_refusal", () => {
    const o = resolveMediaOutcome({ kind: "refused" }, DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("pending_review");
    expect(o.reviewReason).toBe("ai_refusal");
    expect(o.levels).toBeNull();
  });

  it("bands match the old single-axis math: 0.6 confidence is the auto boundary", () => {
    expect(resolveMediaOutcome(verdicts({ sex: { level: 1, confidence: 0.6 } }), DEFAULT_THRESHOLDS).classification).toBe("contains_women");
    expect(resolveMediaOutcome(verdicts({ sex: { level: 1, confidence: 0.59 } }), DEFAULT_THRESHOLDS).classification).toBe("pending_review");
  });
});
