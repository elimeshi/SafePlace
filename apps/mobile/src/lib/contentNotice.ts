import { CONTENT_GROUP_LABELS_HE, CONTENT_NOTICE_HE } from "@safeplace/shared-types";
import { CONTENT_GROUPS, type ContentGroup } from "@safeplace/visibility-policy";

/** The notice's details line: the found groups in CONTENT_GROUPS order, once each, joined with " · ". */
export function noticeDetailsText(groups: readonly ContentGroup[]): string {
  return CONTENT_GROUPS.filter((g) => groups.includes(g))
    .map((g) => CONTENT_GROUP_LABELS_HE[g])
    .join(" · ");
}

/** <UploaderNotice> copy: the shared-types strings verbatim, plus the details line for these groups. */
export function contentNoticeProps(groups: readonly ContentGroup[]) {
  return { message: CONTENT_NOTICE_HE.title, detailsLabel: CONTENT_NOTICE_HE.detailsLabel, details: noticeDetailsText(groups) };
}
