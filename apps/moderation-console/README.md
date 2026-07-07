# apps/moderation-console (not yet started)

The internal tool human moderators use to work the review queue described
in `docs/architecture/moderation-pipeline.md` §4 ("Human review queue") and
`docs/product/07-moderation-spec.md`. Explicitly future work — the current
priority (see `docs/decisions/0003-first-push-scope.md`) is the end-user
mobile app.

When this is started, it should consume `@safeplace/api-client` and
`@safeplace/shared-types` like any other app, and its access patterns
(staff-only, sees unfiltered/flagged content by design) need their own
Row-Level Security policies — do not reuse end-user RLS policies for staff
access; moderators legitimately need to see content regular viewers don't,
which is a different, explicit exception from the Family Space exception
in `docs/architecture/visibility-model.md` §8.
