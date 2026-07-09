import { describe, expect, it } from "vitest";
import { resolveFieldStyle } from "../TextField.styles";
import { theme } from "../../theme";

describe("resolveFieldStyle", () => {
  it("resting field uses the neutral border", () => {
    const s = resolveFieldStyle({ focused: false, valid: false, hasValue: false });
    expect(s.wrapper.borderColor).toBe(theme.colors.border);
    expect(s.wrapper.borderWidth).toBe(1);
  });

  it("focused field uses the primary border, slightly thicker", () => {
    const s = resolveFieldStyle({ focused: true, valid: false, hasValue: false });
    expect(s.wrapper.borderColor).toBe(theme.colors.primary);
    expect(s.wrapper.borderWidth).toBe(1.5);
  });

  it("valid shows the success check", () => {
    const s = resolveFieldStyle({ focused: false, valid: true, hasValue: true });
    expect(s.showCheck).toBe(true);
  });

  it("not valid hides the check", () => {
    const s = resolveFieldStyle({ focused: false, valid: false, hasValue: true });
    expect(s.showCheck).toBe(false);
  });

  it("label floats (shrinks) when focused", () => {
    const rest = resolveFieldStyle({ focused: false, valid: false, hasValue: false });
    const focused = resolveFieldStyle({ focused: true, valid: false, hasValue: false });
    expect(focused.label.fontSize).toBe(theme.fontSize.xs);
    expect(rest.label.fontSize).toBe(theme.fontSize.base);
    expect(focused.label.fontSize).toBeLessThan(rest.label.fontSize as number);
  });

  it("label floats (shrinks) when it has a value, even unfocused", () => {
    const s = resolveFieldStyle({ focused: false, valid: false, hasValue: true });
    expect(s.label.fontSize).toBe(theme.fontSize.xs);
  });

  it("floated label takes the primary color only when also focused", () => {
    const floatedUnfocused = resolveFieldStyle({ focused: false, valid: false, hasValue: true });
    const floatedFocused = resolveFieldStyle({ focused: true, valid: false, hasValue: true });
    expect(floatedUnfocused.label.color).toBe(theme.colors.textSecondary);
    expect(floatedFocused.label.color).toBe(theme.colors.primary);
  });
});
