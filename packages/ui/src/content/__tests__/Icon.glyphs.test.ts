import { describe, expect, it } from "vitest";
import { buildIconSvg, ICON_NAMES } from "../Icon.glyphs";

describe("Icon glyphs", () => {
  it("exposes the curated set", () => {
    expect(ICON_NAMES).toContain("home");
    expect(ICON_NAMES).toContain("eye");
    expect(ICON_NAMES).toContain("shield-check");
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(20);
  });

  it("builds a 24-viewBox svg that tints via currentColor", () => {
    const svg = buildIconSvg("home", { size: 24, strokeWidth: 2 });
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain("<path"); // the home glyph markup
  });

  it("carries the requested size and stroke width", () => {
    const svg = buildIconSvg("check", { size: 20, strokeWidth: 2.5 });
    expect(svg).toContain('width="20"');
    expect(svg).toContain('stroke-width="2.5"');
  });
});
