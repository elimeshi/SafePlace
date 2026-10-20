import { describe, expect, it } from "vitest";
import {
  avatarFallbackInitial,
  avatarFontSize,
  avatarInnerSize,
  resolveAvatarStyle,
} from "../Avatar.styles";
import { theme } from "../../theme";

describe("avatarFallbackInitial", () => {
  it("returns the first Hebrew character as-is (Hebrew has no uppercase)", () => {
    expect(avatarFallbackInitial("שרה")).toBe("ש");
  });
  it("uppercases the first Latin character", () => {
    expect(avatarFallbackInitial("David")).toBe("D");
  });
  it("returns an empty string when there is no name or only whitespace", () => {
    expect(avatarFallbackInitial("")).toBe("");
    expect(avatarFallbackInitial("   ")).toBe("");
  });
  it("ignores leading whitespace", () => {
    expect(avatarFallbackInitial("  eli")).toBe("E");
  });
});

describe("resolveAvatarStyle (lab .av / .av.ring)", () => {
  it("is a blue100 disc of exactly `size`", () => {
    const s = resolveAvatarStyle({ size: 42, ring: false, ringColor: theme.colors.accent });
    expect(s.outer.width).toBe(42);
    expect(s.outer.height).toBe(42);
    expect(s.outer.borderRadius).toBe(theme.radius.full);
    expect(s.outer.backgroundColor).toBe(theme.colors.blue100);
    expect(s.outer.boxShadow).toBeUndefined();
  });

  it("paints the ring outside the disc: 2.5px surface gap then 5px ring", () => {
    const s = resolveAvatarStyle({ size: 56, ring: true, ringColor: theme.colors.accent });
    expect(s.outer.boxShadow).toBe(`0 0 0 2.5px ${theme.colors.surface}, 0 0 0 5px ${theme.colors.accent}`);
    expect(s.outer.width).toBe(56);
    expect(avatarInnerSize(56, true)).toBe(56);
  });

  it("initial is Rubik 600 at 0.42x the diameter in primary", () => {
    const s = resolveAvatarStyle({ size: 42, ring: false, ringColor: theme.colors.accent });
    expect(avatarFontSize(42)).toBe(18);
    expect(s.initial.fontSize).toBe(18);
    expect(s.initial.fontFamily).toBe(theme.fontFamily.displaySemibold);
    expect(s.initial.color).toBe(theme.colors.primary);
  });
});
