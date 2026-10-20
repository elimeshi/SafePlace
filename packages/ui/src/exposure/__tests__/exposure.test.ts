import { describe, expect, it } from "vitest";
import { isAudienceSetValid, type ContentAudience } from "@safeplace/visibility-policy";
import { applyAudienceToggle, hasAudience, isAudienceTogglable, isSelectionValid } from "../audience";
import { exposureSummary, type SpaceOption } from "../summary";
import { resolveExposureChipStyle } from "../ExposureChip.styles";

const PUBLIC: ContentAudience = { kind: "public" };
const FOLLOWERS: ContentAudience = { kind: "followers_only", authorId: "me" };
const G1: ContentAudience = { kind: "group", groupId: "g1" };
const G2: ContentAudience = { kind: "group", groupId: "g2" };
const F1: ContentAudience = { kind: "family_space", spaceId: "f1" };
const F2: ContentAudience = { kind: "family_space", spaceId: "f2" };

describe("applyAudienceToggle — every outcome is policy-valid", () => {
  it("adds a group to followers", () => {
    expect(applyAudienceToggle([FOLLOWERS], G1)).toEqual([FOLLOWERS, G1]);
  });
  it("ticking public clears the rest", () => {
    expect(applyAudienceToggle([FOLLOWERS, G1], PUBLIC)).toEqual([PUBLIC]);
  });
  it("ticking anything else unticks public", () => {
    expect(applyAudienceToggle([PUBLIC], G1)).toEqual([G1]);
  });
  it("unticks an audience that is selected", () => {
    expect(applyAudienceToggle([FOLLOWERS, G1, G2], G1)).toEqual([FOLLOWERS, G2]);
  });
  it("several Family Spaces together are fine", () => {
    expect(applyAudienceToggle([F1], F2)).toEqual([F1, F2]);
  });
  it("a Family Space against a non-family audience is rejected (null) in both directions", () => {
    expect(applyAudienceToggle([FOLLOWERS, G1], F1)).toBeNull();
    expect(applyAudienceToggle([F1], G1)).toBeNull();
    expect(applyAudienceToggle([F1], FOLLOWERS)).toBeNull();
  });
  it("never returns a set the policy rejects", () => {
    const all = [PUBLIC, FOLLOWERS, G1, G2, F1, F2];
    for (const start of [[], [PUBLIC], [FOLLOWERS], [G1, G2], [F1], [F1, F2], [FOLLOWERS, G1]] as ContentAudience[][]) {
      for (const a of all) {
        const next = applyAudienceToggle(start, a);
        if (next && next.length > 0) expect(isAudienceSetValid(next)).toBe(true);
      }
    }
  });
});

describe("selection helpers", () => {
  it("disables rows the policy would reject", () => {
    expect(isAudienceTogglable([FOLLOWERS, G1], F1)).toBe(false);
    expect(isAudienceTogglable([FOLLOWERS, G1], G2)).toBe(true);
    expect(isAudienceTogglable([FOLLOWERS], PUBLIC)).toBe(true);
  });
  it("hasAudience matches by id", () => {
    expect(hasAudience([G1], G1)).toBe(true);
    expect(hasAudience([G1], G2)).toBe(false);
  });
  it("an empty selection is not publishable", () => expect(isSelectionValid([])).toBe(false));
});

describe("exposureSummary", () => {
  const names = {
    groups: [{ id: "g1", name: "שכונת רמות", members: 1 }, { id: "g2", name: "גמ״ח ספרים", members: 1 }] as SpaceOption[],
    familySpaces: [{ id: "f1", name: "משפחת מזרחי", members: 5 }] as SpaceOption[],
  };
  it("public", () => expect(exposureSummary([PUBLIC], names)).toEqual({ label: "ציבורי", icon: "globe" }));
  it("followers + 2 groups (the lab chip)", () =>
    expect(exposureSummary([FOLLOWERS, G1, G2], names)).toEqual({ label: "עוקבים + 2 קבוצות", icon: "users" }));
  it("a single group is named", () => expect(exposureSummary([G1], names).label).toBe("שכונת רמות"));
  it("a Family Space gets the house", () => expect(exposureSummary([F1], names)).toEqual({ label: "משפחת מזרחי", icon: "family" }));
});

describe("ExposureChip (lab .expo)", () => {
  it("unlocked: blue100 pill, 30px", () => {
    const s = resolveExposureChipStyle(false);
    expect(s.chip).toMatchObject({ height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#E5E8F7", gap: 6 });
    expect(s.text.fontSize).toBe(13);
  });
  it("locked: neutral fill with a hairline", () => {
    const s = resolveExposureChipStyle(true);
    expect(s.chip).toMatchObject({ backgroundColor: "#F3F5FC", borderWidth: 1, borderColor: "#DCE1F2" });
    expect(s.color).toBe("#2E3760");
  });
});
