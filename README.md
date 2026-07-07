# Safe-Place

A community social network for the Haredi (ultra-Orthodox Jewish) public in
Israel — Facebook-inspired structure, Instagram-inspired polish, governed
by a gender-conditioned content visibility system that is the product's
defining technical and legal challenge. Israel-only for the initial launch.

**Start here:** [`CLAUDE.md`](./CLAUDE.md) — read it before touching any
code. It's also read automatically by Claude Code at the start of every
session in this repo.

## Repo map

```
safeplace/
├── CLAUDE.md                 ← engineering context, read first
├── docs/
│   ├── product/               ← source-of-truth specs (Hebrew, RTL) — start with product/README.md
│   ├── architecture/          ← how to build what the specs describe (English)
│   ├── decisions/             ← ADRs + the 97-item open-questions backlog
│   ├── legal/                 ← tracker for the 25 items flagged "needs attorney review"
│   └── design/                ← visual language (pending Claude Design session)
├── apps/
│   ├── mobile/                 ← React Native + Expo — the primary client
│   ├── web/                    ← not started (see ADR 0001)
│   └── moderation-console/     ← not started — internal staff tool
├── packages/
│   ├── visibility-policy/      ← ★ the single source of truth for who can see what
│   ├── shared-types/           ← domain types (Post, Group, User, ...)
│   ├── design-tokens/          ← colors, type, spacing, motion (placeholder pending design)
│   └── api-client/             ← typed Supabase wrapper
├── services/
│   └── moderation-pipeline/    ← async LLM classification worker (skeleton)
└── .claude/commands/           ← Claude Code slash commands for recurring workflows
```

## Reading order for a new contributor (human or AI)

1. `CLAUDE.md` — the rules of the road.
2. `docs/product/README.md` → `docs/product/00-master-spec.md` — what the
   product is and why.
3. `docs/architecture/README.md` → `visibility-model.md` — how the hardest
   part gets built.
4. `docs/decisions/` — what's already been decided (ADRs) and what's
   explicitly still open (`open-questions-backlog.md`).
5. `docs/legal/legal-tracker.md` — what needs an actual attorney before
   production launch.

## Getting started (development)

Prerequisites: Node 20+, [pnpm](https://pnpm.io) 9+, the
[Expo Go](https://expo.dev/go) app on your phone (or an iOS/Android
simulator) for `apps/mobile`.

```bash
git clone <this repo>
cd safeplace
pnpm install
cp .env.example .env.local   # fill in real Supabase values once the project exists
pnpm --filter @safeplace/mobile start
```

Run the whole workspace's checks:

```bash
pnpm typecheck   # every package
pnpm lint
pnpm test        # currently exercises @safeplace/visibility-policy's full test suite
```

## Recommended workflow

This repo is built primarily through **VS Code + the Claude Code
extension**. A few things make that workflow effective here specifically:

- **`CLAUDE.md` is your context anchor.** Claude Code reads it
  automatically every session — you shouldn't need to re-explain the
  visibility model or the project's principles in every conversation.
- **Use the slash commands in `.claude/commands/`** for recurring work:
  `/new-screen` to implement a screen from spec, `/visibility-audit` to
  check a piece of code against the visibility invariants,
  `/wire-moderation` when adding a new upload surface, `/new-adr` to record
  a technical decision properly.
- **Visual design work happens in Claude Design first**, not in code. See
  `docs/design/README.md` and `docs/decisions/0003-first-push-scope.md` —
  lock in the palette, typography, and the onboarding wizard's specific
  animations there before writing the corresponding screen code.
- **Don't let a screen "improvise" an open question.** Check
  `docs/decisions/open-questions-backlog.md` first — there's a very good
  chance the ambiguity you've hit is already listed with a stated MVP
  starting point.

## Current status

Repo scaffold complete: all 11 product specs indexed, architecture docs
written, 3 ADRs accepted, the visibility-policy package implemented and
tested, and the mobile app skeleton wired up (RTL bootstrap + design
tokens + monorepo package graph all confirmed working end to end). Next:
the Claude Design visual lock-in session, then the 3-step onboarding
wizard — see `docs/decisions/0003-first-push-scope.md`.
