# @safeplace/db-testing

Docker-free RLS **parity harness** (ADR 0006). It boots an in-process Postgres
(**PGlite** — real Postgres compiled to WASM), applies `supabase/migrations/*`,
seeds a fixture matrix, and asserts the row set the database exposes to each
signed-in user is **exactly** what `@safeplace/visibility-policy` decides for the
same inputs. If the DB's RLS and the policy package ever diverge, CI fails.

```
pnpm --filter @safeplace/db-testing test
```

## How identity works without PostgREST

`src/shims/supabase-platform.sql` injects what Supabase provides before
migrations run (the `anon`/`authenticated`/`service_role` roles, `auth.uid()`
reading the JWT-claims GUC, minimal `auth`/`storage` schemas). `harness.ts`'s
`asUser(id, …)` then does exactly what a PostgREST request does — `set local
role authenticated` + `set_config('request.jwt.claims', …)` — so the RLS access
path is faithful. `asService`/`asAnon` cover the pipeline and logged-out cases;
`raw` is the superuser/owner seed connection (RLS-bypassing — ground truth only).

## What's covered

| Suite | Asserts |
|---|---|
| `media-visibility.parity` | exposure × classification matrix, family-space lift, blocks, frozen, URL withholding == `canViewMedia` |
| `avatar-visibility.parity` | `profiles_visible` avatar withholding == `canViewProfilePhoto`; blocked profiles hidden |
| `auth-defaults` | `handle_new_user` seeds == `resolveDefaultFilterSettings` (both genders) |
| `write-guards` | classification not client-writable (invariant #1), number-without-list (invariant #5), the filter toggle actually works (invariant #3), owner-only settings, anon locked out |

The fixture matrix (`seed.ts`) and the expectation oracle (`expected.ts`) share
the same data, so a green run means the two enforcement layers genuinely agree —
not that a test drifted to match a bug. A mutation test (injecting a
`contains_women` leak) is used to confirm the suite fails on a real leak.

The full-transport counterpart (supabase-js → GoTrue + PostgREST + Storage)
lives in `packages/api-client` and runs against `supabase start`.
