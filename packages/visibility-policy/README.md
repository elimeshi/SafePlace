# @safeplace/visibility-policy

**This is the single most important package in the repo.** It is the sole
source of truth for whether a given viewer can see a given piece of
content, per the gender-conditioned visibility model described in
`docs/architecture/visibility-model.md`.

## Rules for working in this package

1. **Every visibility decision anywhere in the product routes through
   here.** No screen, API handler, or query should implement an inline
   `if (gender === ...)` check. If you need a new kind of check, add it
   here first, with a test, then use it elsewhere.
2. **100% test coverage is not optional for this package.** A missing test
   here is a missing guarantee about who can see what.
3. **Keep this package platform-agnostic.** No React Native imports, no
   Supabase imports. It should be usable from `apps/mobile`,
   `services/moderation-pipeline`, and any future web app without
   modification.
4. **Read `docs/architecture/visibility-model.md` before changing
   anything here.** The doc and the code should never drift apart — if you
   change the logic, update the doc in the same change.

## What's here

- `types.ts` — `Gender`, `MediaClassification`, `ContentExposure`,
  `FilterSettings`, `Viewer`, and the default filter settings per gender.
- `rules.ts` — the actual decision functions: `canViewMedia`,
  `canViewProfilePhoto`, `canDiscoverUserInSearch`,
  `canSendMessageRequest`, and the two underlying axis checks.
- `__tests__/rules.test.ts` — unit tests for every rule above. Run with
  `pnpm test` from this directory, or `pnpm --filter @safeplace/visibility-policy test`
  from the repo root.

## Relationship to the database layer

The functions here define the *canonical* logic. The actual enforcement at
the database tier is expressed as Postgres Row-Level Security policies
(see ADR 0002) that must produce equivalent results. When you change a rule
here, check whether the corresponding RLS policy needs updating too — use
`.claude/commands/visibility-audit.md` to check.
