import { describe, expect, it } from "vitest";
import {
  accountWriteAllowed,
  canViewComment,
  canViewMedia,
  canViewPost,
  canViewProfilePhoto,
  isMediaRowVisible,
  resolveDefaultFilterSettings,
  resolveUploaderMediaState,
} from "../rules";
import type { AccountState, ContentLevels, PostContext, Viewer, WriteAction } from "../types";

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

const lv = (o: Partial<ContentLevels> = {}): ContentLevels => ({ sex: 0, violence: 0, religion: 0, addictions: 0, ...o });

function post(overrides: Partial<PostContext> = {}): PostContext {
  return {
    authorId: "author",
    status: "published",
    exposure: [{ kind: "public" }],
    sourceKind: "profile",
    authorBanned: false,
    removed: false,
    ...overrides,
  };
}

const ALL_ACTIONS: WriteAction[] = [
  "post",
  "comment",
  "message",
  "message_request",
  "profile_edit",
  "media_upload",
  "interaction",
  "report",
  "appeal",
];
const SUSPENSION_BLOCKS: WriteAction[] = ["post", "comment", "message", "message_request", "profile_edit", "media_upload"];
const SUSPENSION_ALLOWS: WriteAction[] = ["interaction", "report", "appeal"];

describe("accountWriteAllowed (plan §2 fork 16, §4.4)", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  const active = (suspendedUntil: Date | null): AccountState => ({ status: "active", suspendedUntil });

  it("a banned account may only appeal", () => {
    const banned: AccountState = { status: "banned", suspendedUntil: null };
    for (const a of ALL_ACTIONS) expect(accountWriteAllowed(banned, a, now), a).toBe(a === "appeal");
  });
  it("a ban wins over a past suspension too", () => {
    const banned: AccountState = { status: "banned", suspendedUntil: new Date("2026-01-01T00:00:00Z") };
    expect(accountWriteAllowed(banned, "interaction", now)).toBe(false);
  });
  it("a suspension blocks creating and editing, not browsing, reporting or appealing", () => {
    const suspended = active(new Date("2026-11-23T12:00:00Z"));
    for (const a of SUSPENSION_BLOCKS) expect(accountWriteAllowed(suspended, a, now), a).toBe(false);
    for (const a of SUSPENSION_ALLOWS) expect(accountWriteAllowed(suspended, a, now), a).toBe(true);
  });
  it("an expired suspension, or none, allows everything", () => {
    for (const s of [active(new Date("2026-11-22T11:59:59Z")), active(now), active(null)]) {
      for (const a of ALL_ACTIONS) expect(accountWriteAllowed(s, a, now), a).toBe(true);
    }
  });
});

describe("canViewMedia — removed (plan §2 fork 22)", () => {
  const removed = {
    classification: "removed" as const,
    levels: lv(),
    exposure: [{ kind: "public" }] as const,
    isWithinViewersFamilySpace: false,
    uploaderId: "uploader",
  };
  it("hides removed media from another viewer, even with every level allowed", () => {
    const v = makeViewer({
      filterSettings: { ...resolveDefaultFilterSettings("female"), contentLevels: { sex: 2, violence: 2, religion: 2, addictions: 2 } },
    });
    expect(canViewMedia(v, removed)).toBe(false);
  });
  it("hides removed media from its uploader (no uploader carve-out)", () => {
    expect(canViewMedia(makeViewer({ userId: "uploader" }), removed)).toBe(false);
  });
  it("hides it inside a Family Space too", () => {
    const v = makeViewer({ familySpaceMemberships: new Set(["s1"]) });
    expect(canViewMedia(v, { ...removed, exposure: [{ kind: "family_space", spaceId: "s1" }], isWithinViewersFamilySpace: true })).toBe(false);
  });
});

