import { describe, expect, it } from "vitest";
import { resolveToggleStyle, TOGGLE_KNOB_START } from "../Toggle.styles";
import { theme } from "../../theme";

describe("resolveToggleStyle", () => {
  it("on uses the primary track color", () => {
    const s = resolveToggleStyle({ on: true, disabled: false });
    expect(s.track.backgroundColor).toBe(theme.colors.primary);
  });

  it("off uses the quiet ink300 track color", () => {
    const s = resolveToggleStyle({ on: false, disabled: false });
    expect(s.track.backgroundColor).toBe(theme.colors.ink300);
  });

  it("disabled halves track opacity regardless of on/off", () => {
    const on = resolveToggleStyle({ on: true, disabled: true });
    const off = resolveToggleStyle({ on: false, disabled: true });
    expect(on.track.opacity).toBe(0.5);
    expect(off.track.opacity).toBe(0.5);
  });

  it("enabled keeps full opacity", () => {
    const s = resolveToggleStyle({ on: true, disabled: false });
    expect(s.track.opacity).toBe(1);
  });

  it("track is a fully rounded pill", () => {
    const s = resolveToggleStyle({ on: true, disabled: false });
    expect(s.track.borderRadius).toBe(theme.radius.full);
  });

  it("knob is a white, fully rounded circle", () => {
    const s = resolveToggleStyle({ on: true, disabled: false });
    expect(s.knob.backgroundColor).toBe(theme.colors.white);
    expect(s.knob.borderRadius).toBe(theme.radius.full);
  });

  it("knob position is flow-relative (`start`), never left/right", () => {
    const on = resolveToggleStyle({ on: true, disabled: false });
    const off = resolveToggleStyle({ on: false, disabled: false });
    expect(on.knob).not.toHaveProperty("left");
    expect(on.knob).not.toHaveProperty("right");
    expect(off.knob).not.toHaveProperty("left");
    expect(off.knob).not.toHaveProperty("right");
    expect(on.knob.start).toBe(TOGGLE_KNOB_START.on);
    expect(off.knob.start).toBe(TOGGLE_KNOB_START.off);
  });

  it("on slides the knob closer to the start edge than off", () => {
    expect(TOGGLE_KNOB_START.on).toBeLessThan(TOGGLE_KNOB_START.off);
  });
});
