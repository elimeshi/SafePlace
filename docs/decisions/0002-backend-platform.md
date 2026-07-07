# 0002 — Backend Platform: Supabase

## Status

Accepted

## Context

The single highest-risk technical requirement in this product is enforcing
the gender-conditioned visibility graph at every layer, including the data
layer (`CLAUDE.md` invariant #2, `visibility-model.md` §6) — not just in
application code, which is one bug away from a data leak. The team is a
single primary developer working with an AI coding agent, which favors a
backend that minimizes undifferentiated infrastructure work.

## Decision

Use **Supabase** (managed Postgres + Auth + Storage) as the backend, with
**Postgres Row-Level Security (RLS)** as the primary mechanism for enforcing
visibility rules at the database tier.

## Alternatives considered

- **Custom backend (NestJS or FastAPI + Postgres)**: full control over the
  enforcement logic, and arguably clearer for a complex authorization model.
  Rejected for v1 primarily on velocity grounds for a single-developer team
  — RLS gives an equivalent (in some ways stronger, since it's
  un-bypassable even by a buggy API layer) enforcement guarantee with far
  less infrastructure to build and operate. Revisit if/when the moderation
  pipeline or classification logic outgrows what's comfortable to express
  as Postgres policies plus an edge function.
- **Hybrid (Supabase core + dedicated AI service)**: this is effectively
  what was chosen — see Consequences. Supabase handles core data, auth, and
  storage; `services/moderation-pipeline` is a separate service for the LLM
  classification workload, since that's a different operational profile
  (queue-driven, potentially using a different runtime/provider for vision
  model calls) than CRUD data access.

## Consequences

- RLS policies become the canonical enforcement layer described in
  `visibility-model.md` §6 — design these early, and test them as
  rigorously as application code. A missing or incorrect RLS policy is a
  silent data leak, not a visible bug.
- Supabase Auth handles signup/login; gender is stored as application data
  (in the `User`/`profiles` table), not as an auth claim, since it's
  user-editable (with the rate limit and delay from
  `06-settings-spec.md` §4.3.2) and drives `FilterSettings`, not access
  control to the auth system itself.
- Supabase Storage holds media; signed URLs (not public static URLs) are
  required so that a filtered viewer can't fetch a classified-and-hidden
  file even if they somehow obtain a reference to it (`data-model.md`,
  closing note).
- `services/moderation-pipeline` runs outside the main Supabase request
  path as an async worker (subscribing to upload events / a queue table),
  per `moderation-pipeline.md` §2 — uploads must never block on a
  synchronous classification call.
- This is a vendor dependency. If Supabase becomes a constraint at scale,
  the RLS-policy logic is, by design, the most portable part of this
  decision (it's just Postgres) — a future migration off Supabase's managed
  layer would preserve the policies themselves.
