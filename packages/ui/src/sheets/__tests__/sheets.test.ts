import { describe, expect, it } from "vitest";
import { resolveSheetControlStyle, resolveSheetRowStyle, resolveSheetStyle } from "../Sheet.styles";
import { resolveToggleStyle } from "../../forms/Toggle.styles";
import { resolveActionButtonStyle } from "../../primitives/ActionButton.styles";
import { resolveToastStyle } from "../../feedback/Toast.styles";
import { EMPTY_VARIANTS, resolveEmptyStateStyle } from "../../feedback/EmptyState.styles";
import { SHIMMER_GRADIENT, shimmerTranslate } from "../../feedback/Skeleton.styles";
import { sheetCopy } from "../copy";
import { feedbackCopy } from "../../feedback/copy";

describe("sheet shell (lab .sheet)", () => {
  const s = resolveSheetStyle();
  it("24px top radius, grab handle 40x5, scrim 38%", () => {
    expect(s.sheet).toMatchObject({ borderTopStartRadius: 24, borderTopEndRadius: 24, paddingTop: 8, paddingBottom: 26 });
    expect(s.grab).toMatchObject({ width: 40, height: 5, marginTop: 2, marginBottom: 10 });
    expect(s.scrim.backgroundColor).toBe("rgba(16,26,58,.38)");
  });
  it("flow-relative anchoring only (no left/right)", () => {
    for (const style of [s.scrim, s.sheet]) {
      expect(style).not.toHaveProperty("left");
      expect(style).not.toHaveProperty("right");
    }
  });
});

describe("sheet rows (lab .srow)", () => {
  it("13px gap, 13/20 padding, disabled at .45, selected on the ground", () => {
    expect(resolveSheetRowStyle({}).row).toMatchObject({ gap: 13, paddingVertical: 13, paddingHorizontal: 20, opacity: 1 });
    expect(resolveSheetRowStyle({ disabled: true }).row.opacity).toBe(0.45);
    expect(resolveSheetRowStyle({ selected: true }).row.backgroundColor).toBe("#F3F5FC");
    expect(resolveSheetRowStyle({ dense: true }).row.paddingVertical).toBe(10);
  });
  it("checkbox 22px radius 7; radio 22px with an 11px dot", () => {
    expect(resolveSheetControlStyle("checkbox", true).box).toMatchObject({ width: 22, borderRadius: 7, backgroundColor: "#2E3A8C" });
    expect(resolveSheetControlStyle("checkbox", false).box.backgroundColor).toBe("#FFFFFF");
    expect(resolveSheetControlStyle("radio", true).dot).toMatchObject({ width: 11, height: 11 });
  });
  it("sheet toggle uses the quiet border track off", () => {
    expect(resolveToggleStyle({ on: false, disabled: false, sheet: true }).track.backgroundColor).toBe("#DCE1F2");
    expect(resolveToggleStyle({ on: false, disabled: false }).track.backgroundColor).toBe("#B9C0DB");
  });
});

describe("ActionButton (lab .cta)", () => {
  it("primary has the CTA shadow; secondary has a 1.5px #9AA4D8 border and none", () => {
    expect(resolveActionButtonStyle("primary").container).toMatchObject({ borderRadius: 18, paddingVertical: 14, paddingHorizontal: 26 });
    expect(resolveActionButtonStyle("primary").container.boxShadow).toBe("0 12px 26px -10px rgba(46,58,140,.6)");
    expect(resolveActionButtonStyle("secondary").container).toMatchObject({ borderWidth: 1.5, borderColor: "#9AA4D8" });
    expect(resolveActionButtonStyle("secondary").container.boxShadow).toBeUndefined();
  });
});

describe("Toast / EmptyState / Skeleton", () => {
  it("toast: 18px gutters, 96px up, primaryDark, radius 14", () => {
    const t = resolveToastStyle(96).container;
    expect(t).toMatchObject({ start: 18, end: 18, bottom: 96, backgroundColor: "#1B2352", borderRadius: 14 });
  });
  it("empty state anatomy per variant", () => {
    expect(EMPTY_VARIANTS.error).toMatchObject({ icon: "wifi-off", paddingTop: 120, actionVariant: "secondary" });
    expect(EMPTY_VARIANTS.comingSoon.paddingTop).toBe(110);
    const s = resolveEmptyStateStyle(40);
    expect(s.disc).toMatchObject({ width: 64, height: 64 });
    expect(s.title).toMatchObject({ fontSize: 19, marginTop: 6 });
  });
  it("skeleton shimmer: 90deg, three stops, ground slides -W to +W", () => {
    expect(SHIMMER_GRADIENT.angle).toBe(90);
    expect(SHIMMER_GRADIENT.stops.map((x) => x[1])).toEqual([0, 0.4, 0.8]);
    expect(shimmerTranslate(120)).toEqual({ from: -120, to: 120 });
  });
});

describe("copy", () => {
  it("report copy is the six spec categories, verbatim", () => {
    expect(sheetCopy.report.categories).toEqual(["תוכן הכולל נשים", "הטרדה / איומים", "תוכן מסוכן", "ספאם / פרסומי", "מידע שגוי", "אחר"]);
    expect(feedbackCopy.reportSent).toBe("הדיווח התקבל ויטופל בהקדם");
  });
  it("plus menu: post live, status says soon", () => {
    expect(sheetCopy.plusMenu.soon).toBe("בקרוב");
    expect(sheetCopy.postMenu.dontSuggest("יעקב")).toBe("אל תציע לי את יעקב");
  });
});
