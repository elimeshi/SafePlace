# 0023 — Strikes Ladder and Enforcement

## Status

Accepted (2026-11-22). Records Phase 8 forks 15, 16, 17, 17b and 20
(`docs/plans/phase-8-admin-portal.md` §2), §3.4, §4.3, §4.4 and §10 question 7.

## Context

`account_status` exists but nothing enforces it, and nobody can issue a
penalty. Spec `07` §5 describes a ladder. Phase 8 must make penalties real in
the database (invariant #2) without a policy rewrite, without cron for
expiry, and without telling users more than the Phase 7 inbox can carry.

## Decision

**Strikes expire, and active strikes map to a penalty on a ladder.** (fork 15)

- One upheld minor offense is one strike, active for `strike_days` (90).
- `proposed = ladder[active_strikes + 1]`. Default ladder: warning,
  suspension 24h, suspension 7d, permanent ban.
- Active strikes are actions with `strike_expires_at > now()` and an appeal
  status other than `overturned`.
- The admin may go lower with a written reason. A ladder-reached permanent ban
  needs the admin to type the user's display name.
- **Direct track** (plan §3.4): `minors_risk` (ban, legal hold, authorities
  record), `physical_threat` (ban), `severe_harassment` (7-day suspension or
  ban), `dangerous_misinformation` (removal plus warning or suspension). No
  strike unless the admin ticks "also counts as a strike".

**Suspension is derived, not scheduled.** `profiles.suspended_until` is set;
a suspension is `suspended_until > now()`. The old `suspended` enum value is
left unused and documented. No expiry job. (fork 16)

**Banned is a new `account_status` value.** (fork 16)

- Suspended (24h or 7d): can browse, like, save, follow, report and appeal.
  Cannot post, comment, message, send a message request, or change avatar or
  bio. Existing content stays visible. Suspended users may still join groups
  and accept Family Space invites (§10 q5).
- Banned: can sign in only to a blocked screen with details and an appeal
  form.

**Write guards are restrictive RLS policies** (`as restrictive`, ANDed with
existing permissive ones), so no existing policy is rewritten. A banned caller
is blocked on every client-writable table. A suspended caller is blocked on
posts, comments, messages, message requests, media inserts, and the profile
fields display name, bio and avatar (via a column-checking trigger).
`visibility.account_write_allowed(action)` mirrors the policy rule, and
`SECURITY DEFINER` writers re-check it. (§4.4)

**Read-side hiding.** While a user is banned, their profile, posts and
comments are hidden from everyone through `post_visible`, `comment_visible` and
profile RLS; rows with `removed_at` are hidden too. They return if an appeal
overturns the ban. (fork 16, §4.4)

**Delivery.** Notices wait for the Phase 7 inbox. The exception (fork 17b):
the user is told only where blocked: a suspension banner, a sheet when they
try to post (with an appeal form), and a banned screen (with an appeal form).
Warnings and removals reach users silently until the inbox ships. Reporters
are never told the outcome. Appeals are text only, at most 1000 characters.
(forks 17, 17b, §10 q2)

**SLA lanes.** `urgent` 1h, `images` 4h, `standard` 24h, `appeals` 72h; at risk
at 75%. Values are senior-admin settings. The clocks pause on Shabbat and Yom
Tov, urgent included; urgent items still sort first. `moderation.sla_pauses`
holds the windows and `moderation.sla_due` adds working minutes. `sla_due_at`
is set at creation and not recomputed when config changes. (fork 20, §10 q7)

## Alternatives considered

- **Permanent strikes.** Rejected (fork 15): a user would never recover.
- **Automatic penalties from the ladder.** Rejected: the system proposes, an
  admin decides.
- **A cron job to flip suspension state.** Rejected: derived timestamps are
  simpler and cannot drift.
- **Rewriting each permissive policy.** Rejected: restrictive policies add the
  guard without touching existing rules.
- **Checking status only in the app.** Rejected: invariant #2.
- **Hiding banned users' content only in the UI.** Rejected: invariant #2.
- **Notifying users of every decision now.** Rejected (fork 17): no delivery
  channel exists before Phase 7.

## Consequences

- Policy package gains `accountWriteAllowed` and `ladderProposal`; each rule
  gets unit, SQL and parity tests.
- Every client-writable table gets a restrictive policy; adding a new one
  later must add its guard.
- A column-checking trigger is needed on `profiles` because RLS cannot see
  changed columns.
- With one admin, an urgent 1-hour night case waits for him (§10 q6).
- Penalties, rule wording and appeal rights are legal item #32; also #9 and
  #27. They must be cleared before production.
