# apps/web (not yet started)

Desktop web is **not** a decided/built surface yet — see
`docs/decisions/0001-client-platform.md` "Consequences". Expo's web target
can serve as a stopgap; a dedicated Next.js app here is one option if the
desktop experience (centered ~600px column, distinct side-column content
per `docs/product/01-feed-spec.md` §5.2, explicitly marked "to be planned
in full separately") ends up warranting its own codebase.

Don't start building here without first adding an ADR that supersedes or
extends 0001 — this is a real architectural decision, not a default to
fall into.
