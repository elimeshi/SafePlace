import { describe, expect, it } from "vitest";
import { resolveMiniButtonStyle } from "../MiniButton.styles";
import { resolveStateStripStyle } from "../StateStrip.styles";
import { resolveFilteredStyle } from "../FilteredMedia.styles";
import { resolveUploaderNoticeStyle } from "../UploaderNotice.styles";
import { resolveQuoteStyle } from "../QuoteCard.styles";
import { contentCopy } from "../copy";

describe("MiniButton (lab .mini)", () => {
  it("primary is indigo with white Rubik 13", () => {
    const s = resolveMiniButtonStyle("primary");
    expect(s.container).toMatchObject({ backgroundColor: "#2E3A8C", borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12 });
    expect(s.label).toMatchObject({ color: "#FFFFFF", fontSize: 13, fontFamily: "Rubik_600SemiBold" });
  });
  it("secondary has a 1.5px #9AA4D8 border; ghost is borderless with 6px padding", () => {
    expect(resolveMiniButtonStyle("secondary").container).toMatchObject({ borderWidth: 1.5, borderColor: "#9AA4D8" });
    const g = resolveMiniButtonStyle("ghost");
    expect(g.container.borderWidth).toBeUndefined();
    expect(g.container.paddingHorizontal).toBe(6);
  });
});

describe("StateStrip (lab .state-strip)", () => {
  it("processing is cyan100 / cyan700 with a clock", () => {
    const s = resolveStateStripStyle("processing");
    expect(s.container.backgroundColor).toBe("#DBF4F8");
    expect(s.text.color).toBe("#157C8A");
    expect(s.iconName).toBe("clock");
  });
  it("review is the warm band #FBF3E2 / #8A5A12", () => {
    const s = resolveStateStripStyle("review");
    expect(s.container.backgroundColor).toBe("#FBF3E2");
    expect(s.text.color).toBe("#8A5A12");
  });
  it("notice stacks its actions under the text", () => {
    const s = resolveStateStripStyle("notice");
    expect(s.container.flexDirection).toBe("column");
    expect(s.container.alignItems).toBe("flex-start");
    expect(s.container.backgroundColor).toBe("#E5E8F7");
  });
});

describe("FilteredMedia (lab .ph-filter)", () => {
  it("centres a 38px eye disc over a 14.5px label, 6px apart, 30px side padding", () => {
    const s = resolveFilteredStyle(200);
    expect(s.container).toMatchObject({ height: 200, gap: 6, paddingHorizontal: 30 });
    expect(s.eye).toMatchObject({ width: 38, height: 38 });
    expect(s.label.fontSize).toBe(14.5);
  });
  it("default copy keeps the locked label and hint", () => {
    expect(contentCopy.filteredLabel).toBe("מדיה מסוננת לפי ההעדפות שלך");
    expect(contentCopy.filteredHint).toContain("העדפות הצריכה");
  });
});

describe("UploaderNotice (lab .notice)", () => {
  it("is a bordered, shadowed 18px card with the verbatim notice copy", () => {
    const s = resolveUploaderNoticeStyle();
    expect(s.container).toMatchObject({ borderRadius: 18, borderWidth: 1, borderColor: "#C4CBEC", gap: 10 });
    expect(contentCopy.womenDetectedNotice.startsWith("זוהו נשים במדיה שהעלית.")).toBe(true);
  });
});

describe("QuoteCard (lab .quote)", () => {
  it("is a bordered radius-18 inset card; gone variant is a padded row", () => {
    const s = resolveQuoteStyle();
    expect(s.container).toMatchObject({ borderRadius: 18, borderWidth: 1, marginHorizontal: 16, marginBottom: 14 });
    expect(s.gone).toMatchObject({ flexDirection: "row", padding: 14, gap: 8 });
  });
});
