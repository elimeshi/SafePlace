import type {
  ContentExposure,
  FilterSettings,
  Gender,
  MediaClassification,
  MediaItemContext,
  Viewer,
} from "./types";
import { DEFAULT_FILTER_SETTINGS } from "./types";

/**
 * Axis 1: does the viewer satisfy the content's intended exposure circle?
 * This has nothing to do with gender or classification — it's the same
 * "who is this addressed to" check any social network needs.
 */
export function viewerSatisfiesExposure(
  viewer: Viewer,
  exposure: ContentExposure
): boolean {
  switch (exposure.kind) {
    case "public":
      return true;
    case "followers_only":
      return (
        viewer.userId === exposure.authorId ||
        viewer.following.has(exposure.authorId)
      );
    case "group":
      return viewer.groupMemberships.has(exposure.groupId);
    case "family_space":
      return viewer.familySpaceMemberships.has(exposure.spaceId);
  }
}

/**
 * Axis 2: does the viewer's personal filter settings permit this
 * classification — independent of exposure, and independent of who
 * uploaded it. See visibility-model.md §3.
 *
 * Family Space context lifts this check entirely (visibility-model.md §8)
 * — but note exposure (Axis 1) above is NOT lifted; a Family Space post is
 * still only visible to Family Space members.
 */
export function viewerSatisfiesClassification(
  viewer: Viewer,
  classification: MediaClassification,
  isWithinViewersFamilySpace: boolean
): boolean {
  if (isWithinViewersFamilySpace) return true;

  switch (classification) {
    case "general":
    case "unclassified":
      // Unclassified media is shown as "processing", not hidden — see
      // moderation-pipeline.md §2. It is not treated as filtered content.
      return true;
    case "pending_review":
      // Frozen until a moderator decides. This pure axis returns false for
      // everyone; the uploader's own view is granted by canViewMedia's
      // uploader short-circuit (they always see their own content).
      return false;
    case "contains_women":
      return !viewer.filterSettings.hideContentWithWomen;
  }
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
    viewerSatisfiesClassification(
      viewer,
      media.classification,
      media.isWithinViewersFamilySpace
    )
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
  photo: { classification: MediaClassification; ownerId: string }
): boolean {
  // The owner always sees their own profile photo (same principle as
  // canViewMedia's uploader rule).
  if (viewer.userId === photo.ownerId) return true;
  if (!viewer.filterSettings.filterAppliesToAvatars) return true;
  return viewerSatisfiesClassification(
    viewer,
    photo.classification,
    /* isWithinViewersFamilySpace */ false
  );
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
  return { ...DEFAULT_FILTER_SETTINGS[gender] };
}
