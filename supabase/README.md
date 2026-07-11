# supabase/ — schema, RLS, storage (migrations-as-code)

The database enforcement tier for the gender-conditioned visibility graph
(invariant #2). Everything here is the single source of truth that runs
identically on PGlite (hermetic tests), a local `supabase start` stack, and the
cloud project.

## Migrations (`migrations/`, applied in filename order)

| File | What |
|---|---|
| `…0001_schema.sql` | Full data-model schema, enums, constraints, indexes; RLS enabled (deny-by-default) + grants |
| `…0002_visibility_functions.sql` | `visibility.*` helpers — the SQL mirror of `packages/visibility-policy` |
| `…0003_rls_policies.sql` | RLS policies (exposure axis + blocks + frozen carve-out; number-without-list) |
| `…0004_visibility_views.sql` | `media_items_visible` / `profiles_visible` (URL/avatar withholding) + count RPCs |
| `…0005_auth_defaults.sql` | `handle_new_user` trigger — gender-conditioned filter DEFAULTS at signup |
| `…0006_storage.sql` | Private `media` bucket + `storage.objects` policies |

The SQL never re-derives visibility logic — it composes the `visibility.*`
functions, which mirror `visibility-policy`. Parity is proven in
`packages/db-testing`.

## Running

- **Hermetic RLS parity (no Docker):** `pnpm --filter @safeplace/db-testing test`
  — boots PGlite, applies these migrations, asserts DB == visibility-policy.
- **Full stack (Docker):** `supabase start` (ports are in the 55xxx block to
  avoid clashing with other local projects). After **editing** a migration,
  re-apply with `supabase db reset` — `start` reuses the existing data volume
  and will NOT pick up migration changes on its own. Then the client-transport
  suite:
  ```
  eval "$(supabase status -o env | sed 's/^/export SB_/')"
  SUPABASE_TEST_URL=$SB_API_URL \
  SUPABASE_TEST_ANON_KEY=$SB_ANON_KEY \
  SUPABASE_TEST_SERVICE_KEY=$SB_SERVICE_ROLE_KEY \
    pnpm --filter @safeplace/api-client test
  ```
- **Cloud:** `supabase db push` (needs the project ref + creds in the env; never
  commit secrets).

## Note on `storage.objects`

On a hosted project `storage.objects` is owned by `supabase_storage_admin` and
already has RLS enabled, so `0006` only *adds policies* (it does not `alter` the
table). If a hosted push rejects a storage policy, apply the same predicates via
the Storage dashboard/API.
