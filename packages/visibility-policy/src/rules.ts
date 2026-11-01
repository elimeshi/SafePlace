import type {
  CommentContext,
  ContentAudience,
  ContentExposure,
  ContentGroup,
  ContentLevels,
  DiscoverableInSearch,
  FeedPlacement,
  FilterSettings,
  Gender,
  GroupVisibility,
  MediaClassification,
  MediaItemContext,
  PostContext,
  Viewer,
} from "./types";
import { CONTENT_GROUPS, DEFAULT_FILTER_SETTINGS } from "./types";

/**
 * Axis 1: does the viewer satisfy the content's intended exposure circle?
 * This has nothing to do with gender or classification — it's the same
 * "who is this addressed to" check any social network needs.
 */
export function viewerSatisfiesAudience(
  viewer: Viewer,
  audience: ContentAudience
): boolean {
  switch (audience.kind) {
    case "public":
      return true;
    case "followers_only":
      return (
        viewer.userId === audience.authorId ||
        viewer.following.has(audience.authorId)
      );
    case "group":
      return viewer.groupMemberships.has(audience.groupId);
    case "family_space":
      return viewer.familySpaceMemberships.has(audience.spaceId);
  }
}

/** A viewer satisfies a multi-audience exposure iff they satisfy ANY audience. */
export function viewerSatisfiesExposure(
  viewer: Viewer,
  exposure: ContentExposure
): boolean {
  return exposure.some((a) => viewerSatisfiesAudience(viewer, a));
}

/**
 * THE audience-combination rule (SQL mirror: visibility.audience_set_valid).
 * Nothing else in the codebase may restate it.
 *  - at least one audience;
 *  - public includes everyone, so it is exclusive;
 *  - a Family Space never mixes with a non-Family-Space audience (several
 *    Family Spaces together are fine). Pending Eli's confirmation (plan §2a).
 */
export function isAudienceSetValid(audiences: readonly ContentAudience[]): boolean {
  if (audiences.length === 0) return false;
  if (audiences.some((a) => a.kind === "public")) return audiences.length === 1;
  const family = audiences.filter((a) => a.kind === "family_space").length;
  return family === 0 || family === audiences.length;
}

/**
 * Whether the viewer may see a post at all. Post TEXT is never classification-
 * filtered; this is exposure + blocks + draft state only. A draft is the
 * author's alone. Mute is deliberately absent: it only affects the feed
 * (postFeedPlacement) and comment display, never reachability.
 */
export function canViewPost(viewer: Viewer, post: PostContext): boolean {
  if (post.status === "draft") return viewer.userId === post.authorId;
  if (viewer.blockedUsers.has(post.authorId)) return false;
  return viewerSatisfiesExposure(viewer, post.exposure);
}

/** A comment inherits its post's visibility; blocked and muted authors are hidden. */
export function canViewComment(viewer: Viewer, comment: CommentContext): boolean {
  return (
    canViewPost(viewer, comment.post) &&
    !viewer.blockedUsers.has(comment.authorId) &&
    !viewer.mutedUsers.has(comment.authorId)
  );
}

/**
 * Where a post may appear in the viewer's main feed. Family Space posts never
 * do (01 §2.3.1: they surface only in the spaces rail and the single-post
 * screen). The 1-in-5 cap on suggested posts is a ranking-seam concern, not
 * a visibility rule.
 */
export function postFeedPlacement(viewer: Viewer, post: PostContext): FeedPlacement {
  if (!canViewPost(viewer, post)) return "none";
  if (post.status !== "published") return "none";
  if (post.exposure.some((a) => a.kind === "family_space")) return "none";
  if (viewer.mutedUsers.has(post.authorId)) return "none";

  const followed =
    viewer.userId === post.authorId ||
    viewer.following.has(post.authorId) ||
    post.exposure.some((a) => a.kind === "group" && viewer.groupMemberships.has(a.groupId));
  if (followed) return "followed";

  const isPublicPersonal =
    post.sourceKind === "profile" && post.exposure.some((a) => a.kind === "public");
  if (
    isPublicPersonal &&
    viewer.filterSettings.showSuggestedPosts &&
    !viewer.suppressedSuggestions.has(post.authorId)
  ) {
    return "suggested";
  }
  return "none";
}

