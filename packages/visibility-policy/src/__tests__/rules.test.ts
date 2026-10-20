import { describe, expect, it } from "vitest";
import {
  canDiscoverUserInSearch,
  canViewFamilySpaceMemberCount,
  canSendMessageRequest,
  canViewMedia,
  canViewProfilePhoto,
  resolveDefaultFilterSettings,
  resolveUploaderMediaState,
  shouldShowWomenDetectedNotice,
  viewerSatisfiesClassification,
  viewerSatisfiesExposure,
} from "../rules";
import type { ContentAudience, FilterSettings, Viewer } from "../types";

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
  it("always shows general content", () => {
    const viewer = makeViewer({
      filterSettings: { ...resolveDefaultFilterSettings("male") },
    });
    expect(viewerSatisfiesClassification(viewer, "general", false)).toBe(
      true
    );
  });

  it("withholds unclassified content from everyone but the uploader", () => {
    // Fail closed while the pipeline has not yet resolved the item: an
    // async classifier means there is a window between upload and the
    // worker's write, and serving the original during that window would
    // show filtered viewers exactly the media the filter exists to
    // withhold. The row stays visible (so the UI can render "processing"),
    // only the underlying reference is withheld — the uploader's own view
    // is granted by canViewMedia's uploader short-circuit.
    const viewer = makeViewer();
    expect(
      viewerSatisfiesClassification(viewer, "unclassified", false)
    ).toBe(false);
  });

  it("withholds unclassified content even from a viewer with the filter off", () => {
    // Not a filter decision — nobody can know what the item contains yet.
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        hideContentWithWomen: false,
      },
    });
    expect(
      viewerSatisfiesClassification(viewer, "unclassified", false)
    ).toBe(false);
  });

  it("lifts the unclassified hold inside a family space", () => {
    const viewer = makeViewer();
    expect(
      viewerSatisfiesClassification(viewer, "unclassified", true)
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
        exposure: [{ kind: "public" }],
        isWithinViewersFamilySpace: false,
        uploaderId: "author-1",
      })
    ).toBe(false);

    // satisfies classification (general) but not exposure (wrong group)
    expect(
      canViewMedia(filteredMaleViewer, {
        classification: "general",
        exposure: [{ kind: "group", groupId: "some-other-group" }],
        isWithinViewersFamilySpace: false,
        uploaderId: "author-1",
      })
    ).toBe(false);

    // satisfies both
    expect(
      canViewMedia(filteredMaleViewer, {
        classification: "general",
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
        hideContentWithWomen: true,
      },
    });
    expect(
      canViewMedia(viewer, {
        classification: "contains_women",
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
        hideContentWithWomen: true,
      },
    });
    expect(
      canViewMedia(viewer, {
        classification: "contains_women",
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
  it("respects filterAppliesToAvatars opt-out", () => {
    const viewer = makeViewer({
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        hideContentWithWomen: true,
        filterAppliesToAvatars: false,
      },
    });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "contains_women",
        ownerId: "someone-else",
      })
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
      canViewProfilePhoto(viewer, {
        classification: "contains_women",
        ownerId: "someone-else",
      })
    ).toBe(false);
  });

  it("always shows the owner their own profile photo, even when filtered", () => {
    const viewer = makeViewer({
      userId: "me",
      filterSettings: {
        ...resolveDefaultFilterSettings("male"),
        hideContentWithWomen: true,
        filterAppliesToAvatars: true,
      },
    });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "contains_women",
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
    expect(a).toEqual(b);
  });
});

describe("canViewProfilePhoto — unclassified avatar", () => {
  it("shows a generic avatar to others until the photo is classified", () => {
    const viewer = makeViewer({ userId: "viewer-1" });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "unclassified",
        ownerId: "owner-1",
      })
    ).toBe(false);
  });

  it("still shows the owner their own unclassified photo", () => {
    const viewer = makeViewer({ userId: "owner-1" });
    expect(
      canViewProfilePhoto(viewer, {
        classification: "unclassified",
        ownerId: "owner-1",
      })
    ).toBe(true);
  });

  it("shows an unclassified avatar to a viewer who opted out of avatar filtering", () => {
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
        ownerId: "owner-1",
      })
    ).toBe(true);
  });
});

describe("resolveUploaderMediaState", () => {
  it("reports media still in the pipeline as processing", () => {
    expect(resolveUploaderMediaState("unclassified", "male")).toBe("processing");
  });

  it("reports frozen media as under review", () => {
    expect(resolveUploaderMediaState("pending_review", "female")).toBe("under_review");
  });

  it("reports approved media as published", () => {
    expect(resolveUploaderMediaState("general", "male")).toBe("published");
  });

  it("tells a male uploader their media will be filtered for many viewers", () => {
    expect(resolveUploaderMediaState("contains_women", "male")).toBe(
      "filtered_for_some_viewers"
    );
  });

  it("does not show a woman the notice — that case is still an open question", () => {
    // master spec §4.4.2 carries an explicit ⏳: whether a parallel notice
    // should be shown to a woman uploading content with women is deferred, so
    // the product does not invent an answer here.
    expect(resolveUploaderMediaState("contains_women", "female")).toBe("published");
  });
});

describe("shouldShowWomenDetectedNotice", () => {
  it("is shown to a male uploader when the media is classified as containing women", () => {
    expect(shouldShowWomenDetectedNotice("contains_women", "male")).toBe(true);
  });

  it("is not shown for any other classification", () => {
    for (const c of ["general", "unclassified", "pending_review"] as const) {
      expect(shouldShowWomenDetectedNotice(c, "male")).toBe(false);
    }
  });

  it("is not shown to a female uploader pending that open question", () => {
    expect(shouldShowWomenDetectedNotice("contains_women", "female")).toBe(false);
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
