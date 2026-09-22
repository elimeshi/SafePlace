# 0009 — Classification Worker Runtime

## Status

Accepted

## Context

The classification pipeline must not sit in the synchronous publish path
(ADR 0002, `moderation-pipeline.md` §2) — an upload is accepted immediately
and classified afterwards. That makes the worker a separate runtime, and the
question is which one, because the answer determines the queue design.

Constraints that bear on it:

- **No long-lived process on a developer machine.** Eli's direction: the
  worker is part of the backend and gets deployed somewhere (Vercel was named
  as the likely target), not run as a daemon on a laptop.
- **The service role is required.** Media is immutable client-side — there is
  no UPDATE policy on `media_items` for `authenticated` (migration 0003) — so
  only a service-role writer can move a classification. That key may never
  reach a client.
- **Fail-closed visibility raises the cost of being slow.** Since migration
  0007 an unclassified item is withheld from everyone but its uploader, so
  queue latency is now visible to users as "my post's photo isn't showing
  yet."
- **Classification is ~1–2s per image** and bounded by an external API, so the
  work is IO-bound and trivially parallel.

## Decision

**A Postgres-backed job queue drained by a stateless HTTP handler, fired on a
schedule.** `moderation.classification_jobs` is the queue; jobs are claimed
with `select ... for update skip locked`; the worker is a function that takes
a `Request`, drains one batch, and returns a `Response`. It holds no state
between invocations and assumes nothing about being a singleton.

Enqueueing is a trigger on `media_items` insert, not an application call — see
Consequences.

## Alternatives considered

- **A long-running Node worker** subscribing to Supabase Realtime. The obvious
  shape for a queue consumer, and the easiest to reason about. Rejected on
  Eli's direction: it needs a host that runs processes, which is a different
  deployment story from the rest of the backend, and it would have meant
  running it locally during development.
- **A Supabase Edge Function on a cron schedule.** Closest to the data and
  needs no extra platform. Rejected as the primary path because it is a Deno
  runtime, which would mean a second toolchain and a second copy of the
  classifier code alongside the Node service — but note the handler's shape
  was chosen so this stays available: it is a `Request → Response` function
  with no Node-only assumptions in its control flow.
- **Cloudflare Workers.** A live CF token sits in the repo root, so this may
  already be the intent elsewhere. Rejected for this service: Workers have no
  long-lived execution model either, so it offers nothing over a scheduled
  function here, while adding a third platform and a separate secret store.
  Worth revisiting only if the rest of the backend moves there.
- **Enqueueing from the API layer** instead of a database trigger. Rejected —
  see below; this was the most consequential sub-decision.

## Consequences

- **Invariant #8 stops depending on anyone remembering it.** Enforced in an
  API handler, "every media surface goes through the pipeline" is a promise
  each future upload surface has to keep. Enforced by a trigger on the row's
  own insert, a surface that skips the pipeline cannot exist. The cost is that
  the enqueue is invisible in application code, which this ADR and the
  migration comment exist to offset.
- **Concurrency is the database's problem, not a coordinator's.** `skip
  locked` means overlapping invocations are safe and horizontal scale is free;
  no leader election, no lock service.
- **Deployment is not yet done.** The handler exists and is tested; wiring it
  to a specific platform's scheduler, with its secret store, is follow-up work.
  The shared secret (`MODERATION_WORKER_SECRET`) is required for the endpoint
  to serve at all.
- **Polling latency is now a product-visible number.** Scheduler granularity
  adds to the time media stays withheld. If a minute proves too slow, the
  mitigation is a nudge — having the insert trigger also signal the worker —
  rather than a change of runtime.
- **Retries and poison handling live in SQL** (`fail_classification_job`), so
  they apply identically to whatever invokes the handler.
