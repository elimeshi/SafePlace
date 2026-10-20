# 0014 — Explicit-Only Interaction Signals

## Status

Accepted.

## Context

The eventual ranking session will want behavioural signal. Social products
commonly harvest passive signals (time on post, dwell, opens, visits), which is
also the engagement-bait pattern the master spec avoids (CLAUDE.md §8,
`00a-knowledge-base-fb-vs-ig.md` §5.3). CLAUDE.md also forbids inventing new
data collection or analytics instrumentation. Whatever is stored now becomes
the substrate ranking is built on, and is hard to retract.

## Decision

The only recorded interaction signals are **explicit user actions**: like
(`post_likes`, `comment_likes`), comment, save (`post_saves`), share-to-group
(a quote post), mute (`user_mutes`), and suggestion feedback
(`suggestion_feedback`, kinds `less_like_this` and `dont_suggest`). **No
time-on-post, no open or visit logging, no impression table.**

Every one of these tables is RLS-private to its owner (SELECT own rows only).
Other users only ever see aggregates, through the `post_stats` /
`comment_stats` SECURITY DEFINER functions (ADR 0016).

`less_like_this` is stored as its own kind even though, while ordering is
random, it has the same effect as `dont_suggest` (stop suggesting that author),
so the ranking session can treat it properly later.

Time-on-post was added to `open-questions-backlog.md` (§E) as a question for
Eli, not assumed either way.

## Alternatives considered

- **Log opens/dwell now "for later".** Collects data nobody has approved a use
  for; contradicts the no-analytics rule. Rejected.
- **Count impressions to avoid re-showing posts.** Same objection, and the
  seeded random order does not need it.
- **Fold `less_like_this` into `dont_suggest`.** Loses information ranking will
  want, at no saving. Rejected.

## Consequences

- Ranking can use only explicit signals until Eli decides otherwise;
  time-on-post is a product and privacy decision (likely a legal one too) to
  raise then.
- The private signal tables are small and need no retention job beyond the
  account-deletion cascade.
- Legal tracker: no status change; #16 (counts) is the nearest item, see
  ADR 0016.
