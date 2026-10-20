import { describe, expect, it } from "vitest";
import {
  canCopyExternalLink,
  canSharePostInternally,
  canSuggestUserToFollow,
  canViewComment,
  canViewPost,
  isAudienceSetValid,
  postFeedPlacement,
  resolveDefaultFilterSettings,
  viewerSatisfiesExposure,
} from "../rules";
import type {
  ContentAudience,
  ContentExposure,
  GroupVisibility,
  PostContext,
  Viewer,
} from "../types";

function makeViewer(overrides: Partial<Viewer> = {}): Viewer {
  return {
    userId: "me",
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

const PUBLIC: ContentAudience = { kind: "public" };
const FOLLOWERS: ContentAudience = { kind: "followers_only", authorId: "author" };
const G1: ContentAudience = { kind: "group", groupId: "g1" };
const G2: ContentAudience = { kind: "group", groupId: "g2" };
const S1: ContentAudience = { kind: "family_space", spaceId: "s1" };
const S2: ContentAudience = { kind: "family_space", spaceId: "s2" };

function post(exposure: ContentExposure, overrides: Partial<PostContext> = {}): PostContext {
  return { authorId: "author", status: "published", exposure, sourceKind: "profile", ...overrides };
}

describe("isAudienceSetValid", () => {
  it("rejects an empty set", () => expect(isAudienceSetValid([])).toBe(false));
  it("accepts public alone", () => expect(isAudienceSetValid([PUBLIC])).toBe(true));
  it("makes public exclusive", () => {
    expect(isAudienceSetValid([PUBLIC, FOLLOWERS])).toBe(false);
    expect(isAudienceSetValid([PUBLIC, G1])).toBe(false);
    expect(isAudienceSetValid([PUBLIC, S1])).toBe(false);
  });
  it("accepts followers plus any number of groups", () => {
    expect(isAudienceSetValid([FOLLOWERS, G1, G2])).toBe(true);
    expect(isAudienceSetValid([G1, G2])).toBe(true);
  });
  it("accepts several Family Spaces together", () => {
    expect(isAudienceSetValid([S1, S2])).toBe(true);
    expect(isAudienceSetValid([S1])).toBe(true);
  });
  it("never mixes a Family Space with a non-Family-Space audience", () => {
    expect(isAudienceSetValid([S1, G1])).toBe(false);
    expect(isAudienceSetValid([S1, FOLLOWERS])).toBe(false);
    expect(isAudienceSetValid([G1, S1, S2])).toBe(false);
  });
});

describe("viewerSatisfiesExposure — multi-audience (OR)", () => {
  const exposure: ContentExposure = [G1, G2];
  it("passes when the viewer is in one of the groups", () => {
    expect(viewerSatisfiesExposure(makeViewer({ groupMemberships: new Set(["g2"]) }), exposure)).toBe(true);
  });
  it("passes when the viewer is in all of the groups", () => {
    expect(viewerSatisfiesExposure(makeViewer({ groupMemberships: new Set(["g1", "g2"]) }), exposure)).toBe(true);
  });
  it("fails when the viewer is in none", () => {
    expect(viewerSatisfiesExposure(makeViewer(), exposure)).toBe(false);
  });
  it("passes via followers even when in no listed group", () => {
    const v = makeViewer({ following: new Set(["author"]) });
    expect(viewerSatisfiesExposure(v, [FOLLOWERS, G1])).toBe(true);
  });
});

describe("canViewPost", () => {
  it("lets anyone see a public published post", () => {
    expect(canViewPost(makeViewer(), post([PUBLIC]))).toBe(true);
  });
  it("shows a draft to its author only", () => {
    const d = post([PUBLIC], { status: "draft" });
    expect(canViewPost(makeViewer({ userId: "author" }), d)).toBe(true);
    expect(canViewPost(makeViewer(), d)).toBe(false);
  });
  it("hides a post from a blocked pair", () => {
    expect(canViewPost(makeViewer({ blockedUsers: new Set(["author"]) }), post([PUBLIC]))).toBe(false);
  });
  it("applies exposure", () => {
    expect(canViewPost(makeViewer(), post([G1]))).toBe(false);
    expect(canViewPost(makeViewer({ groupMemberships: new Set(["g1"]) }), post([G1]))).toBe(true);
  });
  it("does not hide a muted author's post (mute is feed-only)", () => {
    expect(canViewPost(makeViewer({ mutedUsers: new Set(["author"]) }), post([PUBLIC]))).toBe(true);
  });
  it("shows a Family Space post to a member (single-post carve-out)", () => {
    expect(canViewPost(makeViewer({ familySpaceMemberships: new Set(["s1"]) }), post([S1]))).toBe(true);
  });
});

describe("canViewComment", () => {
  const c = { authorId: "commenter", post: post([PUBLIC]) };
  it("shows a comment on a visible post", () => expect(canViewComment(makeViewer(), c)).toBe(true));
  it("hides it when the post is not visible", () => {
    expect(canViewComment(makeViewer(), { ...c, post: post([G1]) })).toBe(false);
  });
  it("hides a blocked author's comment", () => {
    expect(canViewComment(makeViewer({ blockedUsers: new Set(["commenter"]) }), c)).toBe(false);
  });
  it("hides a muted author's comment", () => {
    expect(canViewComment(makeViewer({ mutedUsers: new Set(["commenter"]) }), c)).toBe(false);
  });
});

describe("postFeedPlacement", () => {
  it("is followed for the viewer's own post", () => {
    expect(postFeedPlacement(makeViewer({ userId: "author" }), post([FOLLOWERS]))).toBe("followed");
  });
  it("is followed when the viewer follows the author", () => {
    expect(postFeedPlacement(makeViewer({ following: new Set(["author"]) }), post([PUBLIC]))).toBe("followed");
  });
  it("is followed for a post in one of the viewer's groups", () => {
    const v = makeViewer({ groupMemberships: new Set(["g2"]) });
    expect(postFeedPlacement(v, post([G1, G2], { sourceKind: "group" }))).toBe("followed");
  });
  it("is none for a group post the viewer cannot see", () => {
    expect(postFeedPlacement(makeViewer(), post([G1]))).toBe("none");
  });
  it("is none for any Family Space post, even for a member", () => {
    expect(postFeedPlacement(makeViewer({ familySpaceMemberships: new Set(["s1"]) }), post([S1]))).toBe("none");
    expect(postFeedPlacement(makeViewer({ userId: "author", familySpaceMemberships: new Set(["s1"]) }), post([S1]))).toBe("none");
  });
  it("is none for a draft, even the author's", () => {
    expect(postFeedPlacement(makeViewer({ userId: "author" }), post([PUBLIC], { status: "draft" }))).toBe("none");
  });
  it("is none for a muted author, even when followed", () => {
    const v = makeViewer({ following: new Set(["author"]), mutedUsers: new Set(["author"]) });
    expect(postFeedPlacement(v, post([PUBLIC]))).toBe("none");
  });
  it("is none for a blocked author", () => {
    const v = makeViewer({ following: new Set(["author"]), blockedUsers: new Set(["author"]) });
    expect(postFeedPlacement(v, post([PUBLIC]))).toBe("none");
  });
  it("suggests a public personal post from a stranger", () => {
    expect(postFeedPlacement(makeViewer(), post([PUBLIC]))).toBe("suggested");
  });
  it("does not suggest when showSuggestedPosts is off", () => {
    const v = makeViewer({ filterSettings: { ...resolveDefaultFilterSettings("male"), showSuggestedPosts: false } });
    expect(postFeedPlacement(v, post([PUBLIC]))).toBe("none");
  });
  it("does not suggest a suppressed author (dont_suggest / less_like_this)", () => {
    expect(postFeedPlacement(makeViewer({ suppressedSuggestions: new Set(["author"]) }), post([PUBLIC]))).toBe("none");
  });
  it("does not suggest a public group-sourced post", () => {
    expect(postFeedPlacement(makeViewer(), post([PUBLIC], { sourceKind: "group" }))).toBe("none");
  });
  it("does not suggest a followers-only post to a non-follower", () => {
    expect(postFeedPlacement(makeViewer(), post([FOLLOWERS]))).toBe("none");
  });
});

describe("canSharePostInternally", () => {
  const vis = new Map<string, GroupVisibility>([
    ["g1", "public"],
    ["g2", "private_visible"],
    ["target", "private_visible"],
  ]);
  const member = makeViewer({ groupMemberships: new Set(["target", "g1", "g2"]) });
  it("allows a public post into a group the viewer is in", () => {
    expect(canSharePostInternally(member, post([PUBLIC]), "target", vis)).toBe(true);
  });
  it("requires the viewer to be in the target group", () => {
    expect(canSharePostInternally(makeViewer(), post([PUBLIC]), "target", vis)).toBe(false);
  });
  it("requires the post to be visible and published", () => {
    expect(canSharePostInternally(member, post([PUBLIC], { status: "draft" }), "target", vis)).toBe(false);
    expect(canSharePostInternally(makeViewer({ groupMemberships: new Set(["target"]), blockedUsers: new Set(["author"]) }), post([PUBLIC]), "target", vis)).toBe(false);
  });
  it("allows re-sharing into a group that is already one of the audiences", () => {
    expect(canSharePostInternally(member, post([G2, { kind: "group", groupId: "target" }]), "target", vis)).toBe(true);
  });
  it("allows a post whose audiences are all public groups", () => {
    expect(canSharePostInternally(member, post([G1]), "target", vis)).toBe(true);
  });
  it("refuses a post with a private group audience", () => {
    expect(canSharePostInternally(member, post([G1, G2]), "target", vis)).toBe(false);
  });
  it("refuses a followers-only post", () => {
    const v = makeViewer({ groupMemberships: new Set(["target"]), following: new Set(["author"]) });
    expect(canSharePostInternally(v, post([FOLLOWERS]), "target", vis)).toBe(false);
  });
  it("refuses a followers + public-group mix (nothing is widened)", () => {
    expect(canSharePostInternally(member, post([FOLLOWERS, G1]), "target", vis)).toBe(false);
  });
  it("never shares a Family Space post", () => {
    const v = makeViewer({ groupMemberships: new Set(["target"]), familySpaceMemberships: new Set(["s1"]) });
    expect(canSharePostInternally(v, post([S1]), "target", vis)).toBe(false);
  });
});

describe("canCopyExternalLink", () => {
  it("is allowed for a public published post", () => {
    expect(canCopyExternalLink(makeViewer(), post([PUBLIC]))).toBe(true);
  });
  it("is refused for every non-public audience", () => {
    const v = makeViewer({ following: new Set(["author"]), groupMemberships: new Set(["g1"]), familySpaceMemberships: new Set(["s1"]) });
    expect(canCopyExternalLink(v, post([FOLLOWERS]))).toBe(false);
    expect(canCopyExternalLink(v, post([G1]))).toBe(false);
    expect(canCopyExternalLink(v, post([S1]))).toBe(false);
  });
  it("is refused for a draft or an invisible post", () => {
    expect(canCopyExternalLink(makeViewer({ userId: "author" }), post([PUBLIC], { status: "draft" }))).toBe(false);
    expect(canCopyExternalLink(makeViewer({ blockedUsers: new Set(["author"]) }), post([PUBLIC]))).toBe(false);
  });
});

describe("canSuggestUserToFollow", () => {
  const target = { userId: "t", gender: "female" as const, discoverableInSearch: "everyone" as const };
  it("suggests a discoverable stranger", () => {
    expect(canSuggestUserToFollow(makeViewer(), target)).toBe(true);
  });
  it("never suggests the viewer to themself", () => {
    expect(canSuggestUserToFollow(makeViewer({ userId: "t" }), target)).toBe(false);
  });
  it("skips users already followed, blocked, muted or suppressed", () => {
    expect(canSuggestUserToFollow(makeViewer({ following: new Set(["t"]) }), target)).toBe(false);
    expect(canSuggestUserToFollow(makeViewer({ blockedUsers: new Set(["t"]) }), target)).toBe(false);
    expect(canSuggestUserToFollow(makeViewer({ mutedUsers: new Set(["t"]) }), target)).toBe(false);
    expect(canSuggestUserToFollow(makeViewer({ suppressedSuggestions: new Set(["t"]) }), target)).toBe(false);
  });
  it("respects the target's own discoverability", () => {
    expect(canSuggestUserToFollow(makeViewer(), { ...target, discoverableInSearch: "followers_only" })).toBe(false);
    expect(canSuggestUserToFollow(makeViewer(), { ...target, discoverableInSearch: "nobody" })).toBe(false);
  });
  it("respects the viewer's search separation preference", () => {
    const v = makeViewer({ filterSettings: { ...resolveDefaultFilterSettings("male"), genderSeparationInSearch: true } });
    expect(canSuggestUserToFollow(v, target)).toBe(false);
    expect(canSuggestUserToFollow(v, { ...target, gender: "male" })).toBe(true);
  });
});
