# 0017 — Multi-Audience Exposure

## Status

Accepted, with two points **PENDING Eli's confirmation**:

1. "A Family Space never mixes with a non-Family-Space audience." It is what
   the locked design shows and what is built, in exactly one place per layer
   (see Decision), so reversing it is a small change, but the carve-out depends
   on it.
2. The share rule reading below ("all audiences are public groups").

## Context

Eli changed the exposure picker (2026-10-20) from a single choice to a
**multi-select** (lab screens `exposure`, `exposureGroups`).
`02-post-creation-spec.md` §4.2 still describes a single choice; it is a product
doc and was not edited (a clarification note is flagged in
`open-questions-backlog.md`). The old schema had `posts.exposure_kind /
exposure_group_id / exposure_space_id`, which cannot hold a set.

## Decision

- **Data:** `post_audiences(post_id, kind, group_id, space_id, position)`, at
  least one row per post, unique per target; `position` records pick order. The
  three `exposure_*` columns are dropped from `posts` (existing rows migrated).
  `profiles.default_post_exposure` stays single-valued and seeds the picker.
  `source_*` is unchanged.
- **Visibility is OR:** a post is visible if the viewer satisfies **any**
  audience and there is no block (`viewerSatisfiesExposure` takes a non-empty
  list; SQL mirror `visibility.audience_satisfied` / `post_visible`).
- **Combination rule, one place:** `isAudienceSetValid` in `visibility-policy`,
  mirrored by `visibility.audience_set_valid`. At least one audience; public is
  exclusive (it includes everyone); a Family Space never mixes with a
  non-Family-Space audience (several Family Spaces together are fine). Checked
  on every audience insert (trigger) and again at publish. Nothing else may
  restate it.
- **Membership:** the author must be in every targeted group/space, checked at
  insert and re-checked at publish. From a group or Family Space entry point
  the audience is locked to that one space (`02` §4.3); multi-select applies
  only from the profile/feed entry. A group-source post must target exactly its
  own group; likewise a Family Space post.
- **Family Space carve-out** (`visibility.media_in_viewers_family_space`):
  applies when the viewer belongs to one of the post's Family Space audiences.
  Safe only because Family Spaces never mix: lifting classification there
  cannot expose media addressed to a non-family audience.
- **Feed:** Family Space posts are never in the main feed (placement `none`);
  they appear only in `spaces_rail` previews and the single-post screen.
- **Source label:** group/space entry shows that space; profile posts show
  `פוסט ציבורי` if public, else the first of the post's group audiences the
  viewer belongs to, else `לעוקבים`; the author sees the first audience they
  picked. `feed_page` returns only the audiences the caller satisfies (the
  author sees all of theirs), so a private group the viewer is not in is never
  named.
- **Sharing (`03` §5.3) with sets:** `canSharePostInternally` /
  `visibility.can_share_internally`: the post is published and visible, the
  viewer is in the target group, no Family Space audience, and one of: the post
  is public; the target group is already one of its audiences; or **every
  audience is a public group** (and there is at least one). The plan text said
  "every group audience is a public group"; the code reads it over all
  audiences, the stricter reading, flagged for confirmation. Copy link only for
  a post whose sole audience is public. A quote post (share-to-group) must have
  exactly one group audience.
- **Mute** (`user_mutes`) is silent and not a block. It extends beyond the
  feed: a muted author's comments are hidden from the muter
  (`canViewComment`) and do not count in `comment_count`. It never affects
  reachability of the post itself (`canViewPost` ignores mute).
- Published posts lock audience, source and quote against client roles;
  audience rows change only while the post is a draft (ADR 0015).

## Alternatives considered

- **Array column on `posts`.** No FK integrity to groups/spaces and awkward RLS
  joins. Rejected.
- **Allow Family Spaces to mix with other audiences.** One media row would
  fall under two classification regimes, making the carve-out unsafe. The
  pending rule exists to prevent that.
- **AND semantics.** Contradicts "who is this addressed to".
- **Edit `02` §4.2.** Forbidden by CLAUDE.md §6; flagged instead.

## Consequences

- If Eli rejects the no-mixing rule, the carve-out must be redesigned
  (per-media regime) before `isAudienceSetValid` and `audience_set_valid` are
  loosened together.
- The share-rule reading may change on Eli's answer.
- Legal tracker #14 (Family Space exception wording) is adjacent; no status
  change.
