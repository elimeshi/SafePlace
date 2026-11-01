import { describe, expect, it } from "vitest";
import {
  CONTENT_GROUPS,
  DEFAULT_FILTER_SETTINGS,
  MAX_LEVEL_BY_GROUP,
  PROHIBITED_LEVEL,
  isContentLevels,
} from "../types";

describe("content groups", () => {
  it("lists the four groups in a stable order", () => {
    expect(CONTENT_GROUPS).toEqual(["sex", "violence", "religion", "addictions"]);
  });

  it("caps addictions at 2 and the rest at the prohibited level", () => {
    expect(MAX_LEVEL_BY_GROUP).toEqual({ sex: 3, violence: 3, religion: 3, addictions: 2 });
    expect(PROHIBITED_LEVEL).toBe(3);
  });

  it("defaults: only sex differs by gender; hideContentWithWomen mirrors sex === 0", () => {
    for (const gender of ["male", "female"] as const) {
      const s = DEFAULT_FILTER_SETTINGS[gender];
      expect(s.contentLevels.violence).toBe(0);
      expect(s.contentLevels.religion).toBe(0);
      expect(s.contentLevels.addictions).toBe(0);
      expect(s.hideContentWithWomen).toBe(s.contentLevels.sex === 0);
    }
    expect(DEFAULT_FILTER_SETTINGS.male.contentLevels.sex).toBe(0);
    expect(DEFAULT_FILTER_SETTINGS.female.contentLevels.sex).toBe(1);
  });

  it("isContentLevels accepts a full in-range record and nothing else", () => {
    expect(isContentLevels({ sex: 0, violence: 2, religion: 1, addictions: 2 })).toBe(true);
    expect(isContentLevels({ sex: 0, violence: 2, religion: 1 })).toBe(false);
    expect(isContentLevels({ sex: 0, violence: 2, religion: 1, addictions: 3 })).toBe(false);
    expect(isContentLevels(null)).toBe(false);
  });
});
