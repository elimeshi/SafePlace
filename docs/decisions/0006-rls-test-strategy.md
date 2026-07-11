# 0006 — RLS Test Strategy

## Status

Accepted

## Context

Postgres Row-Level Security is the canonical, un-bypassable enforcement tier
for the gender-conditioned visibility graph (ADR 0002, invariant #2). A
missing or incorrect policy is a silent data leak, not a visible bug, so RLS
must be tested as rigorously as application code (`visibility-model.md` §6).
The visibility rules are two orthogonal axes — exposure and gender
classification — evaluated together on every read, which is a large matrix to
cover. `packages/visibility-policy` already unit-tests the *decision function*;
what is untested is whether the *database* actually enforces the same decision.
This ADR records the approach Phase 1 will implement, before any RLS is
written.

## Decision

Test RLS with **integration tests that exercise policies through the Supabase
client as distinct signed-in users**, run against a **local `supabase start`**
(CLI + Docker) instance seeded with a fixture matrix. Each test signs in as a
seeded user with known `filterSettings`/gender/memberships, queries UGC tables
(`posts`, `comments`, `media_items`, …), and asserts the row set the viewer
receives matches `visibility-policy`'s decision for the same inputs — proving
the DB and the policy package agree. The suite covers the exposure × classification
matrix, the Family Space exception, and blocks. These run in CI against the
local stack, not a hosted project.

## Alternatives considered

- **pgTAP unit tests inside Postgres** — precise per-policy assertions in SQL,
  and useful for pinning individual policy predicates. Considered as a
  complement, but chosen as secondary: it tests policies in isolation, whereas
  the integration approach tests the same access path a real client uses
  (auth context + PostgREST + RLS together), which is where leaks actually
  occur. May be added later for tricky individual policies.
- **Application-layer tests only (through `api-client`)** — insufficient:
  they would pass even if RLS were disabled, since the app layer also filters.
  RLS must be proven independently, so tests query the DB as the user directly.
- **Testing only against a hosted Supabase project** — slower, not
  hermetic, and couples CI to live credentials. Local-first keeps the suite
  reproducible; the same migrations deploy to the hosted project (ADR 0002).

## Consequences

- Phase 1 adds a `supabase/` directory (migrations, RLS policies, seed) and a
  local-stack test harness; CI gains a step that boots the local Supabase
  stack. This is heavier CI than pure unit tests, and is justified by RLS
  being the enforcement backstop.
- The seed fixture becomes a shared asset: the same seeded users/content drive
  both RLS tests and `api-client` query-helper tests.
- Tests assert DB and `visibility-policy` agree, so a divergence (a policy
  drifting from the decision function) fails CI — keeping the two enforcement
  layers in lockstep as required by invariant #2.
- Confidence thresholds and classification values are treated as fixtures, not
  hardcoded percentages, matching ADR 0004.

## Implementation note (Phase 1)

The strategy above is realized as **two complementary suites that run the same
`supabase/migrations/*.sql`**, differing only in transport:

1. **`packages/db-testing` — the always-on, hermetic RLS parity suite.** It runs
   the migrations against an in-process **PGlite** (real Postgres compiled to
   WASM) — no Docker, no daemon — and asserts, over a shared fixture matrix
   (users × gender × filter, content × exposure × classification, plus
   family-space/blocks/frozen), that the row set the database exposes to each
   signed-in user **equals `@safeplace/visibility-policy`'s decision** for the
   same inputs. A test-only shim injects the objects Supabase's platform
   normally provides before migrations run (`anon`/`authenticated`/`service_role`
   roles, `auth.uid()` reading the JWT-claims GUC, minimal `auth`/`storage`
   schemas). Identity is assumed exactly as PostgREST assumes it — `set local
   role authenticated` + `set_config('request.jwt.claims', …)` — so the RLS
   access path is faithfully reproduced. This is the CI gate: fast, reproducible,
   Docker-free. A mutation test (deliberately leaking `contains_women`) confirms
   the suite actually fails on a leak.

2. **`packages/api-client` client-integration suite — the full-transport check.**
   It drives the api-client helpers through a live `supabase start` stack
   (GoTrue signup, PostgREST + RLS, Storage signed URLs) — the literal
   access path of ADR 0006's decision. It self-skips unless
   `SUPABASE_TEST_URL`/`_ANON_KEY`/`_SERVICE_KEY` are set, so it complements
   rather than gates the hermetic suite. The one fidelity gap PGlite leaves
   (PostgREST/GoTrue behavior) is covered here.

Why both: PGlite gives real-Postgres RLS semantics with zero infrastructure
(the CI backstop invariant #2 demands), while `supabase start` validates the
same migrations on the genuine platform. The split already earned its keep:
running `supabase start` surfaced that `storage.objects` is owned by
`supabase_storage_admin`, so a `postgres`-run migration may not `alter` it to
enable RLS — the platform already has RLS enabled there, so migration 0006 only
adds policies, and the harness shim reproduces that pre-enabled state. That
portability bug was invisible to PGlite alone.
