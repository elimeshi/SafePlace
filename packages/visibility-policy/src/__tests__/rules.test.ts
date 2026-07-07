import { describe, expect, it } from "vitest";
import {
  canDiscoverUserInSearch,
  canSendMessageRequest,
  canViewMedia,
  canViewProfilePhoto,
  resolveDefaultFilterSettings,
  viewerSatisfiesClassification,
  viewerSatisfiesExposure,
} from "../rules";
import type { FilterSettings, Viewer } from "../types";

function makeViewer(overrides: Partial<Viewer> = {}): Viewer {
  return {
    userId: "viewer-1",
    gender: "male",
    filterSettings: resolveDefaultFilterSettings("male"),
    groupMemberships: new Set(),
    familySpaceMemberships: new Set(),
    following: new Set(),
    ...overrides,
  };
}

describe("viewerSatisfiesExposure", () => {
  it("always allows public content", () => {
    expect(viewerSatisfiesExposure(makeViewer(), { kind: "public" })).toBe(
      true
    );
  });

  it("allows the author to see their own followers-only content", () => {
    const viewer = makeViewer({ userId: "author-1" });
    expect(
      viewerSatisfiesExposure(viewer, {
        kind: "followers_only",
        authorId: "author-1",
      })
    ).toBe(true);
  });

  it("blocks followers-only content for non-followers", () => {
    const viewer = makeViewer({ following: new Set(["someone-else"]) });
    expect(
      viewerSatisfiesExposure(viewer, {
        kind: "followers_only",
        authorId: "author-1",
      })
    ).toBe(false);
  });

  it("allows followers-only content for followers", () => {
    const viewer = makeViewer({ following: new Set(["author-1"]) });
    expect(
      viewerSatisfiesExposure(viewer, {
        kind: "followers_only",
        authorId: "author-1",
      })
    ).toBe(true);
  });

  it("requires group membership for group-exposed content", () => {
    const member = makeViewer({ groupMemberships: new Set(["group-1"]) });
    const nonMember = makeViewer({ groupMemberships: new Set() });
    expect(
      viewerSatisfiesExposure(member, { kind: "group", groupId: "group-1" })
    ).toBe(true);
    expect(
      viewerSatisfiesExposure(nonMember, {
        kind: "group",
        groupId: "group-1",
      })
    ).toBe(false);
  });

  it("requires family space membership for family-space-exposed content", () => {
    const member = makeViewer({
      familySpaceMemberships: new Set(["space-1"]),
    });
    const nonMember = makeViewer({ familySpaceMemberships: new Set() });
    expect(
      viewerSatisfiesExposure(member, {
        kind: "family_space",
        spaceId: "space-1",
      })
    ).toBe(true);
    expect(
      viewerSatisfiesExposure(nonMember, {
        kind: "family_space",
        spaceId: "space-1",
      })
    ).toBe(false);
  });
});

describe("viewerSatisfiesClassification", () => {
  it("always shows general content", () => {
    const viewer = makeViewer({
      filterSettings: { ...resolveDefaultFilterSettings("male") },
    });
    expect(viewerSatisfiesClassification(viewer, "general", false)).toBe(
      true
    );
  });

  it("always shows unclassified (processing) content", () => {
    const viewer = makeViewer();
    expect(
      viewerSatisfiesClassification(viewer, "unclassified", false)
    ).toBe(true);
  });

  it("hides pending_review content from everyone by default", () => {
    const viewer = makeViewer();
    expect(
      viewerSatisfiesClassification(viewer, "pending_review", false)
    ).toBe(false);
  });

  it("hides contains_women content from a viewer with the filter on", () => {
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        hideContentWithWomen: true,
      },
    });
    expect(
      viewerSatisfiesClassification(viewer, "contains_women", false)
    ).toBe(false);
  });

  it("shows contains_women content from a viewer with the filter off", () => {
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        hideContentWithWomen: false,
      },
    });
    expect(
      viewerSatisfiesClassification(viewer, "contains_women", false)
    ).toBe(true);
  });

  it("the Family Space exception lifts classification filtering entirely", () => {
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        hideContentWithWomen: true,
      },
    });
    expect(
      viewerSatisfiesClassification(viewer, "contains_women", true)
    ).toBe(true);
  });
});

describe("canViewMedia — both axes combined", () => {
  it("requires both exposure and classification to pass", () => {
    const filteredMaleViewer = makeViewer();
    // satisfies exposure (public) but not classification (filter on)
    expect(
      canViewMedia(filteredMaleViewer, {
        classification: "contains_women",
        exposure: { kind: "public" },
        isWithinViewersFamilySpace: false,
      })
    ).toBe(false);

    // satisfies classification (general) but not exposure (wrong group)
    expect(
      canViewMedia(filteredMaleViewer, {
        classification: "general",
        exposure: { kind: "group", groupId: "some-other-group" },
        isWithinViewersFamilySpace: false,
      })
    ).toBe(false);

    // satisfies both
    expect(
      canViewMedia(filteredMaleViewer, {
        classification: "general",
        exposure: { kind: "public" },
        isWithinViewersFamilySpace: false,
      })
    ).toBe(true);
  });
});

describe("canViewProfilePhoto", () => {
  it("respects filterAppliesToAvatars opt-out", () => {
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        hideContentWithWomen: true,
        filterAppliesToAvatars: false,
      },
    });
    expect(
      canViewProfilePhoto(viewer, { classification: "contains_women" })
    ).toBe(true);
  });

  it("filters avatars when filterAppliesToAvatars is on", () => {
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        hideContentWithWomen: true,
        filterAppliesToAvatars: true,
      },
    });
    expect(
      canViewProfilePhoto(viewer, { classification: "contains_women" })
    ).toBe(false);
  });
});

describe("canDiscoverUserInSearch", () => {
  it("defaults to cross-gender discoverable", () => {
    const viewer = makeViewer();
    expect(canDiscoverUserInSearch(viewer, "female")).toBe(true);
  });

  it("restricts to same gender when separation is opted in", () => {
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        genderSeparationInSearch: true,
      },
    });
    expect(canDiscoverUserInSearch(viewer, "female")).toBe(false);
    expect(canDiscoverUserInSearch(viewer, "male")).toBe(true);
  });
});

describe("canSendMessageRequest", () => {
  it("defaults to allowing cross-gender message requests", () => {
    const sender = makeViewer({ gender: "male" });
    const recipientSettings = resolveDefaultFilterSettings("female");
    expect(
      canSendMessageRequest(sender, "female", recipientSettings)
    ).toBe(true);
  });

  it("respects the recipient's gender-separation setting, not the sender's", () => {
    const sender = makeViewer({ gender: "male" });
    const recipientSettings: FilterSettings = {
      ...resolveDefaultFilterSettings("female"),
      genderSeparationInMessages: true,
    };
    expect(
      canSendMessageRequest(sender, "female", recipientSettings)
    ).toBe(false);
  });
});

describe("resolveDefaultFilterSettings", () => {
  it("defaults male accounts to filtered", () => {
    expect(resolveDefaultFilterSettings("male").hideContentWithWomen).toBe(
      true
    );
  });

  it("defaults female accounts to unfiltered", () => {
    expect(resolveDefaultFilterSettings("female").hideContentWithWomen).toBe(
      false
    );
  });

  it("returns a fresh object each call (no shared mutable state)", () => {
    const a = resolveDefaultFilterSettings("male");
    const b = resolveDefaultFilterSettings("male");
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
