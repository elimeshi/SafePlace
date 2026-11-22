# 0021 — Moderation Console Stack and the Media Lock

## Status

Accepted (2026-11-22). Records Phase 8 forks 1, 3, 4 and 8
(`docs/plans/phase-8-admin-portal.md` §2) and §10 question 8.

## Context

Phase 8 needs an internal tool for two groups: a hired team that classifies
images, and admins who judge people. Reviewers must never reach the admin
area (fork 1). The tool is used at a desk, for long sessions (fork 4).

The media the team sees can be graphic. The app's own rules hide filtered
media from users; staff need the opposite, so the console is an explicit
exception to the visibility model. That exception must be narrow and enforced
in the database (invariant #2).

## Decision

**The console is one Vite + React DOM SPA in `apps/moderation-console`, with a
`/review` area and an `/admin` area, one login, role-gated.** Desktop-first at
1440x900, usable down to 1280. (forks 1, 3, 4)

**Staff reach data only through RPCs in an exposed `console` schema, and no
staff role has a table grant anywhere.** (§4.2)

- The schema holds functions only. Every function calls `staff.require(...)`,
  writes `moderation.audit_log`, and returns rows shaped for one purpose.
- `console` is added to PostgREST's exposed schemas: `config.toml`
  `api.schemas`, and the hosted API settings, which Eli does when 8a is applied
  (§10 q8).

**Media is signed only under an active claim.** (§4.2)

- `console.review_media_path` returns a storage path only when the caller
  holds the task's active claim. It writes a `media_open` audit row.
- A `storage.objects` SELECT policy lets a staff caller sign a path only when
  `visibility.can_sign_review_media(path)` holds. Signed URLs live 60 seconds,
  set by the client and enforced again by the policy.
- An admin also needs a `staff.review_entries` row for the current session:
  the per-session acknowledgement after the warning ("this leads to possibly
  improper media") and an explicit confirm.
- Admin case views show media as chips only, never a path or thumbnail.

**The blur is a wellbeing measure, not access control.** (fork 8) Images load
blurred and grayscale. Reveal and colour are separate toggles, logged
best-effort through `console.review_log_reveal`. The access control is the
claim and the signed-URL policy.

A new package `@safeplace/console-client` wraps the `console.*` RPCs so the
mobile app never bundles staff calls.

## Alternatives considered

- **Two sites (review and admin).** Rejected (fork 3): two deploys, two
  logins. Role gating in one app, enforced again in SQL, is enough.
- **Next.js.** Rejected: no server rendering is needed for an internal,
  signed-in tool, and a static host is simpler.
- **Expo web.** Rejected: the console is dense, desktop, table-heavy and
  keyboard-driven. Sharing the RN codebase buys little and the mobile bundle
  would risk carrying staff code.
- **A deep link into the mobile app for message reports** (fork 25
  discussion). Rejected: staff are not app users, app RLS lets only
  participants read a thread, and the app shows media unblurred.
- **`public.console_*` functions.** Rejected (§10 q8): a separate schema keeps
  the staff surface out of the app's namespace and makes the "no grants"
  rule easy to audit.
- **Treating the blur as the control.** Rejected: CSS is not a security
  boundary.

## Consequences

- Hosted setup has a manual step: adding `console` to exposed schemas.
- Every console screen needs a matching RPC; there is no generic query
  access.
- The console is a deliberate exception to app visibility rules and is
  documented as `visibility-model.md` section 4b.
- Browser rules: `draggable=false`, context menu blocked, no storage of paths,
  URL dropped from memory on leave.
- Deployment to a static host belongs to production plumbing; 8a runs
  locally.
- Staff review of flagged media stays on legal tracker items #7 and #21.
