import { describe, expect, it } from "vitest";
import {
  DEFAULT_THRESHOLDS,
  resolveClassificationFromBand,
  resolveConfidenceBand,
} from "../classification";

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