/**
 * Share-to-group (03 §5.3). Allowed iff the viewer can see the post, belongs
 * to the target group, the post has no Family Space audience, and either the
 * post is public, or the target is already one of its audiences, or every
 * audience is a public group (so nothing narrower than the target's own reach
 * is widened). Reading "every group audience" as "every audience" is a
 * deliberate tightening — see the Phase 4 report.
 */
export function canSharePostInternally(
  viewer: Viewer,
  post: PostContext,
  targetGroupId: string,
  groupVisibility: ReadonlyMap<string, GroupVisibility>
): boolean {
  if (post.status !== "published" || !canViewPost(viewer, post)) return false;
  if (!viewer.groupMemberships.has(targetGroupId)) return false;
  if (post.exposure.some((a) => a.kind === "family_space")) return false;
  if (post.exposure.some((a) => a.kind === "public")) return true;
  if (post.exposure.some((a) => a.kind === "group" && a.groupId === targetGroupId)) {
    return true;
  }
  return post.exposure.every(
    (a) => a.kind === "group" && groupVisibility.get(a.groupId) === "public"
  );
}

/** External link: public posts only, and only to someone who can see them. */
export function canCopyExternalLink(viewer: Viewer, post: PostContext): boolean {
  return (
    post.status === "published" &&
    canViewPost(viewer, post) &&
    post.exposure.length === 1 &&
    post.exposure[0].kind === "public"
  );
}

/**
 * Follow suggestions. Composes the viewer's search-separation preference with
 * the TARGET's own discoverability: a target who limits discovery to
 * followers is, by definition, not suggestable to someone who is not one.
 */
export function canSuggestUserToFollow(
  viewer: Viewer,
  target: { userId: string; gender: Gender; discoverableInSearch: DiscoverableInSearch }
): boolean {
  if (target.userId === viewer.userId) return false;
  if (viewer.following.has(target.userId)) return false;
  if (viewer.blockedUsers.has(target.userId)) return false;
  if (viewer.mutedUsers.has(target.userId)) return false;
  if (viewer.suppressedSuggestions.has(target.userId)) return false;
  if (target.discoverableInSearch !== "everyone") return false;
  return canDiscoverUserInSearch(viewer, target.gender);
}

/**
 * Axis 2: does the viewer's personal filter settings permit this media's
 * per-group levels (ADR 0018) — independent of exposure, and independent of
 * who uploaded it. See visibility-model.md §3.
 *
 * Family Space context lifts the sex group only (visibility-model.md §8,
 * ADR 0018 §4) — and exposure (Axis 1) above is NOT lifted; a Family Space
 * post is still only visible to Family Space members.
 */
export function viewerSatisfiesClassification(
  viewer: Viewer,
  media: { classification: MediaClassification; levels: ContentLevels | null },
  isWithinViewersFamilySpace: boolean
): boolean {
  switch (media.classification) {
    case "unclassified":
    case "pending_review":
      // Fail CLOSED: nothing is known, or a human has not decided. No viewer
      // setting can opt into either, and a Family Space does not lift it.
      //
      // This withholds the reference, not the row: media_items stays
      // SELECTable so the UI can render a "processing" state. The uploader is
      // unaffected — canViewMedia short-circuits for them before this axis.
      return false;
    case "general":
    case "contains_women":
      break;
  }
  // A resolved row always carries levels (DB CHECK); a null here is a defect
  // upstream and is withheld rather than guessed at.
  if (media.levels === null) return false;

  const max = viewer.filterSettings.contentLevels;
  for (const g of CONTENT_GROUPS) {
    // The Family Space exception is about modesty between relatives (invariant
    // #6, ADR 0018 §4). It lifts the sex group and nothing else.
    if (g === "sex" && isWithinViewersFamilySpace) continue;
    if (media.levels[g] > max[g]) return false;
  }
  return true;
}

/**
 * The single entry point every layer (DB policy logic mirrored in SQL,
 * API handlers, UI components) should conceptually match. This is the
 * canonical definition referenced by docs/architecture/visibility-model.md
 * §3 — keep that doc and this function in sync if either changes.
 */
export function canViewMedia(
  viewer: Viewer,
  media: MediaItemContext
): boolean {
  // The uploader always sees their own content, regardless of classification,
  // exposure, or their own filter settings. This subsumes the frozen
  // (pending_review) uploader case that used to be a separate caller concern.
  if (viewer.userId === media.uploaderId) return true;

  return (
    viewerSatisfiesExposure(viewer, media.exposure) &&
    viewerSatisfiesClassification(viewer, media, media.isWithinViewersFamilySpace)
  );
}

