import { describe, expect, it } from "vitest";
import { postCardMediaMode, resolveCardStyle, resolvePostCardParts } from "../PostCard.styles";
import { theme } from "../../theme";

describe("postCardMediaMode", () => {
  it("no media → none", () => {
    expect(postCardMediaMode({ hasMedia: false, filtered: false })).toBe("none");
    expect(postCardMediaMode({ hasMedia: false, filtered: true })).toBe("none");
  });
  it("media, not filtered → image", () => {
    expect(postCardMediaMode({ hasMedia: true, filtered: false })).toBe("image");
  });
  it("media, filtered → the placeholder (UI defense-in-depth)", () => {
    expect(postCardMediaMode({ hasMedia: true, filtered: true })).toBe("filtered");
  });
});

describe("resolveCardStyle (lab .card.soft)", () => {
  it("is a white radius-24 card with a shadow and NO border", () => {
    const s = resolveCardStyle();
    expect(s.backgroundColor).toBe(theme.colors.white);
    expect(s.borderRadius).toBe(24);
    expect(s.borderWidth).toBeUndefined();
    expect(s.boxShadow).toBe("0 2px 10px rgba(20,26,60,.07), 0 1px 3px rgba(20,26,60,.06)");
    expect(s.overflow).toBe("hidden");
  });
});

describe("resolvePostCardParts", () => {
  it("header: 11px gap, 15/16/10 padding; name Rubik 600 15, time Assistant 13", () => {
    const p = resolvePostCardParts();
    expect(p.header).toMatchObject({ gap: 11, paddingTop: 15, paddingHorizontal: 16, paddingBottom: 10 });
    expect(p.name).toMatchObject({ fontFamily: "Rubik_600SemiBold", fontSize: 15 });
    expect(p.time).toMatchObject({ fontFamily: "Assistant_400Regular", fontSize: 13 });
  });
  it("body is 16px at line-height 1.62", () => {
    const p = resolvePostCardParts();
    expect(p.body.fontSize).toBe(16);
    expect(p.body.lineHeight).toBeCloseTo(25.92);
  });
});
