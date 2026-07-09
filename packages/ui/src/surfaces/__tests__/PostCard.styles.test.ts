import { describe, expect, it } from "vitest";
import { postCardMediaMode, resolveCardStyle } from "../PostCard.styles";
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

describe("resolveCardStyle", () => {
  it("is a soft-framed white card", () => {
    const s = resolveCardStyle();
    expect(s.backgroundColor).toBe(theme.colors.white);
    expect(s.borderRadius).toBe(theme.radius.lg);
    expect(s.borderColor).toBe(theme.colors.border);
  });
});
