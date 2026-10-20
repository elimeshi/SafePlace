# 0013 — Random Feed Ordering and the Ranking Seam

## Status

Accepted. Ordering is deliberately a placeholder; the seam is the lasting part.

## Context

The feed spec (`01-feed-spec.md` §2.1.3, §2.3.2, §3.3) defines a three-weight
ranking algorithm (interaction / activity / recency, starting at 40/30/30) whose
weights are explicitly "to be tuned via MVP field testing". Eli decided (Phase 4
planning, 2026-10-19) that ranking gets its own session ("per-user, super smart
niche detection") and that Phase 4 ships a random order. CLAUDE.md §8 forbids
inventing an algorithmic surface beyond the one specified.

A random order still has to paginate. `order by random()` gives each page a
different shuffle, so rows repeat or vanish between pages.

## Decision

The feed is ordered by a **per-visit seeded keyset**: the client draws a seed
once per feed visit (pull-to-refresh draws a new one) and pages with
`(sort_key, id) > (last_sort_key, last_id)` where `sort_key = md5(seed || id)`.
Pages are stable and each row appears exactly once per visit.

**`public.feed_page(p_seed, p_limit, p_after_key, p_after_id, p_suggested_percent)`
is the ranking seam.** It is the one SQL function (SECURITY INVOKER, so RLS
decides which posts exist for the caller; media resolved through
`media_items_visible`) plus the one api-client call that wraps it. The ranking
session replaces the function body; the client contract (seed in, page and
`sort_key` out) stays. `spaces_rail` and `follow_suggestions` use the same
seeded-random pattern under the same rule.

Which posts are *eligible* is not part of the seam: it is
`visibility.feed_placement(p)` (mirror of `postFeedPlacement` in
`visibility-policy`), returning `followed | suggested | none`. Ranking may
reorder; it may not widen eligibility.

**`suggested_percent`** (default 20) implements the "at most 1 in 5" cap on
suggested posts as an inclusion rate while ordering is random: a suggested
candidate is admitted when the first byte of its `sort_key` is below
`percent * 256 / 100`. It is a statistical cap, not an exact per-page ratio.
Suggestions also require `showSuggestedPosts` and a public personal post from
an author the viewer does not follow (no group posts until Phase 5, no
follow-graph or co-membership candidates, to avoid leaking edges: invariant #5).

No weights, no `feed_config` table, no per-user state were written.

## Alternatives considered

- **`order by random()` per request.** Unstable across pages. Rejected.
- **Chronological.** Simple and honest, but a different product decision than
  the one Eli made, and it would invite weights later by accident. Rejected.
- **Client-side shuffle of a fetched window.** Moves ordering out of the one
  seam and hands the client the full candidate set. Rejected.
- **Build the 40/30/30 algorithm now.** Weights are untuned and the ranking
  session is planned separately. Rejected as scope.
- **Offset pagination.** Skips and repeats rows when the set changes mid-visit.

## Consequences

- The ranking session has a single function and a single client call to
  replace; visibility is unaffected because eligibility sits in the policy rule.
- The seed is client-chosen and not a secret: it orders rows the caller may
  already read. It carries no visibility meaning.
- A post published mid-visit lands wherever its hash falls (the client pins the
  author's own new post to the top locally for the session).
- The 1-in-5 cap is probabilistic; revisit when ranking replaces it.
- Backlog §E "exact algorithm weights" remains open. No legal tracker change.
