import { describe, expect, it } from "vitest";
import { CONTENT_GROUP_LABELS_HE, CONTENT_NOTICE_HE } from "@safeplace/shared-types";
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
  it("props carry the shared-types copy verbatim", () => {
    expect(contentNoticeProps(["sex"])).toEqual({ message: CONTENT_NOTICE_HE.title, detailsLabel: CONTENT_NOTICE_HE.detailsLabel, details: "נשים" });
  });
});
