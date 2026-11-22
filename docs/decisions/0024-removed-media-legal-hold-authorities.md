# 0024 — Removed Media, Legal Hold and Authorities Records

## Status

Accepted (2026-11-22). Records Phase 8 forks 22 and 23
(`docs/plans/phase-8-admin-portal.md` §2), §4.3 and §10 question 3.

## Context

A level-3 verdict removes media (ADR 0018, `content-categories.md` §2). The
bytes may be evidence, and some content (minors at risk) may have to be
reported to authorities. Deleting at once could destroy evidence; keeping
forever is a privacy and liability problem. Staff actions on sensitive
material also need a record nobody can edit.

## Decision

**`media_classification` gains a `removed` value.** (fork 22, §4.3)

- Removed media is hidden from everyone, the uploader included.
  `media_items_visible` and `media_url_permitted` never permit it, and the
  uploader carve-out excludes it.
- The uploader sees a neutral "the media was removed" placeholder on their own
  post (`resolveUploaderMediaState`). No appeal button until the Phase 7
  inbox. (§10 q3)
- `find_resolved_by_hash` ignores `removed` sources.

**Bytes are kept 90 days, then purged.** `purge_removed_media()` runs daily;
it deletes removed media past `removed_media_hold_days` that is not under a
legal hold, and the existing orphan queue removes the object. (fork 22)

**Legal hold.** `moderation.legal_holds` freezes deletion. A senior admin
releases it. `minors_risk` sets the hold automatically. (fork 22)

**Reporting to authorities is offline.** An admin records agency, date and
reference number in `moderation.authority_reports`; a senior admin is
notified on the dashboard. The console sends nothing outside. (fork 22)

**The audit log is append-only and records everything.** (fork 23)

- Insert only through `moderation.audit(...)`. No UPDATE or DELETE grant to
  anyone, and a trigger raises on update or delete.
- Senior admins read all of it, admins read conduct entries, reviewers read
  only their own history.
- Retention is 2 years (`audit_retention_days = 730`), a placeholder pending
  legal. `purge_audit_log()` runs monthly and is itself audit-logged.

## Alternatives considered

- **Delete immediately.** Rejected: evidence is lost and an appeal of a
  removal could not restore the media.
- **Keep removed media forever.** Rejected: unbounded retention of the most
  harmful material.
- **Show the uploader the removed media.** Rejected (§10 q3): that shows the
  prohibited content to its uploader again.
- **The console files reports with authorities.** Rejected (fork 22): the
  procedure and agency are unsettled; offline recording is the safe start.
- **A mutable log.** Rejected: an audit log that can be edited proves nothing.

## Consequences

- Every query reading media lifecycle must handle `removed`, and
  `media_levels_match_lifecycle` allows levels kept or null on it.
- An overturned prohibited verdict can restore media only within the hold
  window; after the purge the media is gone.
- Scheduled jobs use pg_cron when present, as in `20261020130100`.
- Legal items: #29 (retention and holds), #30 (authorities procedure), #31
  (audit retention, staff monitoring), #21 and #27.
