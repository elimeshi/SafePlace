# 0020 — Staff Identity and Roles

## Status

Accepted (2026-11-22). Records Phase 8 forks 5 and 6
(`docs/plans/phase-8-admin-portal.md` §2).

## Context

Phase 8 adds a hired team that reviews flagged media, and admins who judge
people. Both need to sign in to an internal console. Staff are not users of
the product: they must not appear in the app, have no profile, no filter
settings, and no place in the visibility graph. Staff also see sensitive
material, so a stolen password must not be enough, and a person who leaves must
lose access at once.

Constraints: invariant #2 (every layer enforces), so the role and the second
factor must be checked in the database, not only in the console UI.

## Decision

**Staff are separate Supabase Auth accounts flagged `app_metadata.staff =
true`, with no profile, created by invite only, with TOTP 2FA required and
checked in SQL.** (forks 5, 6)

- `handle_new_user` returns early when `raw_app_meta_data ->> 'staff' = 'true'`,
  so a staff account gets no `profiles` row and no filter settings. (§4.1)
- Roles live in `staff.members`: `reviewer`, `admin`, `senior_admin`. The
  capability table is plan §3.2. Eli is the first senior admin.
- `staff.current_role()` returns the role only when the caller is an active
  member and the JWT has `aal = 'aal2'`. It returns null otherwise.
  `staff.require(min_role)` raises when the role is not enough. Every
  `console.*` function starts with it. (§4.1, §4.2)
- `visibility.is_staff()` lets app-facing functions treat a staff caller as no
  user.
- Deactivation sets `active = false`. It takes effect on the next call because
  the check reads the table, not the token.
- The first senior admin is created by a script
  (`bootstrap-staff.ts <email> senior_admin`, service role). Later invites go
  through `POST /staff/invite`, which returns a one-time link for the senior
  admin to pass on (8b, §4.2 "Staff invite"). No SMTP is needed.
- `moderation_actions.decided_by_moderator_id` and
  `appeal_decided_by_moderator_id` point to `auth.users`, not `profiles`,
  because staff have no profile. (§4.1)

## Alternatives considered

- **Staff as normal app accounts with a role flag.** Rejected: they would have
  profiles, appear in search and groups, and the product-versus-staff
  boundary would rest on a flag in `profiles`.
- **A separate identity provider (SSO).** Rejected for now: a new vendor and
  a new trust boundary for a small team. Supabase Auth already offers TOTP.
- **Open sign-up with admin approval.** Rejected: invite-only means no
  unknown account can ever exist (fork 5).
- **2FA enforced only in the console UI.** Rejected: a direct RPC call would
  skip it.

## Consequences

- Every staff function pays one table lookup for the role and the `aal` check.
- Staff cannot use the mobile app with their staff login. A staff member who
  is also a user keeps a separate app account.
- Role changes and deactivation are audit-logged (ADR 0024).
- The invite handler and bootstrap script need the service role and run
  beside the classification worker (ADR 0009).
- Staff structure, training and wellbeing remain legal tracker item #21.
