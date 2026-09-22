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

  it("styling is a pure function of selection state — symmetric across genders", () => {
    // The door style depends only on `selected`, never on which value it is,
    // so both gender options get an identical mechanism (invariant #4). The
    // border thickens on selection (lab 1.5→2px), applied equally to whichever
    // door is chosen; radius stays constant so there is no layout shift.
    const selected = resolveDoorStyle({ selected: true });
    const unselected = resolveDoorStyle({ selected: false });
    expect(selected.container.borderRadius).toBe(unselected.container.borderRadius);
    expect(selected.container.borderRadius).toBe(theme.radius.lg);
    expect(selected.container.minHeight).toBe(unselected.container.minHeight);
  });

  it("meets the locked door height from the reference (7u ≈ 64pt)", () => {
    const s = resolveDoorStyle({ selected: false });
    expect(s.container.minHeight).toBeGreaterThanOrEqual(64);
  });

  it("label uses the Rubik display face at the lab door size (1.02·fs)", () => {
    const s = resolveDoorStyle({ selected: false });
    expect(s.label.fontFamily).toBe(theme.fontFamily.display);
    expect(s.label.fontSize).toBeCloseTo(16.3);
  });

  it("onGlass door is translucent with white label; selected fills white", () => {
    const unselected = resolveDoorStyle({ selected: false, onGlass: true });
    const selected = resolveDoorStyle({ selected: true, onGlass: true });
    expect(unselected.label.color).toBe(theme.colors.white);
    expect(selected.label.color).toBe(theme.colors.primary);
  });
});

describe("resolveGenderChoiceRowStyle", () => {
  it("lays out doors in a row so RTL mirrors automatically", () => {
    const row = resolveGenderChoiceRowStyle();
    expect(row.flexDirection).toBe("row");
    expect(row.gap).toBe(13);
  });
});
