import { describe, expect, it } from "vitest";
import { staggerDelayForIndex } from "../stagger";

describe("staggerDelayForIndex", () => {
  it("gives the first element no delay", () => {
    expect(staggerDelayForIndex(0)).toBe(0);
  });

  it("uses ~100ms steps within the 80–120ms band", () => {
    const d = staggerDelayForIndex(2);
    expect(d).toBeGreaterThanOrEqual(160);
    expect(d).toBeLessThanOrEqual(240);
  });

  it("returns 0 for every index under reduced motion", () => {
    expect(staggerDelayForIndex(3, { reducedMotion: true })).toBe(0);
  });

  it("honors a custom step", () => {
    expect(staggerDelayForIndex(4, { stepMs: 50 })).toBe(200);
  });
});
