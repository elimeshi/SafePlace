/**
 * Core types for the gender-conditioned visibility model.
 *
 * See docs/architecture/visibility-model.md for the full rationale.
 * Do not duplicate these types elsewhere — packages/shared-types and every
 * app should import from here for anything visibility-related.
 */

export type Gender = "male" | "female";

/**
 * The resolved classification state of a single media item, as produced by
 * the moderation pipeline (services/moderation-pipeline). UI and policy
 * code must only ever read this resolved enum — never a raw model
 * confidence score. See docs/architecture/moderation-pipeline.md.
 */
export type MediaClassification =
  | "unclassified" // queued, not yet scored
  | "general" // low probability of containing women — unfiltered
  | "pending_review" // medium probability — frozen pending human moderation
  | "contains_women"; // high probability — subject to viewer filtering

/**
 * Axis 1 (see visibility-model.md §2): who the content is addressed to.
 * Orthogonal to classification — evaluated independently.
 */
export type ContentExposure =
  | { kind: "public" }
  | { kind: "followers_only"; authorId: string }
  | { kind: "group"; groupId: string }
  | { kind: "family_space"; spaceId: string };

/**
 * A user's personal consumption controls. One per user — see
 * docs/architecture/data-model.md "FilterSettings". Never read denormalized
 * copies of these flags from elsewhere; always resolve them from here.
 */
export interface FilterSettings {
  /** Hide media classified as containing women. */
  hideContentWithWomen: boolean;
  /** Hide accounts that are tagged/flagged as women's accounts. */
  hideWomenAccounts: boolean;
  /** Show algorithmically suggested posts from non-followed sources. */
  showSuggestedPosts: boolean;
  /** Apply gender separation within direct messages. */
  genderSeparationInMessages: boolean;
  /** Apply gender separation within search results/discoverability. */
  genderSeparationInSearch: boolean;
  /** Whether the content filter also applies to avatars/profile photos. */
  filterAppliesToAvatars: boolean;
}

/**
 * The minimal viewer context every visibility check needs. Construct this
 * once per request/render from the authenticated user, not ad hoc per
 * check.
 */
export interface Viewer {
  userId: string;
  gender: Gender;
  filterSettings: FilterSettings;
  /** Group IDs the viewer is a member of — needed for group-exposure checks. */
  groupMemberships: ReadonlySet<string>;
  /** Family space IDs the viewer is a confirmed member of. */
  familySpaceMemberships: ReadonlySet<string>;
  /** User IDs the viewer follows — needed for followers-only exposure checks. */
  following: ReadonlySet<string>;
}

export interface MediaItemContext {
  classification: MediaClassification;
  exposure: ContentExposure;
  /**
   * The id of the user who uploaded this media. The uploader always sees their
   * own content — regardless of classification or their own filter settings —
   * so canViewMedia short-circuits to true when viewer.userId === uploaderId.
   */
  uploaderId: string;
  /**
   * True if this media is being evaluated within the context of a
   * confirmed Family Space the viewer belongs to. When true, standard
   * classification-based filtering is lifted for this item — see
   * visibility-model.md §8. This must be computed from the actual
   * space/membership relationship, never inferred from exposure alone.
   */
  isWithinViewersFamilySpace: boolean;
}

/**
 * Default FilterSettings assigned at signup, by declared gender.
 * See docs/product/00-master-spec.md §4.3.1 and §6.2.3.
 *
 * These are *defaults*, not rules — every field here must remain
 * independently user-editable post-signup. See visibility-model.md §5 for
 * why this distinction is legally load-bearing, not cosmetic.
 */
export const DEFAULT_FILTER_SETTINGS: Record<Gender, FilterSettings> = {
  male: {
    hideContentWithWomen: true,
    hideWomenAccounts: true,
    showSuggestedPosts: true,
    genderSeparationInMessages: false,
    genderSeparationInSearch: false,
    filterAppliesToAvatars: true,
  },
  female: {
    hideContentWithWomen: false,
    hideWomenAccounts: false,
    showSuggestedPosts: true,
    genderSeparationInMessages: false,
    genderSeparationInSearch: false,
    filterAppliesToAvatars: false,
  },
};
