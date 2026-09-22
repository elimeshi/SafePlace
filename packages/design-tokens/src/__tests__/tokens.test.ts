import { describe, expect, it } from "vitest";
import { fontFamily, fontSize, tracking, typeRole } from "../typography";
import { radius } from "../spacing";
import { elevation } from "../elevation";

describe("typography", () => {
  it("uses Assistant as the numeric companion family", () => {
    expect(fontFamily.numeric).toBe("Assistant_400Regular");
  });

  it("adds the 4xl onboarding display size", () => {
    expect(fontSize["4xl"]).toBe(38);
  });

  it("exposes near-zero Hebrew tracking in px", () => {
    expect(tracking.tight).toBeCloseTo(-0.16); // -0.01em * 16
    expect(tracking.normal).toBe(0);
  });

  it("exposes a semantic display type role", () => {
    expect(typeRole.display.fontSize).toBe(38);
    expect(typeRole.display.fontFamily).toBe("Rubik_700Bold");
  });
});

describe("radius", () => {
  it("adds the large glass-card xl radius", () => {
    expect(radius.xl).toBe(24);
  });
});

describe("elevation", () => {
  it("card shadow is blue-tinted and RN-shaped", () => {
    expect(elevation.card.shadowColor).toBe("#10263C");
    expect(elevation.card.elevation).toBeGreaterThan(0);
    expect(elevation.card.shadowOffset).toEqual({ width: 0, height: 4 });
  });
});
