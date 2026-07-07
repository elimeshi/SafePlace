# @safeplace/api-client

Typed Supabase client wrapper and query helpers.

**This package is the sanctioned way apps talk to Supabase.** It exists so
that visibility-sensitive queries are written once, reviewed once, and
reused — not reimplemented ad hoc in every screen. See
`docs/architecture/visibility-model.md` §6: this package is the *second*
line of defense (API layer). Row-Level Security in Postgres is the first
and most important line — never rely on this package's query shape alone
to keep filtered content from a viewer who shouldn't see it. If an RLS
policy is missing, a bug here becomes a data leak, not just a UI glitch.

## What's here

- `client.ts` — Supabase client factory.
- `viewer-context.ts` — builds the `Viewer` object
  `@safeplace/visibility-policy` needs, from the authenticated user. Call
  this once per request/screen load.

## What's not here yet

Actual per-entity query helpers (fetch feed, fetch post, create post, etc.)
will be added as each screen is implemented — see `.claude/commands/new-screen.md`
for the workflow. Add them here, not inline in screen components, so the
next screen that needs the same data doesn't reinvent the query.
