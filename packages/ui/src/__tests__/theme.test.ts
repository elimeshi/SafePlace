import { describe, expect, it } from "vitest";
import { theme } from "../theme";

describe("theme bridge", () => {
  it("exposes the token groups RN components consume", () => {
    expect(theme.colors.primary).toBe("#2C5985");
    expect(theme.typeRole.body.fontSize).toBe(16);
    expect(theme.radius.xl).toBe(22);
    expect(theme.elevation.card.elevation).toBeGreaterThan(0);
    expect(theme.motion.pressScale).toBe(0.97);
    expect(theme.tracking.tight).toBeCloseTo(-0.16);
  });
});
