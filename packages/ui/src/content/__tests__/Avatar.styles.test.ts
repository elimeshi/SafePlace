import { describe, expect, it } from "vitest";
import {
  avatarFallbackInitial,
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

  it("returns an empty string when there is no name", () => {
    expect(avatarFallbackInitial("")).toBe("");
  });

  it("returns an empty string for a name that is only whitespace", () => {
    expect(avatarFallbackInitial("   ")).toBe("");
  });

  it("ignores leading whitespace", () => {
    expect(avatarFallbackInitial("  eli")).toBe("E");
  });
});

describe("resolveAvatarStyle", () => {
  it("shows a visible ring border in ringColor when ring is true", () => {
    const s = resolveAvatarStyle({ size: 44, ring: true, ringColor: theme.colors.accent });
    expect(s.outer.borderWidth).toBeGreaterThan(0);
    expect(s.outer.borderColor).toBe(theme.colors.accent);
  });

  it("has no visible border when ring is false", () => {
    const s = resolveAvatarStyle({ size: 44, ring: false, ringColor: theme.colors.primary });
    expect(s.outer.borderWidth).toBe(0);
    expect(s.outer.borderColor).toBe("transparent");
  });

  it("always renders a fully round image, regardless of ring", () => {
    const withRing = resolveAvatarStyle({ size: 44, ring: true, ringColor: theme.colors.primary });
    const withoutRing = resolveAvatarStyle({ size: 44, ring: false, ringColor: theme.colors.primary });
    expect(withRing.image.borderRadius).toBe(theme.radius.full);
    expect(withoutRing.image.borderRadius).toBe(theme.radius.full);
    expect(withRing.outer.borderRadius).toBe(theme.radius.full);
  });

  it("the outer circle always matches the requested size", () => {
    const s = resolveAvatarStyle({ size: 56, ring: true, ringColor: theme.colors.primary });
    expect(s.outer.width).toBe(56);
    expect(s.outer.height).toBe(56);
  });

  it("without a ring, the inner image fills the full size", () => {
    const s = resolveAvatarStyle({ size: 44, ring: false, ringColor: theme.colors.primary });
    expect(s.image.width).toBe(44);
    expect(avatarInnerSize(44, false)).toBe(44);
  });

  it("with a ring, the inner image shrinks to leave room for the border + gap", () => {
    const inner = avatarInnerSize(44, true);
    expect(inner).toBeLessThan(44);
    expect(inner).toBeGreaterThan(0);
  });
});
