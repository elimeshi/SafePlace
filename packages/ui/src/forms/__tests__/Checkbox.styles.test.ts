import { describe, expect, it } from "vitest";
import { resolveCheckboxStyle } from "../Checkbox.styles";
import { theme } from "../../theme";

describe("resolveCheckboxStyle", () => {
  it("checked fills the box with the primary color", () => {
    const s = resolveCheckboxStyle({ checked: true });
    expect(s.box.backgroundColor).toBe(theme.colors.primary);
  });

  it("unchecked uses a white box with a strong border", () => {
    const s = resolveCheckboxStyle({ checked: false });
    expect(s.box.borderColor).toBe(theme.colors.borderStrong);
    expect(s.box.backgroundColor).toBe(theme.colors.white);
  });

  it("checked border matches the fill color", () => {
    const s = resolveCheckboxStyle({ checked: true });
    expect(s.box.borderColor).toBe(theme.colors.primary);
  });

  it("border width is 1.5px in both states", () => {
    expect(resolveCheckboxStyle({ checked: true }).box.borderWidth).toBe(1.5);
    expect(resolveCheckboxStyle({ checked: false }).box.borderWidth).toBe(1.5);
  });

  it("box is a small square between 20 and 22px", () => {
    const s = resolveCheckboxStyle({ checked: false });
    expect(s.box.width).toBe(s.box.height);
    expect(s.box.width as number).toBeGreaterThanOrEqual(20);
    expect(s.box.width as number).toBeLessThanOrEqual(22);
  });

  it("flags an unchecked box on error (default: danger border, thicker)", () => {
    const s = resolveCheckboxStyle({ checked: false, error: true });
    expect(s.box.borderColor).toBe(theme.colors.danger);
    expect(s.box.borderWidth).toBe(2);
  });

  it("error is ignored once the box is checked", () => {
    const s = resolveCheckboxStyle({ checked: true, error: true });
    expect(s.box.borderColor).toBe(theme.colors.primary);
    expect(s.box.borderWidth).toBe(1.5);
  });

  it("on glass, an error border uses a light red (readable on the dark card)", () => {
    const s = resolveCheckboxStyle({ checked: false, onGlass: true, error: true });
    expect(s.box.borderColor).toBe("#FF8792");
    expect(s.box.borderWidth).toBe(2);
  });
});
