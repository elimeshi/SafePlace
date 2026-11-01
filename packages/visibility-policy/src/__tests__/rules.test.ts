import { describe, expect, it } from "vitest";
import {
  canDiscoverUserInSearch,
  canViewFamilySpaceMemberCount,
  canSendMessageRequest,
  canViewMedia,
  canViewProfilePhoto,
  resolveDefaultFilterSettings,
  resolveUploaderMediaState,
  viewerSatisfiesClassification,
  viewerSatisfiesExposure,
} from "../rules";
import type { ContentAudience, ContentLevels, FilterSettings, Viewer } from "../types";

function makeViewer(overrides: Partial<Viewer> = {}): Viewer {
  return {
    userId: "viewer-1",
    gender: "male",
    filterSettings: resolveDefaultFilterSettings("male"),
    groupMemberships: new Set(),
    familySpaceMemberships: new Set(),
    following: new Set(),
    blockedUsers: new Set(),
    mutedUsers: new Set(),
    suppressedSuggestions: new Set(),
    ...overrides,
  };
}

/** A male-default viewer with filter overrides; the derived flag follows contentLevels.sex. */
function viewer(over: Partial<FilterSettings> = {}): Viewer {
  const fs = { ...resolveDefaultFilterSettings("male"), ...over };
  return makeViewer({ filterSettings: { ...fs, hideContentWithWomen: fs.contentLevels.sex === 0 } });
}

const lv = (over: Partial<ContentLevels> = {}): ContentLevels => ({ sex: 0, violence: 0, religion: 0, addictions: 0, ...over });
/** contentLevels with only the sex maximum changed (the old hideContentWithWomen toggle). */
const sexMax = (sex: 0 | 1) => ({ ...resolveDefaultFilterSettings("male").contentLevels, sex });

/** Single-audience shorthand for the original per-kind exposure cases. */
const satisfies = (v: Viewer, a: ContentAudience) =>
  viewerSatisfiesExposure(v, [a]);

