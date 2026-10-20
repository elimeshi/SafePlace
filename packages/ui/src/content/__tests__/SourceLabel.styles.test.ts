import { describe, expect, it } from "vitest";
import { resolveSourceLabelStyle } from "../SourceLabel.styles";

describe("resolveSourceLabelStyle (lab .lbl)", () => {
  it("is a 22px pill with 9px padding, 5px gap, 12px/600 text", () => {
    const s = resolveSourceLabelStyle({ kind: "public" });
    expect(s.container.height).toBe(22);
    expect(s.container.paddingHorizontal).toBe(9);
    expect(s.container.gap).toBe(5);
    expect(s.container.borderRadius).toBe(999);
    expect(s.container.alignSelf).toBe("flex-start");
    expect(s.label.fontSize).toBe(12);
    expect(s.label.fontFamily).toBe("Assistant_600SemiBold");
    expect(s.iconSize).toBe(13);
  });

  it("public and followers share the neutral slate pair", () => {
    for (const kind of ["public", "followers"] as const) {
      const s = resolveSourceLabelStyle({ kind });
      expect(s.container.backgroundColor).toBe("#EEF1F6");
      expect(s.label.color).toBe("#5B6B85");
    }
  });

  it("suggested is amber on a warm tint", () => {
    const s = resolveSourceLabelStyle({ kind: "suggested" });
    expect(s.container.backgroundColor).toBe("#FEF3DC");
    expect(s.label.color).toBe("#A8650A");
  });

  it("group text/icon use the space colour; background is that colour at 14% over white", () => {
    const s = resolveSourceLabelStyle({ kind: "group", color: "#2E3A8C" });
    expect(s.label.color).toBe("#2E3A8C");
    expect(s.iconColor).toBe("#2E3A8C");
    expect(s.container.backgroundColor).toBe("rgb(226,227,239)");
  });

  it("family_space behaves like a group and falls back to primary", () => {
    const s = resolveSourceLabelStyle({ kind: "family_space" });
    expect(s.label.color).toBe("#2E3A8C");
  });
});
