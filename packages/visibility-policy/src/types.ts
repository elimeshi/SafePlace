/**
 * Core types for the gender-conditioned visibility model.
 *
 * See docs/architecture/visibility-model.md for the full rationale.
 * Do not duplicate these types elsewhere — packages/shared-types and every
 * app should import from here for anything visibility-related.
 */

export type Gender = "male" | "female";

/**
 * The four classification groups (ADR 0018). Order is stable and is the order
 * every per-group structure in the product uses.
 */
export const CONTENT_GROUPS = ["sex", "violence", "religion", "addictions"] as const;
export type ContentGroup = (typeof CONTENT_GROUPS)[number];

/** A level the MODEL may report. 3 is prohibited content and never auto-publishes. */
export type ContentLevel = 0 | 1 | 2 | 3;
/** A level a VIEWER may accept. There is no viewer setting that opts into 3. */
export type ViewerMaxLevel = 0 | 1 | 2;

export const PROHIBITED_LEVEL = 3;

/** The top of each ladder. Addictions has two steps (Eli dropped "alcohol present"). */
export const MAX_LEVEL_BY_GROUP: Readonly<Record<ContentGroup, ContentLevel>> = {
  sex: 3,
  violence: 3,
  religion: 3,
  addictions: 2,
};

/** Resolved levels of one media item. NULL on the row until classified. */
export type ContentLevels = Readonly<Record<ContentGroup, ContentLevel>>;
/** The viewer's maximum accepted level per group. */
export type ViewerContentLevels = Readonly<Record<ContentGroup, ViewerMaxLevel>>;

export function isContentLevels(value: unknown): value is ContentLevels {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return CONTENT_GROUPS.every((g) => {
    const n = v[g];
    return Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_LEVEL_BY_GROUP[g];
  });
}

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
 * One audience a post (or any content) is addressed to. Orthogonal to
 * classification — evaluated independently.
 */
export type ContentAudience =
  | { kind: "public" }
  | { kind: "followers_only"; authorId: string }
  | { kind: "group"; groupId: string }
  | { kind: "family_space"; spaceId: string };

/**
 * Axis 1 (see visibility-model.md §2): who the content is addressed to. A
 * NON-EMPTY list of audiences (Phase 4 multi-select, plan §2a); content is
 * exposed to a viewer who satisfies ANY of them. Whether a given list is a
 * legal combination is `isAudienceSetValid`'s job, not the type's.
 */
export type ContentExposure = readonly [ContentAudience, ...ContentAudience[]];

export type PostStatus = "draft" | "published";
export type PostSourceKind = "profile" | "group" | "family_space";
export type GroupVisibility = "public" | "private_visible" | "private_hidden";
export type DiscoverableInSearch = "everyone" | "followers_only" | "nobody";
export type FeedPlacement = "followed" | "suggested" | "none";

/** What a visibility decision about a post needs to know. */
export interface PostContext {
  authorId: string;
  status: PostStatus;
  exposure: ContentExposure;
  sourceKind: PostSourceKind;
}

/** What a visibility decision about a comment needs to know. */
export interface CommentContext {
  authorId: string;
  post: PostContext;
}

/**
 * A user's personal consumption controls. One per user — see
 * docs/architecture/data-model.md "FilterSettings". Never read denormalized
 * copies of these flags from elsewhere; always resolve them from here.
 */
export interface FilterSettings {
  /**
   * DERIVED: equals `contentLevels.sex === 0`. Kept so existing readers keep
   * working; the DB holds it as a generated column. Never write it — write
   * `contentLevels.sex`.
   */
  hideContentWithWomen: boolean;
  /** Maximum accepted level per group (ADR 0018). */
  contentLevels: ViewerContentLevels;
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
  /**
   * Users with a block edge to or from the viewer (either direction: blocks
   * are mutual invisibility). The DB is the authority; this lets the pure
   * rules mirror it.
   */
  blockedUsers: ReadonlySet<string>;
  /** Users the viewer muted. Not a block: only feed + comment display. */
  mutedUsers: ReadonlySet<string>;
  /**
   * Users the viewer asked not to be suggested ("don't suggest" or "less like
   * this" feedback). Both stop suggestions while ordering is random.
   */
  suppressedSuggestions: ReadonlySet<string>;
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
    contentLevels: { sex: 0, violence: 0, religion: 0, addictions: 0 },
    hideWomenAccounts: true,
    showSuggestedPosts: true,
    genderSeparationInMessages: false,
    genderSeparationInSearch: false,
    filterAppliesToAvatars: true,
  },
  female: {
    hideContentWithWomen: false,
    // 1 = modest women visible, immodest not. Confirmed by Eli 2026-11-01.
    contentLevels: { sex: 1, violence: 0, religion: 0, addictions: 0 },
    hideWomenAccounts: false,
    showSuggestedPosts: true,
    genderSeparationInMessages: false,
    genderSeparationInSearch: false,
    filterAppliesToAvatars: false,
  },
};