describe("viewerSatisfiesExposure", () => {
  it("always allows public content", () => {
    expect(satisfies(makeViewer(), { kind: "public" })).toBe(
      true
    );
  });

  it("allows the author to see their own followers-only content", () => {
    const viewer = makeViewer({ userId: "author-1" });
    expect(
      satisfies(viewer, {
        kind: "followers_only",
        authorId: "author-1",
      })
    ).toBe(true);
  });

  it("blocks followers-only content for non-followers", () => {
    const viewer = makeViewer({ following: new Set(["someone-else"]) });
    expect(
      satisfies(viewer, {
        kind: "followers_only",
        authorId: "author-1",
      })
    ).toBe(false);
  });

  it("allows followers-only content for followers", () => {
    const viewer = makeViewer({ following: new Set(["author-1"]) });
    expect(
      satisfies(viewer, {
        kind: "followers_only",
        authorId: "author-1",
      })
    ).toBe(true);
  });

  it("requires group membership for group-exposed content", () => {
    const member = makeViewer({ groupMemberships: new Set(["group-1"]) });
    const nonMember = makeViewer({ groupMemberships: new Set() });
    expect(
      satisfies(member, { kind: "group", groupId: "group-1" })
    ).toBe(true);
    expect(
      satisfies(nonMember, {
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
      satisfies(member, {
        kind: "family_space",
        spaceId: "space-1",
      })
    ).toBe(true);
    expect(
      satisfies(nonMember, {
        kind: "family_space",
        spaceId: "space-1",
      })
    ).toBe(false);
  });
});

describe("viewerSatisfiesClassification", () => {
  it("always shows general content with every level at 0", () => {
    expect(viewerSatisfiesClassification(viewer(), { classification: "general", levels: lv() }, false)).toBe(true);
  });

  it("withholds unclassified content from everyone but the uploader", () => {
    // Fail closed while the pipeline has not yet resolved the item: an
    // async classifier means there is a window between upload and the
    // worker's write, and serving the original during that window would
    // show filtered viewers exactly the media the filter exists to
    // withhold. The row stays visible (so the UI can render "processing"),
    // only the underlying reference is withheld — the uploader's own view
    // is granted by canViewMedia's uploader short-circuit.
    expect(viewerSatisfiesClassification(viewer(), { classification: "unclassified", levels: null }, false)).toBe(false);
  });

  it("withholds unclassified content even from a viewer with the filter off", () => {
    // Not a filter decision — nobody can know what the item contains yet.
    const v = viewer({ contentLevels: sexMax(1) });
    expect(viewerSatisfiesClassification(v, { classification: "unclassified", levels: null }, false)).toBe(false);
  });

  it("hides pending_review content from everyone by default", () => {
    expect(viewerSatisfiesClassification(viewer(), { classification: "pending_review", levels: null }, false)).toBe(false);
  });

  it("hides contains_women content from a viewer with the filter on", () => {
    const v = viewer({ contentLevels: sexMax(0) });
    expect(viewerSatisfiesClassification(v, { classification: "contains_women", levels: lv({ sex: 1 }) }, false)).toBe(false);
  });

  it("shows contains_women content from a viewer with the filter off", () => {
    const v = viewer({ contentLevels: sexMax(1) });
    expect(viewerSatisfiesClassification(v, { classification: "contains_women", levels: lv({ sex: 1 }) }, false)).toBe(true);
  });

  it("the Family Space exception lifts the women filter", () => {
    const v = viewer({ contentLevels: sexMax(0) });
    expect(viewerSatisfiesClassification(v, { classification: "contains_women", levels: lv({ sex: 1 }) }, true)).toBe(true);
  });
});

describe("canViewMedia — both axes combined", () => {
  it("requires both exposure and classification to pass", () => {
    const filteredMaleViewer = makeViewer();
    // satisfies exposure (public) but not classification (filter on)
    expect(
      canViewMedia(filteredMaleViewer, {
        classification: "contains_women",
        levels: lv({ sex: 1 }),
        exposure: [{ kind: "public" }],
        isWithinViewersFamilySpace: false,
        uploaderId: "author-1",
      })
    ).toBe(false);

    // satisfies classification (general) but not exposure (wrong group)
    expect(
      canViewMedia(filteredMaleViewer, {
        classification: "general",
        levels: lv(),
        exposure: [{ kind: "group", groupId: "some-other-group" }],
        isWithinViewersFamilySpace: false,
        uploaderId: "author-1",
      })
    ).toBe(false);

    // satisfies both
    expect(
      canViewMedia(filteredMaleViewer, {
        classification: "general",
        levels: lv(),
        exposure: [{ kind: "public" }],
        isWithinViewersFamilySpace: false,
        uploaderId: "author-1",
      })
    ).toBe(true);
  });
});

describe("the uploader always sees their own content", () => {
  it("shows the uploader their own contains_women media even with their filter on", () => {
    const viewer = makeViewer({
      userId: "me",
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        contentLevels: sexMax(0),
      },
    });
    expect(
      canViewMedia(viewer, {
        classification: "contains_women",
        levels: lv({ sex: 1 }),
        exposure: [{ kind: "public" }],
        isWithinViewersFamilySpace: false,
        uploaderId: "me",
      })
    ).toBe(true);
  });

  it("shows the uploader their own frozen (pending_review) media", () => {
    const viewer = makeViewer({ userId: "me" });
    expect(
      canViewMedia(viewer, {
        classification: "pending_review",
        levels: null,
        exposure: [{ kind: "public" }],
        isWithinViewersFamilySpace: false,
        uploaderId: "me",
      })
    ).toBe(true);
  });

  it("still filters the SAME media for a non-uploader with the filter on", () => {
    const viewer = makeViewer({
      userId: "someone-else",
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        contentLevels: sexMax(0),
      },
    });
    expect(
      canViewMedia(viewer, {
        classification: "contains_women",
        levels: lv({ sex: 1 }),
        exposure: [{ kind: "public" }],
        isWithinViewersFamilySpace: false,
        uploaderId: "me",
      })
    ).toBe(false);
  });
});

describe("canViewMedia — unclassified (pipeline in flight)", () => {
  const unclassifiedPost = {
    classification: "unclassified" as const,
    levels: null,
    exposure: [{ kind: "public" }] as const,
    uploaderId: "author-1",
    isWithinViewersFamilySpace: false,
  };

  it("lets the uploader see their own media while it is still unclassified", () => {
    const viewer = makeViewer({ userId: "author-1" });
    expect(canViewMedia(viewer, unclassifiedPost)).toBe(true);
  });

  it("withholds it from another viewer until the pipeline resolves it", () => {
    const viewer = makeViewer({ userId: "viewer-1" });
    expect(canViewMedia(viewer, unclassifiedPost)).toBe(false);
  });
});

