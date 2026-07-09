import { describe, expect, it } from "vitest";
import { resolveButtonStyle } from "../Button.styles";
import { theme } from "../../theme";

describe("resolveButtonStyle", () => {
  it("primary rest uses deep blue bg + white text", () => {
    const s = resolveButtonStyle({ variant: "primary", size: "md", state: "rest", disabled: false });
    expect(s.container.backgroundColor).toBe(theme.colors.primary);
    expect(s.label.color).toBe(theme.colors.textOnPrimary);
  });

  it("cta uses the one warm terracotta accent", () => {
    const s = resolveButtonStyle({ variant: "cta", size: "md", state: "rest", disabled: false });
    expect(s.container.backgroundColor).toBe(theme.colors.accent);
  });

  it("pressed primary darkens one step", () => {
    const s = resolveButtonStyle({ variant: "primary", size: "md", state: "pressed", disabled: false });
    expect(s.container.backgroundColor).toBe(theme.colors.primaryDark);
  });

  it("disabled halves opacity regardless of variant", () => {
    const s = resolveButtonStyle({ variant: "cta", size: "md", state: "rest", disabled: true });
    expect(s.container.opacity).toBe(0.5);
  });

  it("md size meets a 44pt touch target", () => {
    const s = resolveButtonStyle({ variant: "primary", size: "md", state: "rest", disabled: false });
    expect(s.container.minHeight).toBeGreaterThanOrEqual(44);
  });

  it("secondary carries a visible border; ghost does not", () => {
    const sec = resolveButtonStyle({ variant: "secondary", size: "md", state: "rest", disabled: false });
    const ghost = resolveButtonStyle({ variant: "ghost", size: "md", state: "rest", disabled: false });
    expect(sec.container.borderColor).toBe(theme.colors.borderStrong);
    expect(ghost.container.borderColor).toBe("transparent");
  });
});
