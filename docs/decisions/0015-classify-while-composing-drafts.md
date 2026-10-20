# 0015 — Classify While Composing: Author-Only Drafts

## Status

Accepted.

## Context

Classification is asynchronous (ADR 0009) and publishing must never wait on an
LLM call (CLAUDE.md §5). The uploader notice (many users "will not be able to
see this media") is most useful *before* the author publishes, but the result
takes seconds. Invariant #8 requires all media, including media in an
unpublished composer, to go through the pipeline, and invariant #1 forbids
blocking upload by uploader plus classification.

## Decision

Attaching media starts the pipeline immediately by creating an **author-only
draft post**:

1. Client inserts a `posts` row with `status = 'draft'` (the insert policy
   requires `status = 'draft'`; clients never insert published).
2. Client adds `post_audiences` rows (allowed only while the post is a draft).
3. Client uploads media; the `media_items` insert trigger enqueues
   classification, as for every surface, while the user is still typing.
4. Client polls the uploader's own view of the media
   (`resolveUploaderMediaViews`).
5. Publish is a `draft -> published` UPDATE that is never gated on the result.
   `posts_guard` runs `visibility.post_publish_problem` (audience set valid,
   author still a member of every targeted group/space, source/audience
   consistency, quote rules) and stamps `published_at`.
   - Result already in: inline notice before publishing (Confirm / Back /
     Appeal).
   - Result not in yet: the notice appears afterwards on the author's own post
     (Understood / Remove media / Appeal).

Drafts are visible only to their author: `visibility.post_visible` returns
`author_id = auth.uid()` for drafts, and feed, comments, likes, saves and stats
all require `published`. A published post cannot return to draft, and its
audience, source and quote are locked against client roles.

**Purge:** `public.purge_abandoned_drafts(p_older_than interval default 24h)`
deletes stale drafts (media rows cascade; the storage objects are the caller's
to sweep). It is `service_role` only.

**Cleanup (added 2026-10-20, Eli):**
- *Scheduling.* Migration `20261020130100_draft_cleanup.sql` schedules the purge
  hourly (`pg_cron`, job `purge-abandoned-drafts`, 24h threshold). It is guarded:
  if the extension is not available (PGlite, CI) or cannot be created, the
  migration emits a notice and carries on, and the purge must be called by hand.
  On hosted Supabase enable `pg_cron` first.
- *Orphaned storage objects.* An `after delete` trigger on `media_items` queues
  the row's `storage_path` and `blurred_storage_path` in
  `moderation.orphaned_objects` (service-role only), so it covers the purge,
  a client "remove media", a discarded draft and any other cascade. SQL cannot
  delete bucket objects, so the classification worker (ADR 0009, the one
  runtime with the service role) runs `sweepOrphans` after each drain: read a
  batch, remove the objects through the Storage API, then acknowledge. A failed
  removal leaves the paths queued; removing a missing object is a no-op, so no
  claim lock is needed. Covered by the PGlite suite
  (`db-testing/draft-cleanup.test.ts`).
- *Client.* Compose also discards its own draft when the user leaves.

## Alternatives considered

- **Upload and classify on Publish.** Simplest, but the notice could only
  arrive after the post is live. Rejected.
- **Block Publish until classification returns.** Violates "never wait on an
  LLM call" and, with the uploader's identity in play, drifts toward invariant
  #1. Rejected.
- **Hold media client-side until publish.** Defeats the latency budget.
- **A separate drafts table.** Duplicates post columns and forces media to
  re-parent at publish; reusing `posts` keeps `media_items.post_id` stable.

## Consequences

- Abandoned drafts and their storage objects are cleaned automatically (see
  Cleanup above); production needs `pg_cron` enabled and the worker deployed
  (ADR 0009) for the object sweep.
- Compose uploader notice (Eli, 2026-10-20): Confirm keeps the media; Back
  removes it; Appeal keeps it and files the appeal; Publish with the notice
  unanswered is treated as Confirm.
- Media is scanned from the moment it is attached, including media never
  published. **Legal tracker #7 stays 🔴**; a note records that counsel should
  also consider scanning of unpublished draft media.
- Every read path must keep the `published` requirement; `post_visible` is the
  one place the draft rule lives.
