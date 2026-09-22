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
      return true;
    case "unclassified":
      // Fail CLOSED until the pipeline resolves the item. Classification is
      // asynchronous (moderation-pipeline.md §2), so there is a window
      // between upload and the worker's write in which nothing is known
      // about the content — serving the original during that window would
      // show a filtered viewer exactly what the filter exists to withhold.
      //
      // This withholds the reference, not the row: media_items stays
      // SELECTable so the UI can render a "processing" state (distinguished
      // from the filtered state by the classification value it is served
      // alongside). The uploader is unaffected — canViewMedia short-circuits
      // for them before this axis is evaluated.
      return false;
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
  | "filtered_for_some_viewers" // classified as containing women; notice applies
  | "published";

/**
 * Note what this is NOT: it never says the upload was blocked or rejected,
 * because it never is (master spec §3.5 — the legal core of the product). Every
 * state here describes where the media has got to, not a judgment of it.
 */
export function resolveUploaderMediaState(
  classification: MediaClassification,
  uploaderGender: Gender
): UploaderMediaState {
  switch (classification) {
    case "unclassified":
      return "processing";
    case "pending_review":
      return "under_review";
    case "general":
      return "published";
    case "contains_women":
      return shouldShowWomenDetectedNotice(classification, uploaderGender)
        ? "filtered_for_some_viewers"
        : "published";
  }
}

/**
 * Whether to show the neutral "women were identified in this media" notice
 * (master spec §3.5 / §4.4.2 — exact copy in @safeplace/shared-types).
 *
 * Shown to a male uploader only. That asymmetry is a deliberate gap, not a
 * rule: §4.4.2 carries an explicit ⏳ over whether a parallel notice should be
 * shown to a woman uploading content containing women, and an open question is
 * not an invitation to answer it in code. If that question is decided, this is
 * the single place that changes.
 *
 * Note this affects only what the uploader is TOLD. The filtering mechanism
 * itself is identical regardless of who uploaded the media — the product
 * classifies content, never users (invariant #1).
 */
export function shouldShowWomenDetectedNotice(
  classification: MediaClassification,
  uploaderGender: Gender
): boolean {
  return classification === "contains_women" && uploaderGender === "male";
}
