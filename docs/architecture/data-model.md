# Data Model — Conceptual Overview

> This is a conceptual entity map, not a SQL schema. It exists to give
> `packages/shared-types` and `packages/visibility-policy` a consistent
> vocabulary before any table is created in Supabase. Refine into actual
> migrations as implementation proceeds; update this doc when the real
> schema diverges meaningfully from what's sketched here.

## Core entities

### User
- `id`, `displayName`, `bio`, `avatarUrl` (or generic avatar fallback)
- `gender`: `'male' | 'female'` — declared at signup, changeable at most
  once per year with a 24-hour delayed activation (`06-settings-spec.md` §4.3.2)
- `genderChangedAt`, `genderChangeEffectiveAt` — for the rate limit + delay
- `filterSettings` → see **FilterSettings** below
- `privacySettings` (post default exposure, who can follow, who can message,
  discoverability in search, read-receipt visibility)
- `accountStatus`: `'active' | 'suspended' | 'frozen' | 'pending_deletion' | 'deleted'`

### FilterSettings (one-to-one with User)
- `hideContentWithWomen: boolean` (default: `true` for male, `false` for female)
- `hideWomenAccounts: boolean`
- `showSuggestedPosts: boolean` (default `true`, per `01-feed-spec.md` §7.1)
- `genderSeparationInMessages: boolean` (default `false`, per `09-messages-spec.md` §5.2.1)
- `genderSeparationInSearch: boolean` (default `false`, per `08-search-spec.md` §3.2.1)
- `filterAppliesToAvatars: boolean` ("filter sensitivity," `06-settings-spec.md` §3.3)

This is the object `packages/visibility-policy` consumes for every
classification-based check. There should be exactly one of these per user;
don't let individual screens read denormalized copies of these flags.

### Post
- `id`, `authorId`, `createdAt`, `text`, `editedAt`
- `exposure`: `'public' | 'followers' | 'group:<groupId>' | 'family_space:<spaceId>'`
- `sourceContext`: which surface it was created from (profile / group / family
  space) — drives the source label shown in the feed (`01-feed-spec.md` §2.3.4)
- `mediaItems`: ordered list of **MediaItem**
- `poll`, `locationTag` (place name only, never coordinates — `02-post-creation-spec.md` §3.5)
- `taggedUserIds`

### MediaItem
- `id`, `postId` (or `commentId` / `messageId` / `profileId` — media is
  polymorphic across surfaces, see the table in `visibility-model.md` §4;
  `profileId` is the avatar/profile-photo case — avatars are real classified
  media, per invariant #8, not a bare URL)
- `uploaderId`: author of the parent surface, denormalized so the frozen-media
  and block visibility checks avoid a parent join (see impl notes below)
- `storageUrl` (original, never exposed directly to a filtered viewer)
- `classification`: `'unclassified' | 'general' | 'pending_review' | 'contains_women'`
- `classificationConfidence`: raw model score — **not stored on this row and
  not exposed to clients.** It belongs to the pipeline's job record (Phase 3);
  only the resolved `classification` enum lives here.
- `classifiedAt`

### Comment
- `id`, `postId`, `authorId`, `parentCommentId` (nullable — null means
  top-level, non-null means level-2 reply; no level-3 nesting per
  `03-single-post-spec.md` §3.1)
- `text`, `mediaItems` (subject to the same classification pipeline)

### Group
- `id`, `name`, `description`, `color` (from a fixed palette), `icon`
- `visibility`: `'public' | 'private_visible' | 'private_hidden'`
  (`04-group-page-spec.md` §4)
- `postingPolicy`: `'open' | 'approval_required' | 'admin_only'`
- `adminUserIds`

### FamilySpace
- `id`, `name`, `adminUserId`
- `contentRules` (admin-defined; standard classification filtering does not
  apply for members inside this space — see `visibility-model.md` §8)
- Membership requires mutual accepted invite — no implicit membership.

### Follow
- `followerId`, `followedId`, `createdAt`
- Asymmetric (Instagram-style), per `00a-knowledge-base-fb-vs-ig.md` §6.3 and
  confirmed across the screen specs (profile shows follower/following counts
  without symmetric "friendship").

### Block
- `blockerId`, `blockedId`, `createdAt`
- Enforced as mutual invisibility in both directions — see
  `07-moderation-spec.md` §7.

### Message / Conversation / MessageRequest
- Conversations are 1:1 only for MVP (no group DMs — explicitly deferred,
  `09-messages-spec.md` §7).
- A `MessageRequest` is created instead of a `Message` when the sender is
  not followed by the recipient and no prior conversation exists
  (`09-messages-spec.md` §3.2). Accepting converts it into a normal
  conversation thread.

### Report
- `id`, `reporterId`, `targetType` (`post|comment|message|user`), `targetId`
- `category`, `freeTextExplanation`
- `status`: always routes to human review — never auto-resolved
  (`07-moderation-spec.md` §3.1)

### ModerationAction
- `id`, `targetUserId`, `decidedByModeratorId`, `reason`, `ruleViolated`
- `penaltyType`, `penaltyDuration`, `appealable: true`
- `appealStatus`, `appealDecidedByModeratorId` (must differ from the original
  decider — `07-moderation-spec.md` §6.3)

## Notes for the Supabase implementation

- Every table that holds user-generated content needs RLS policies that
  consult `FilterSettings` + the row's `exposure`/`classification` — see
  `visibility-model.md` §6. Plan the RLS policies for `Post`, `Comment`,
  and `MediaItem` first; they're the highest-traffic, highest-risk tables.
- `MediaItem.storageUrl` should sit behind a signed-URL or RLS-protected
  storage policy — never a publicly guessable static URL — since a filtered
  viewer must not be able to fetch the underlying file even if they obtain
  its reference some other way.

## Phase 1 implementation notes (where the schema diverged from this sketch)

The conceptual map above became `supabase/migrations/*.sql`. Where the concrete
schema made a deliberate choice, it's recorded here (this doc is the sketch; the
migrations are authoritative):

- **`FilterSettings` is its own table** (`filter_settings`, 1:1 with `profiles`,
  typed boolean columns) rather than a jsonb blob — so RLS predicates read
  individual flags directly and each flag stays independently editable
  (defaults-are-not-rules). `hideWomenAccounts` is stored but **not enforced**:
  `visibility-policy` exposes no rule for it (see the open-questions backlog,
  §J).
- **Avatars are real `media_items`** via a `profile_id` polymorphic branch, with
  `profiles.avatar_media_id` referencing the current one — so profile photos go
  through the same classification pipeline as any other media (invariant #8),
  and `canViewProfilePhoto` reads a genuine classification.
- **`media_items.uploader_id`** denormalizes the parent author (immutable) so the
  "uploader sees their own frozen media" and block checks need no parent join.
- **Enforcement is two-layer, both derived from `visibility-policy`:** RLS
  policies (exposure axis + blocks + frozen carve-out) plus two
  `security_invoker` read models — `media_items_visible` and `profiles_visible`
  — that withhold `storage_path`/`avatar` and set an `is_filtered` /
  `avatar_filtered` flag for viewers the classification filter applies to
  (the "placeholder, not leak" behaviour of visibility-model §6).
- **"Number without list"** (invariant #5) is `follower_count` /
  `following_count` / `group_member_count` SECURITY DEFINER functions; the
  underlying follow/membership rows are SELECT-visible only to their owner.
- Every rule above is proven to agree with `packages/visibility-policy` by the
  parity suite in `packages/db-testing` (ADR 0006).
