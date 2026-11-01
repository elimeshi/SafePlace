import { describe, expect, it } from "vitest";
import { detailsChevronName, detailsMotion, resolveNoticeDetailsStyle } from "../NoticeDetails.styles";
import { resolveMiniButtonStyle } from "../MiniButton.styles";
import { contentCopy } from "../copy";

describe("NoticeDetails (the notice's 'what was found?' line)", () => {
  it("collapsed chevron points forward along the reading direction, so it mirrors in RTL", () => {
    expect(detailsChevronName(false, "rtl")).toBe("chevron-left");
    expect(detailsChevronName(false, "ltr")).toBe("chevron-right");
  });
  it("expanded chevron points down in both directions", () => {
    expect(detailsChevronName(true, "rtl")).toBe("chevron-down");
    expect(detailsChevronName(true, "ltr")).toBe("chevron-down");
  });
  it("reduced motion: no height tween", () => {
    expect(detailsMotion(true)).toEqual({ animateHeight: false, ms: 0 });
    expect(detailsMotion(false)).toEqual({ animateHeight: true, ms: 200 });
  });
  it("toggle is a flow-relative row (mirrors under RTL) in the secondary MiniButton label style", () => {
    const s = resolveNoticeDetailsStyle();
    expect(s.toggle).toMatchObject({ flexDirection: "row", alignSelf: "flex-start" });
    expect(s.label).toEqual(resolveMiniButtonStyle("secondary").label);
    expect(s.chevronColor).toBe(s.label.color);
  });
  it("default label is the shared-types detailsLabel", () => {
    expect(contentCopy.noticeDetails).toBe("מה זוהה?");
  });
});
