# @safeplace/moderation-pipeline

Async LLM content classification worker + human moderation queue backend.
See `docs/architecture/moderation-pipeline.md` for the full design.

## Status

**Skeleton only.** This service defines the required shape and invariants
of the classification pipeline but does not yet integrate with a real
queue or vision-model provider — both are open decisions (LLM vendor
selection is tracked in `docs/decisions/open-questions-backlog.md`).

## What's here

- `classification.ts` — the three-tier confidence-band model
  (low/medium/high → general/pending_review/contains_women), with
  placeholder thresholds explicitly marked as pending real tuning data.
- `notice-copy.ts` — the exact, spec-mandated Hebrew copy shown to
  uploaders, centralized so it's never duplicated or silently reworded
  across screens.
- `index.ts` — the worker entry point skeleton and its non-negotiable
  invariants (async, never blocking publish; every upload surface routes
  through here; only the resolved classification enum is exposed
  downstream).

## Before implementing this for real

Read `docs/architecture/moderation-pipeline.md` in full, and use
`.claude/commands/wire-moderation.md` when connecting a new upload surface.
