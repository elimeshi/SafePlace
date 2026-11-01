import { describe, expect, it } from "vitest";
import { CONTENT_GROUP_LABELS_HE, CONTENT_NOTICE_HE } from "@safeplace/shared-types";
// Deep import: the ui index pulls in react-native, which vitest cannot load; copy.ts is plain data.
import { contentCopy } from "@safeplace/ui/src/content/copy";
import { CONTENT_GROUPS, type ContentGroup } from "@safeplace/visibility-policy";
import { contentNoticeProps, noticeDetailsText } from "../contentNotice";

describe("content notice details line", () => {
  it("names the found groups in CONTENT_GROUPS order, once each, joined with ' · '", () => {
    expect(noticeDetailsText(["addictions", "sex", "violence", "sex"])).toBe("נשים · אלימות · התמכרויות");
  });
  it("a single group has no separator; none is empty", () => {
    expect(noticeDetailsText(["religion"])).toBe(CONTENT_GROUP_LABELS_HE.religion);
    expect(noticeDetailsText([])).toBe("");
  });
  it("every group has a label (the record is keyed by ContentGroup)", () => {
    const all: ContentGroup[] = [...CONTENT_GROUPS];
    expect(noticeDetailsText(all).split(" · ")).toEqual(all.map((g) => CONTENT_GROUP_LABELS_HE[g]));
  });
  it("the ui kit's default notice copy matches shared-types (ui cannot import it)", () => {
    expect(contentCopy.contentNotice).toBe(CONTENT_NOTICE_HE.title);
    expect(contentCopy.noticeDetails).toBe(CONTENT_NOTICE_HE.detailsLabel);
    expect(contentCopy.noticeConfirm).toBe(CONTENT_NOTICE_HE.confirmLabel);
    expect(contentCopy.noticeBack).toBe(CONTENT_NOTICE_HE.cancelLabel);
    expect(contentCopy.noticeAppeal).toBe(CONTENT_NOTICE_HE.appealLabel);
  });
  it("props carry the shared-types copy verbatim", () => {
    expect(contentNoticeProps(["sex"])).toEqual({ message: CONTENT_NOTICE_HE.title, detailsLabel: CONTENT_NOTICE_HE.detailsLabel, details: "נשים" });
  });
});