describe("canViewProfilePhoto", () => {
  it("the filterAppliesToAvatars opt-out lifts the women filter on avatars", () => {
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        contentLevels: sexMax(0),
        filterAppliesToAvatars: false,
      },
    });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "contains_women",
        levels: lv({ sex: 1 }),
        ownerId: "someone-else",
      })
    ).toBe(true);
  });

  it("filters avatars when filterAppliesToAvatars is on", () => {
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        contentLevels: sexMax(0),
        filterAppliesToAvatars: true,
      },
    });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "contains_women",
        levels: lv({ sex: 1 }),
        ownerId: "someone-else",
      })
    ).toBe(false);
  });

  it("always shows the owner their own profile photo, even when filtered", () => {
    const viewer = makeViewer({
      userId: "me",
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        contentLevels: sexMax(0),
        filterAppliesToAvatars: true,
      },
    });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "contains_women",
        levels: lv({ sex: 1 }),
        ownerId: "me",
      })
    ).toBe(true);
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
    expect(a.contentLevels).not.toBe(b.contentLevels);
    expect(a).toEqual(b);
  });
});

describe("canViewProfilePhoto — unclassified avatar", () => {
  it("shows a generic avatar to others until the photo is classified", () => {
    const viewer = makeViewer({ userId: "viewer-1" });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "unclassified",
        levels: null,
        ownerId: "owner-1",
      })
    ).toBe(false);
  });

  it("still shows the owner their own unclassified photo", () => {
    const viewer = makeViewer({ userId: "owner-1" });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "unclassified",
        levels: null,
        ownerId: "owner-1",
      })
    ).toBe(true);
  });

  it("withholds an unclassified avatar even from a viewer who opted out of avatar filtering", () => {
    const viewer = makeViewer({
      userId: "viewer-1",
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        filterAppliesToAvatars: false,
      },
    });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "unclassified",
        levels: null,
        ownerId: "owner-1",
      })
    ).toBe(false);
  });
});

describe("resolveUploaderMediaState", () => {
  it("reports media still in the pipeline as processing", () => {
    expect(resolveUploaderMediaState("unclassified", null, "male")).toBe("processing");
  });

  it("reports frozen media as under review", () => {
    expect(resolveUploaderMediaState("pending_review", null, "female")).toBe("under_review");
  });

  it("reports approved media as published", () => {
    expect(resolveUploaderMediaState("general", lv(), "male")).toBe("published");
  });

  it("tells a male uploader their media will be filtered for many viewers", () => {
    expect(resolveUploaderMediaState("contains_women", lv({ sex: 1 }), "male")).toBe(
      "filtered_for_some_viewers"
    );
  });

  it("does not show a woman the notice — that case is still an open question", () => {
    // master spec §4.4.2 carries an explicit ⏳: whether a parallel notice
    // should be shown to a woman uploading content with women is deferred, so
    // the product does not invent an answer here.
    expect(resolveUploaderMediaState("contains_women", lv({ sex: 1 }), "female")).toBe("published");
  });
});

describe("canViewFamilySpaceMemberCount", () => {
  it("allows only members of that space", () => {
    const member = makeViewer({ familySpaceMemberships: new Set(["s1"]) });
    expect(canViewFamilySpaceMemberCount(member, "s1")).toBe(true);
    expect(canViewFamilySpaceMemberCount(member, "s2")).toBe(false);
    expect(canViewFamilySpaceMemberCount(makeViewer(), "s1")).toBe(false);
  });
});

describe("per-group levels (ADR 0018)", () => {
  it("withholds a resolved item whose levels are null (fail closed)", () => {
    expect(viewerSatisfiesClassification(viewer(), { classification: "general", levels: null }, false)).toBe(false);
  });
  it("a level above the viewer's maximum withholds; at or below shows", () => {
    const v = viewer({ contentLevels: { sex: 0, violence: 1, religion: 0, addictions: 0 } });
    expect(viewerSatisfiesClassification(v, { classification: "general", levels: lv({ violence: 1 }) }, false)).toBe(true);
    expect(viewerSatisfiesClassification(v, { classification: "general", levels: lv({ violence: 2 }) }, false)).toBe(false);
  });
  it("contains_women is the sex axis: hidden at max 0, shown at max 1", () => {
    const m = { classification: "contains_women" as const, levels: lv({ sex: 1 }) };
    expect(viewerSatisfiesClassification(viewer({ contentLevels: { sex: 0, violence: 0, religion: 0, addictions: 0 } }), m, false)).toBe(false);
    expect(viewerSatisfiesClassification(viewer({ contentLevels: { sex: 1, violence: 0, religion: 0, addictions: 0 } }), m, false)).toBe(true);
  });
  it("a Family Space lifts sex only", () => {
    const v = viewer({ contentLevels: { sex: 0, violence: 0, religion: 0, addictions: 0 } });
    expect(viewerSatisfiesClassification(v, { classification: "contains_women", levels: lv({ sex: 2 }) }, true)).toBe(true);
    expect(viewerSatisfiesClassification(v, { classification: "general", levels: lv({ violence: 1 }) }, true)).toBe(false);
  });
  it("pending_review and unclassified stay withheld whatever the levels", () => {
    expect(viewerSatisfiesClassification(viewer(), { classification: "pending_review", levels: lv() }, true)).toBe(false);
    expect(viewerSatisfiesClassification(viewer(), { classification: "unclassified", levels: null }, true)).toBe(false);
  });
});

