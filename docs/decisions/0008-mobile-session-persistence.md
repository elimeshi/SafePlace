# 0008 — Mobile Supabase Client & Session Persistence

## Status

Accepted

## Context

Phase 2 introduces the app's auth/session shell: an unauthenticated user is
routed into the onboarding wizard, an authenticated one into the app, and the
session must survive app restarts. Two gaps blocked this:

1. **No client construction in the app.** `packages/api-client` exposes
   `createSupabaseClient(url, anonKey)` (ADR 0002) but nothing in
   `apps/mobile` instantiated it, and the factory set no auth options. On
   React Native there is no `localStorage`, so with the default options the
   session lives only in memory and is lost on every cold start — the user
   would have to sign in on each launch.
2. **Env not reachable by the client.** `apps/mobile/.env.local` defined
   `NEXT_PUBLIC_SUPABASE_*` keys (a Next.js-era leftover). Expo only inlines
   `process.env.EXPO_PUBLIC_*` into the client bundle, and `.env.example`
   already prescribes `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` — so the app
   could never have read the configured values.

Constraints: keep client construction centralized (ADR 0002 — "don't call
`createClient()` ad hoc elsewhere"); keep `packages/api-client` platform-
agnostic (it is also consumed by server-side code and tests); RN-first, so no
web-OAuth URL parsing. Email confirmation is ON for the project, so the client
must handle the `SIGNED_IN` transition that arrives after verification.

## Decision

Persist the session with an AsyncStorage-backed Supabase client, constructed
once in the app and driven by a single session provider.

- **Extend the factory, don't fork it.** `createSupabaseClient` gains an
  optional third `options` arg (`authStorage`, `persistSession`,
  `autoRefreshToken`, `detectSessionInUrl`) typed against a structural
  `AuthSessionStorage` interface — no hard dependency on any RN package, so
  the package stays platform-agnostic. Defaults are RN-safe: persist + auto-
  refresh on, URL detection off.
- **One client singleton** in `apps/mobile/src/lib/supabase.ts`, passing
  `@react-native-async-storage/async-storage` as `authStorage` and importing
  `react-native-url-polyfill/auto` first (supabase-js needs a spec-complete
  `URL`, which Hermes only partially provides).
- **One `SessionProvider`** at the router root reads the persisted session on
  mount and subscribes to `onAuthStateChange`; screens read `useSession()` and
  never touch `supabase.auth` for state. Route groups `(onboarding)` / `(app)`
  gate on it.
- **Env:** add `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  (the `sb_publishable_…` client-safe key) to `.env.local`, read via a small
  `src/lib/env.ts` that fails fast with a clear message if absent.

## Alternatives considered

- **Construct `createClient()` directly in the app** with inline auth options
  — rejected: violates ADR 0002's single-factory rule and would let the app
  and other consumers drift on client configuration.
- **Add AsyncStorage as a dependency of `packages/api-client`** and hard-wire
  it in the factory — rejected: pins a React-Native-only package into a
  package that also runs server-side/in tests. The structural
  `AuthSessionStorage` param keeps the dependency at the app edge.
- **A custom SecureStore adapter** (`expo-secure-store`) for the tokens —
  deferred, not rejected. SecureStore has a ~2 KB per-item limit that JWT
  sessions can exceed and needs chunking; AsyncStorage is the documented
  Supabase-on-Expo default. Revisit if storing the session at rest needs
  hardening (noted in the backlog).
- **Rename the `NEXT_PUBLIC_*` keys outright** instead of adding
  `EXPO_PUBLIC_*` aliases — left both for now to avoid breaking any other
  tooling that may read the old names; the app only consumes `EXPO_PUBLIC_*`.

## Consequences

- New runtime deps in `apps/mobile`: `@react-native-async-storage/async-storage`,
  `react-native-url-polyfill`. `createSupabaseClient`'s new arg is optional, so
  existing callers (and the ADR 0006 integration test, which uses `createClient`
  directly) are unaffected.
- Sessions now survive restarts and auto-refresh; the `(app)` group is a
  UI-tier gate that is defense-in-depth over RLS (invariant #2), never the sole
  guard.
- Follow-up added to `open-questions-backlog.md`: evaluate a SecureStore-backed
  (encrypted-at-rest) session store before production, and decide whether to
  drop the legacy `NEXT_PUBLIC_*` env keys.
- No legal-tracker item is touched by this decision.
