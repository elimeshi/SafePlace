/**
 * The expected-decision oracle for the parity suite. It computes what a viewer
 * SHOULD be able to see purely from @safeplace/visibility-policy (+ the one
 * DB-layer concern the policy package deliberately doesn't model for avatars:
 * blocks hide the whole profile). The DB is then asserted
 * to agree. If these two ever diverge, one of them has an enforcement bug.
 */
import {
  canViewMedia,
  canViewPost,
  canViewProfilePhoto,
  isMediaRowVisible,
  viewerSatisfiesAudience,
  type ContentAudience,
  type PostContext,
  type Viewer,
} from "@safeplace/visibility-policy";
import {
  BLOCKS,
  USERS,
  type MediaFixture,
  type PostFixture,
  type UserFixture,
} from "./seed";

export function postContextOf(p: PostFixture): PostContext {
  return {
    authorId: p.authorId,
    status: p.status,
    exposure: p.exposure,
    sourceKind: p.sourceKind,
    authorBanned: USER_BY_ID.get(p.authorId)?.banned ?? false,
    removed: p.removed ?? false,
  };
}

/** Audiences of `p` the viewer is allowed to learn about (author: all). */
export function expectedAudiences(u: UserFixture, p: PostFixture): ContentAudience[] {
  const v = viewerOf(u);
  if (!canViewPost(v, postContextOf(p))) return [];
  if (u.id === p.authorId) return [...p.exposure];
  return p.exposure.filter((a) => viewerSatisfiesAudience(v, a));
}

export const USER_BY_ID = new Map(USERS.map((u) => [u.id, u]));

export function viewerOf(u: UserFixture): Viewer {
  return {
    userId: u.id,
    gender: u.gender,
    filterSettings: u.filter,
    groupMemberships: new Set(u.groups),
    familySpaceMemberships: new Set(u.familySpaces),
    following: new Set(u.follows),
    blockedUsers: new Set(
      BLOCKS.flatMap(([x, y]) => (x === u.id ? [y] : y === u.id ? [x] : []))
    ),
    mutedUsers: new Set(u.mutes ?? []),
    suppressedSuggestions: new Set(u.suppressed ?? []),
  };
}

export function isBlockedBetween(a: string, b: string): boolean {
  return BLOCKS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export interface ExpectedMedia {
  /** Viewer can even KNOW the media exists (base RLS row visibility). */
  rowPresent: boolean;
  /** Viewer can see the actual media content (real URL served). */
  contentVisible: boolean;
  /** Row present but content withheld → neutral placeholder. */
  isFiltered: boolean;
}

export function expectedMedia(u: UserFixture, m: MediaFixture): ExpectedMedia {
  const v = viewerOf(u);
  const media = {
    classification: m.classification,
    levels: m.levels,
    exposure: m.exposure,
    isWithinViewersFamilySpace: m.familySpaceId !== null && v.familySpaceMemberships.has(m.familySpaceId),
    uploaderId: m.uploaderId,
  };
  const rowPresent = isMediaRowVisible(v, media);
  const contentVisible = rowPresent && canViewMedia(v, media);
  return { rowPresent, contentVisible, isFiltered: rowPresent && !contentVisible };
}

export interface ExpectedAvatar {
  /** Target profile is visible to the viewer at all (not blocked / deleted). */
  profileVisible: boolean;
  /** Real avatar served vs. generic. */
  avatarVisible: boolean;
}

export function expectedAvatar(
  viewer: UserFixture,
  target: UserFixture
): ExpectedAvatar {
  // A banned profile is hidden from everyone, its owner included.
  const profileVisible =
    !target.banned && (viewer.id === target.id || !isBlockedBetween(viewer.id, target.id));
  // No avatar at all: nothing to withhold (avatar_permitted(null) = true).
  const avatar = target.avatar ?? {
    classification: "general" as const,
    levels: { sex: 0, violence: 0, religion: 0, addictions: 0 } as const,
  };
  const avatarVisible =
    profileVisible &&
    canViewProfilePhoto(viewerOf(viewer), {
      classification: avatar.classification,
      levels: avatar.levels,
      // The avatar's owner is the profile it belongs to — canViewProfilePhoto
      // grants the owner their own photo.
      ownerId: target.id,
      ownerBanned: target.banned ?? false,
    });
  return { profileVisible, avatarVisible };
}
