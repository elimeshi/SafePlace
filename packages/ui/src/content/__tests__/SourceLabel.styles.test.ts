import { describe, expect, it } from "vitest";
import { resolveSourceLabelStyle } from "../SourceLabel.styles";
import { theme } from "../../theme";

describe("resolveSourceLabelStyle", () => {
  it("public uses the neutral label color", () => {
    const s = resolveSourceLabelStyle({ kind: "public" });
    expect(s.label.color).toBe(theme.colors.neutralLabel);
    expect(s.iconColor).toBe(theme.colors.neutralLabel);
  });

  it("suggested uses the warm amber suggested-label color", () => {
    const s = resolveSourceLabelStyle({ kind: "suggested" });
    expect(s.label.color).toBe(theme.colors.suggestedLabel);
    expect(s.iconColor).toBe(theme.colors.suggestedLabel);
  });

  it("group with a passed color uses that color at full saturation for text/icon", () => {
    const color = "#5B8C5A";
    const s = resolveSourceLabelStyle({ kind: "group", color });
    expect(s.iconColor).toBe(color);
    expect(s.label.color).toBe(color);
  });

  it("group background is a soft ~16% tint of the color, never full saturation", () => {
    const color = "#5B8C5A";
    const s = resolveSourceLabelStyle({ kind: "group", color });
    expect(s.container.backgroundColor).toBe(`${color}29`);
    expect(s.container.backgroundColor).not.toBe(color);
  });

  it("public and suggested backgrounds are also soft tints, not the flat color", () => {
    const pub = resolveSourceLabelStyle({ kind: "public" });
    const suggested = resolveSourceLabelStyle({ kind: "suggested" });
    expect(pub.container.backgroundColor).toBe(`${theme.colors.neutralLabel}29`);
    expect(suggested.container.backgroundColor).toBe(`${theme.colors.suggestedLabel}29`);
  });

  it("group without an explicit color falls back to a default, not undefined", () => {
    const s = resolveSourceLabelStyle({ kind: "group" });
    expect(s.iconColor).toBeTruthy();
    expect(s.label.color).toBe(s.iconColor);
  });

  it("uses radius.md for the pill shape", () => {
    const s = resolveSourceLabelStyle({ kind: "public" });
    expect(s.container.borderRadius).toBe(theme.radius.md);
  });
});
