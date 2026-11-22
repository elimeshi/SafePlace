# 0025 — Dedupe Override Propagation

## Status

Accepted (2026-11-22). Records Phase 8 fork 19
(`docs/plans/phase-8-admin-portal.md` §2). Closes the follow-up raised in ADR
0019 and tracked in `open-questions-backlog.md` §K.

## Context

ADR 0019 copies a resolved verdict to byte-identical re-uploads (exact SHA-256
only, per its 2026-11-02 amendment). It left one gap: a human re-levelling the
source item did not reach the copies, so a corrected image could stay wrong
elsewhere. Phase 8 introduces human decisions on media tasks (ADR 0022) and a
`removed` lifecycle value (ADR 0024), so the gap now matters.

## Decision

**A reviewer decision applies to every media item with the same SHA-256 and
closes their open tasks.** (fork 19)

- The decision writes one `moderation.media_decisions` row per item touched,
  copies marked with `propagated_from`, so an overturn can restore each
  previous state.
- A **prohibited** verdict removes every copy (ADR 0024).
- A **conduct case** (`prohibited_media`) opens only for the uploader of the
  decided task, not for the uploaders of copies.
- Only exact SHA-256 equality propagates; the dHash never does (ADR 0019
  amendment).

## Alternatives considered

- **No propagation.** Rejected: leaves copies wrong after a correction.
- **Propagate to near-duplicates by dHash.** Rejected: the dHash is forgeable
  (ADR 0019 amendment).
- **Open a case for every copy's uploader.** Rejected: a re-share is not the
  same act as the original upload, and a person who forwarded a file should not
  be penalised automatically. An admin can still open a case.
- **Let each copy keep its own task.** Rejected: the team would classify the
  same bytes repeatedly.

## Consequences

- The decision RPC updates many rows in one transaction and must cope with
  large copy sets.
- Overturning a decision restores from `previous_classification` and
  `previous_levels`.
- `open-questions-backlog.md` §K item "Dedupe and moderator overrides" is
  resolved.
