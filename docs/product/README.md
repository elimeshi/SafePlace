# Product Specs

This is the source of truth for *what* Safe-Place does. These are Eli's
original characterization documents (Hebrew, RTL), lightly cleaned up for
the repo — page-number artifacts stripped, filenames normalized to English,
content otherwise unchanged. **Do not edit these to reflect implementation
decisions.** If something here conflicts with reality once built, raise it
as a question rather than silently editing the spec out from under it.

## Reading order

1. **`00-master-spec.md`** — vision, core principles, the legal framing
   (read this before anything else — it explains *why* the product is built
   the way it is, not just *what* it does), the spaces model
   (public/community/family), the consumption mechanism, and the 3-step
   onboarding wizard.
2. **`00a-knowledge-base-fb-vs-ig.md`** — background research comparing
   Facebook and Instagram's structural models, used to justify the design
   choices in the master spec. Read for context, not for new product
   decisions.
3. **`01-feed-spec.md`** — the main feed (v2, supersedes §5.2 of the master
   spec).
4. **`02-post-creation-spec.md`** — post/status creation screens.
5. **`03-single-post-spec.md`** — the open single-post screen, comments,
   sharing.
6. **`04-group-page-spec.md`** — the group page, visibility tiers, posting
   policy.
7. **`05-personal-area-spec.md`** — public profile + the private personal
   area (inbox, family spaces, saved posts).
8. **`06-settings-spec.md`** — the settings screen, dangerous-action
   double-confirmation flows.
9. **`07-moderation-spec.md`** — AI classification, reporting, human
   moderation, appeals.
10. **`08-search-spec.md`** — search, ranking, discovery.
11. **`09-messages-spec.md`** — private messaging.

## Status

All 11 documents represent a **complete** characterization pass — see
`09-search-spec.md` §9 ("סיום אפיון המוצר"). What's explicitly **not** yet
decided is tracked centrally in `docs/decisions/open-questions-backlog.md`
(97 items) and `docs/legal/legal-tracker.md` (25 items needing attorney
review) — don't assume a gap here is an oversight; check those two files
first.

## Symbols used inside these documents

- **⏳ לתכנון בהמשך** ("to be planned later") — an explicitly deferred
  decision. Compiled in `docs/decisions/open-questions-backlog.md`.
- **⚖ טעון אישור משפטי** ("requires legal sign-off") — compiled in
  `docs/legal/legal-tracker.md`.
- **★ עיקרון מפתח** ("key principle") — a load-bearing design decision;
  treat these as close to invariant as product decisions get.