describe("isMediaRowVisible — whether the viewer may know the media exists", () => {
  const media = (classification: "general" | "contains_women" | "unclassified" | "pending_review" | "removed") => ({
    classification,
    exposure: [{ kind: "public" }] as const,
    uploaderId: "uploader",
  });
  it("the uploader always sees the row, removed and pending_review included (placeholder)", () => {
    for (const c of ["general", "unclassified", "pending_review", "removed"] as const) {
      expect(isMediaRowVisible(makeViewer({ userId: "uploader" }), media(c)), c).toBe(true);
    }
  });
  it("removed and pending_review rows are hidden from everyone else", () => {
    expect(isMediaRowVisible(makeViewer(), media("removed"))).toBe(false);
    expect(isMediaRowVisible(makeViewer(), media("pending_review"))).toBe(false);
  });
  it("a filtered row stays visible, so the viewer gets a placeholder", () => {
    expect(isMediaRowVisible(makeViewer(), media("contains_women"))).toBe(true);
    expect(isMediaRowVisible(makeViewer(), media("unclassified"))).toBe(true);
  });
  it("follows exposure and blocks", () => {
    const fol = { ...media("general"), exposure: [{ kind: "followers_only", authorId: "uploader" }] as const };
    expect(isMediaRowVisible(makeViewer(), fol)).toBe(false);
    expect(isMediaRowVisible(makeViewer({ following: new Set(["uploader"]) }), fol)).toBe(true);
    expect(isMediaRowVisible(makeViewer({ blockedUsers: new Set(["uploader"]) }), media("general"))).toBe(false);
  });
});

describe("canViewPost / canViewComment — banned author, removed content", () => {
  it("hides a banned author's post from everyone, the author included", () => {
    const p = post({ authorBanned: true });
    expect(canViewPost(makeViewer(), p)).toBe(false);
    expect(canViewPost(makeViewer({ userId: "author" }), p)).toBe(false);
    expect(canViewPost(makeViewer({ userId: "author" }), { ...p, status: "draft" })).toBe(false);
  });
  it("hides a removed post from everyone, the author included", () => {
    const p = post({ removed: true });
    expect(canViewPost(makeViewer(), p)).toBe(false);
    expect(canViewPost(makeViewer({ userId: "author" }), p)).toBe(false);
  });
  it("a live post by an active author is unchanged", () => {
    expect(canViewPost(makeViewer(), post())).toBe(true);
  });

  const comment = { authorId: "commenter", authorBanned: false, removed: false, post: post() };
  it("hides a banned commenter's comment from everyone, the commenter included", () => {
    const c = { ...comment, authorBanned: true };
    expect(canViewComment(makeViewer(), c)).toBe(false);
    expect(canViewComment(makeViewer({ userId: "commenter" }), c)).toBe(false);
  });
  it("hides a removed comment from everyone, the commenter included", () => {
    const c = { ...comment, removed: true };
    expect(canViewComment(makeViewer(), c)).toBe(false);
    expect(canViewComment(makeViewer({ userId: "commenter" }), c)).toBe(false);
  });
  it("hides every comment on a banned author's or removed post", () => {
    expect(canViewComment(makeViewer(), { ...comment, post: post({ authorBanned: true }) })).toBe(false);
    expect(canViewComment(makeViewer(), { ...comment, post: post({ removed: true }) })).toBe(false);
  });
  it("a live comment is unchanged", () => {
    expect(canViewComment(makeViewer(), comment)).toBe(true);
  });
});

describe("canViewProfilePhoto — banned owner", () => {
  const photo = { classification: "general" as const, levels: lv(), ownerId: "owner", ownerBanned: true };
  it("hides a banned owner's photo from others and from the owner", () => {
    expect(canViewProfilePhoto(makeViewer(), photo)).toBe(false);
    expect(canViewProfilePhoto(makeViewer({ userId: "owner" }), photo)).toBe(false);
  });
  it("an active owner's photo is unchanged", () => {
    expect(canViewProfilePhoto(makeViewer(), { ...photo, ownerBanned: false })).toBe(true);
    expect(canViewProfilePhoto(makeViewer({ userId: "owner" }), { ...photo, ownerBanned: false })).toBe(true);
  });
  it("a removed photo is hidden from the owner too", () => {
    const removed = { ...photo, classification: "removed" as const, ownerBanned: false };
    expect(canViewProfilePhoto(makeViewer(), removed)).toBe(false);
    expect(canViewProfilePhoto(makeViewer({ userId: "owner" }), removed)).toBe(false);
  });
});

describe("resolveUploaderMediaState — removed", () => {
  it("tells the uploader the media was removed", () => {
    expect(resolveUploaderMediaState("removed", lv({ sex: 3 }), "male")).toBe("removed");
    expect(resolveUploaderMediaState("removed", null, "female")).toBe("removed");
  });
});
