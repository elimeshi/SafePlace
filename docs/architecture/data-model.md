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
- `id`, `postId` (or `commentId` / `messageId` — media is polymorphic across
  surfaces, see the table in `visibility-model.md` §4)
- `storageUrl` (original, never exposed directly to a filtered viewer)
- `classification`: `'unclassified' | 'general' | 'pending_review' | 'contains_women'`
- `classificationConfidence`: raw model score, **not** exposed to clients —
  only the resolved `classification` field is.
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