describe("per-group levels — every group, Family Space and avatar branch", () => {
  const ZERO = { sex: 0, violence: 0, religion: 0, addictions: 0 } as const;
  const general = (levels: ContentLevels | null) => ({ classification: "general" as const, levels });

  for (const g of ["religion", "addictions"] as const) {
    it(`${g}: below and at the viewer's max shows, above withholds`, () => {
      const v = viewer({ contentLevels: { ...ZERO, [g]: 1 } });
      expect(viewerSatisfiesClassification(v, general(lv({ [g]: 0 })), false)).toBe(true);
      expect(viewerSatisfiesClassification(v, general(lv({ [g]: 1 })), false)).toBe(true);
      expect(viewerSatisfiesClassification(v, general(lv({ [g]: 2 })), false)).toBe(false);
    });

    it(`a Family Space does not lift ${g}`, () => {
      expect(viewerSatisfiesClassification(viewer({ contentLevels: ZERO }), general(lv({ [g]: 1 })), true)).toBe(false);
    });
  }

  it("sex 2 is withheld from a female-default viewer (max 1)", () => {
    const v = viewer({ contentLevels: resolveDefaultFilterSettings("female").contentLevels });
    expect(viewerSatisfiesClassification(v, { classification: "contains_women", levels: lv({ sex: 2 }) }, false)).toBe(false);
  });

  it("inside a Family Space, sex 2 + violence 1 is withheld from a viewer at violence max 0", () => {
    const v = viewer({ contentLevels: ZERO });
    expect(viewerSatisfiesClassification(v, { classification: "contains_women", levels: lv({ sex: 2, violence: 1 }) }, true)).toBe(false);
  });

  it("null levels are withheld on contains_women and on a resolved row inside a Family Space", () => {
    const v = viewer({ contentLevels: { sex: 2, violence: 2, religion: 2, addictions: 2 } });
    expect(viewerSatisfiesClassification(v, { classification: "contains_women", levels: null }, false)).toBe(false);
    expect(viewerSatisfiesClassification(v, general(null), true)).toBe(false);
  });

  it("the uploader sees their own media even with a non-sex level above their own max", () => {
    const me = makeViewer({ userId: "me", filterSettings: { ...resolveDefaultFilterSettings("male"), contentLevels: ZERO } });
    expect(
      canViewMedia(me, { ...general(lv({ violence: 2 })), exposure: [{ kind: "public" }], isWithinViewersFamilySpace: false, uploaderId: "me" })
    ).toBe(true);
  });

  it("avatars with filterAppliesToAvatars on: a non-sex level above max, or null levels, are withheld", () => {
    const v = viewer({ contentLevels: ZERO, filterAppliesToAvatars: true });
    expect(canViewProfilePhoto(v, { ...general(lv({ religion: 1 })), ownerId: "someone-else" })).toBe(false);
    expect(canViewProfilePhoto(v, { ...general(null), ownerId: "someone-else" })).toBe(false);
  });

  it("avatar opt-out lifts the sex group only (Eli, 2026-11-02)", () => {
    const v = viewer({ contentLevels: ZERO, filterAppliesToAvatars: false });
    expect(canViewProfilePhoto(v, { classification: "contains_women", levels: lv({ sex: 2 }), ownerId: "someone-else" })).toBe(true);
    expect(canViewProfilePhoto(v, { ...general(lv({ violence: 1 })), ownerId: "someone-else" })).toBe(false);
    expect(canViewProfilePhoto(v, { classification: "unclassified", levels: null, ownerId: "someone-else" })).toBe(false);
    expect(canViewProfilePhoto(v, { ...general(null), ownerId: "someone-else" })).toBe(false);
  });
});
