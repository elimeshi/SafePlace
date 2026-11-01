import { describe, expect, it } from "vitest";
import { noticeGroupsFor, resolveUploaderMediaState } from "../rules";
import type { ContentLevels } from "../types";

const lv = (o: Partial<ContentLevels> = {}): ContentLevels => ({ sex: 0, violence: 0, religion: 0, addictions: 0, ...o });

describe("uploader notice (ADR 0018 §7)", () => {
  it("names every group at level ≥ 1; sex only for a male uploader (master spec §4.4.2 ⏳ preserved)", () => {
    expect(noticeGroupsFor(lv({ sex: 1, violence: 2 }), "male")).toEqual(["sex", "violence"]);
    expect(noticeGroupsFor(lv({ sex: 1, violence: 2 }), "female")).toEqual(["violence"]);
    expect(noticeGroupsFor(lv(), "male")).toEqual([]);
    expect(noticeGroupsFor(null, "male")).toEqual([]);
  });
  it("state is filtered_for_some_viewers exactly when the notice has groups", () => {
    expect(resolveUploaderMediaState("general", lv({ religion: 1 }), "female")).toBe("filtered_for_some_viewers");
    expect(resolveUploaderMediaState("contains_women", lv({ sex: 1 }), "female")).toBe("published");
    expect(resolveUploaderMediaState("contains_women", lv({ sex: 1 }), "male")).toBe("filtered_for_some_viewers");
    expect(resolveUploaderMediaState("pending_review", null, "male")).toBe("under_review");
    expect(resolveUploaderMediaState("unclassified", null, "male")).toBe("processing");
  });
});