/**
 * Whether a viewer should see another user's profile photo as the real
 * image vs. a neutral generic avatar. See
 * docs/product/05-personal-area-spec.md §2.6.1 — this is filtering, not
 * blocking, and must be presented identically to any other neutral avatar.
 */
export function canViewProfilePhoto(
  viewer: Viewer,
  photo: { classification: MediaClassification; levels: ContentLevels | null; ownerId: string }
): boolean {
  // The owner always sees their own profile photo (same principle as
  // canViewMedia's uploader rule).
  if (viewer.userId === photo.ownerId) return true;
  if (!viewer.filterSettings.filterAppliesToAvatars) return true;
  return viewerSatisfiesClassification(viewer, photo, /* isWithinViewersFamilySpace */ false);
}

/**
 * Whether a viewer should see another user's account at all in
 * gender-separable surfaces (search, message-recipient lookup). This is
 * always opt-in separation — default is unfiltered. See
 * docs/product/08-search-spec.md §3.2.1 and
 * docs/product/09-messages-spec.md §5.2.1.
 */
export function canDiscoverUserInSearch(
  viewer: Viewer,
  targetGender: Gender
): boolean {
  if (!viewer.filterSettings.genderSeparationInSearch) return true;
  return targetGender === viewer.gender;
}

export function canSendMessageRequest(
  viewer: Viewer,
  recipientGender: Gender,
  recipientFilterSettings: FilterSettings
): boolean {
  if (recipientFilterSettings.genderSeparationInMessages) {
    return recipientGender === viewer.gender;
  }
  return true;
}

/**
 * Resolve the default FilterSettings for a newly created account. Pure
 * function of declared gender — see types.ts for the actual default
 * values and why they're framed as defaults, not rules.
 */
export function resolveDefaultFilterSettings(gender: Gender): FilterSettings {
  const defaults = DEFAULT_FILTER_SETTINGS[gender];
  return { ...defaults, contentLevels: { ...defaults.contentLevels } };
}

/**
 * What the UPLOADER is told about their own media. Distinct from every other
 * rule in this file: those decide what a viewer may see, this decides what the
 * person who uploaded it is shown about its progress through the pipeline.
 *
 * It lives here because the interesting case is gender-conditioned, and every
 * gender-conditioned rule in the product belongs in one place where it can be
 * read against the symmetry requirements (invariants #3 and #4).
 */
export type UploaderMediaState =
  | "processing" // queued or in flight — not yet visible to others
  | "under_review" // frozen for human moderation
  | "filtered_for_some_viewers" // some group at level ≥ 1 the uploader is told about
  | "published";

/**
 * Which groups the uploader is told about. Every group at level ≥ 1 — except
 * that `sex` is reported to a male uploader only: master spec §4.4.2 carries an
 * explicit ⏳ over whether a woman uploading content containing women should be
 * told, and an open question is not answered in code. Single place to change.
 *
 * Note this affects only what the uploader is TOLD. The filtering mechanism
 * itself is identical regardless of who uploaded the media — the product
 * classifies content, never users (invariant #1).
 */
export function noticeGroupsFor(levels: ContentLevels | null, uploaderGender: Gender): ContentGroup[] {
  if (levels === null) return [];
  return CONTENT_GROUPS.filter((g) => levels[g] >= 1 && (g !== "sex" || uploaderGender === "male"));
}

/**
 * Note what this is NOT: it never says the upload was blocked or rejected,
 * because it never is (master spec §3.5 — the legal core of the product). Every
 * state here describes where the media has got to, not a judgment of it.
 */
export function resolveUploaderMediaState(
  classification: MediaClassification,
  levels: ContentLevels | null,
  uploaderGender: Gender
): UploaderMediaState {
  switch (classification) {
    case "unclassified":
      return "processing";
    case "pending_review":
      return "under_review";
    case "general":
    case "contains_women":
      return noticeGroupsFor(levels, uploaderGender).length > 0 ? "filtered_for_some_viewers" : "published";
  }
}

/**
 * Whether the viewer may be told how many members a Family Space has. A Family
 * Space is private to its members, so even its size is theirs only (a number,
 * never a list: invariant #5). SQL mirror: `public.family_space_member_count`.
 */
export function canViewFamilySpaceMemberCount(viewer: Viewer, spaceId: string): boolean {
  return viewer.familySpaceMemberships.has(spaceId);
}
