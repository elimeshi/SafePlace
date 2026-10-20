# 0016 — Likes Are Number-Only

## Status

Accepted. Backlog §G (like-list visibility) stays open.

## Context

`03-single-post-spec.md` §4.1 describes a like list that is currently public
and "to be revisited". CLAUDE.md invariant #5 ("number without list") says the
lists behind counts are never exposed to anyone but the user themself
(`05-personal-area-spec.md` §2.5). A public list of likers is the same kind of
edge disclosure. Both are product sources of truth and they conflict.

## Decision

**Invariant #5 wins over `03` §4.1: likes are a number, never a list.**

- `post_likes` and `comment_likes` rows are SELECT-visible only to their owner;
  insert requires an own `user_id` and a published post; delete only own rows.
- Counts are served by `public.post_stats(post_ids)` and
  `public.comment_stats(comment_ids)`: SECURITY DEFINER (likes are private
  rows), capped at 100 ids per call, and every id is first filtered through
  `visibility.post_visible` / `visibility.comment_visible`, so no count is
  returned for anything the caller cannot see. `post_stats` returns
  `like_count`, `comment_count`, `viewer_liked`, `viewer_saved`; `comment_stats`
  returns `like_count` and `viewer_liked`.
- `comment_count` counts only comments passing `comment_visible`, so blocked
  and muted authors are excluded and the number matches what the viewer sees.
- In the UI the counter is not tappable (comment likes likewise). An active
  like is indigo `#2E3A8C`.

The `03` §4.1 text was not edited (CLAUDE.md §6). Backlog §G "like-lists public
or configurable" stays open: a list would need a product decision on the
invariant itself.

## Alternatives considered

- **Public like list as in `03` §4.1.** Violates invariant #5. Rejected.
- **List visible to the post's author only.** Still an edge list and an
  unapproved exception to the invariant. Deferred to Eli.
- **Denormalized `like_count` on posts.** Cheaper reads, but a second source
  that must agree with the rows and would bypass the visibility filter.
  Rejected for now; `post_stats` is batched.

## Consequences

- No UI or API path may expose liker identities; a future "liked by" feature
  must come back through this ADR.
- Counting is a live aggregate; revisit if hot posts make it slow.
- **Legal tracker #16 stays 🔴** (public counts); a note records that it now
  covers like and comment counts as well.
