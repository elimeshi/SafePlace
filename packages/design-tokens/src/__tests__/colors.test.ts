import { describe, expect, it } from "vitest";
import { colors, groupPalette } from "../colors";

describe("colors", () => {
  it("primary + accent match the locked brand", () => {
    expect(colors.primary).toBe("#2C5985");
    expect(colors.accent).toBe("#C97D4F");
  });

  it("exposes the full blue ramp", () => {
    expect(colors.blue900).toBe("#10263C");
    expect(colors.blue050).toBe("#F2F6FA");
  });

  it("exposes semantic status + feed-label tokens", () => {
    expect(colors.warning).toBe("#B7791F"); // settings danger zone
    expect(colors.suggestedLabel).toBe("#F59E0B");
    expect(colors.neutralLabel).toBe("#94A3B8");
  });

  it("keeps the flat semantic aliases wired to the ramp", () => {
    expect(colors.textPrimary).toBe(colors.ink900);
    expect(colors.background).toBe(colors.white);
  });
});

describe("groupPalette", () => {
  it("has the 12 locked colors (pre-defined, not free choice)", () => {
    expect(groupPalette).toHaveLength(12);
    expect(groupPalette[0]).toBe("#2C5985"); // matches primary
    expect(groupPalette[2]).toBe("#C97D4F"); // matches accent
  });
});
