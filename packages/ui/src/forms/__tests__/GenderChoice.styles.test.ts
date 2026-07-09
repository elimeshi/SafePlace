import { describe, expect, it } from "vitest";
import { resolveDoorStyle, resolveGenderChoiceRowStyle } from "../GenderChoice.styles";
import { theme } from "../../theme";

describe("resolveDoorStyle", () => {
  it("selected door uses the primary border + blue-050 fill + primary text", () => {
    const s = resolveDoorStyle({ selected: true });
    expect(s.container.borderColor).toBe(theme.colors.primary);
    expect(s.container.backgroundColor).toBe(theme.colors.blue050);
    expect(s.label.color).toBe(theme.colors.primary);
  });

  it("unselected door uses the neutral border + white fill + primary text color", () => {
    const s = resolveDoorStyle({ selected: false });
    expect(s.container.borderColor).toBe(theme.colors.border);
    expect(s.container.backgroundColor).toBe(theme.colors.white);
    expect(s.label.color).toBe(theme.colors.textPrimary);
  });

  it("both doors carry the same border width and radius — fully symmetric mechanism", () => {
    const selected = resolveDoorStyle({ selected: true });
    const unselected = resolveDoorStyle({ selected: false });
    expect(selected.container.borderWidth).toBe(unselected.container.borderWidth);
    expect(selected.container.borderRadius).toBe(unselected.container.borderRadius);
    expect(selected.container.borderRadius).toBe(theme.radius.lg);
  });

  it("meets the 108pt minimum door height from the reference", () => {
    const s = resolveDoorStyle({ selected: false });
    expect(s.container.minHeight).toBeGreaterThanOrEqual(108);
  });

  it("label uses the semibold display-ish size", () => {
    const s = resolveDoorStyle({ selected: false });
    expect(s.label.fontFamily).toBe(theme.fontFamily.semibold);
    expect(s.label.fontSize).toBe(theme.fontSize.xl);
  });
});

describe("resolveGenderChoiceRowStyle", () => {
  it("lays out doors in a row so RTL mirrors automatically", () => {
    const row = resolveGenderChoiceRowStyle();
    expect(row.flexDirection).toBe("row");
    expect(row.gap).toBe(theme.spacing.md);
  });
});
