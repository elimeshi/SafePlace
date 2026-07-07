# Safe-Place — Engineering Context for Claude Code

This file is read automatically at the start of every Claude Code session in
this repo. It is the single source of truth for how to work on this codebase.
Read it fully before writing or editing any code.

## 1. What this product is

Safe-Place is a community social network for the Haredi (ultra-Orthodox
Jewish) public in Israel — structurally inspired by Facebook (groups,
real-identity, mutual connections), visually and experientially inspired by
Instagram (clean, minimal, mobile-first), but governed by one idea that has
no precedent in either: a **gender-conditioned content visibility graph**.

Men and women both join the same platform. Every user declares a gender at
signup. Content containing women is classified by an LLM vision pipeline at
upload time. Each user — regardless of gender — controls whether they see
content classified as containing women. Defaults differ by gender (men
default to filtered, women default to unfiltered), but the **mechanism**
itself is identical and symmetric for everyone, and every default is changeable
at any time with no friction.

Full product rationale lives in `docs/product/00-master-spec.md` §3. Read it
before touching anything related to visibility, classification, or defaults —
the legal defensibility of the entire product rests on the distinctions made
there.

## 2. The three words

Every product and engineering decision is evaluated against three words from
the master spec: **simplicity, personal control, mutual consent**. If a
feature you're implementing seems to need a fourth principle to justify
itself, stop and flag it — it's probably out of scope or contradicts the spec.

## 3. Absolute invariants — never violate these

These are not style preferences. Violating any of these is a legal and
product-integrity failure, not just a bug.

1. **The product classifies content, never users.** There is no "female
   account" flag that hides a user's posts globally. Every individual photo
   and video gets its own classification. A man's post containing a woman is
   still publishable by him — it is filtered on the *viewer* side, not
   blocked on the *uploader* side. Never build a code path that blocks
   upload based on the uploader's gender plus content classification — only
   downstream visibility may be affected.

2. **Enforce visibility at every layer, not just the UI.** A filtering rule
   implemented only in a React component is a data leak waiting to happen
   (e.g., via API response inspection, cached data, or a future client).
   Every visibility rule must be enforced redundantly:
   - **Database**: Row-Level Security / query-level filtering.
   - **Server / API**: never return classified-and-filtered media to a
     client that shouldn't receive it, even behind a flag.
   - **UI**: render the filtered placeholder state, but treat this as
     defense-in-depth, never as the only line of defense.

   All visibility logic — at every layer — must route through
   `packages/visibility-policy`. Never re-implement a visibility check
   inline in a screen, API handler, or query. If the policy package doesn't
   expose the check you need, add it there first.

3. **Defaults are not rules.** Any setting that differs by declared gender
   (e.g., default content filter state) must be: (a) trivially changeable by
   the user at any time, (b) presented neutrally — never framed as "this is
   how men/women must behave" — and (c) functionally identical in mechanism
   for both genders. See master spec §3.6.

4. **Symmetry of mechanism.** Every control available to one gender is
   available to the other. There is no gender-gated feature — only
   gender-conditioned *defaults*.

5. **"Number without list."** Follower counts, group membership counts, etc.
   are shown as numbers. The underlying lists (who follows whom, who's in
   what group) are never exposed to anyone but the user themself. See
   `docs/product/05-personal-area-spec.md` §2.5.

6. **Family Spaces are the one deliberate exception.** Inside a confirmed,
   mutual-consent Family Space, standard modesty filtering is lifted and
   control passes to the space's admin. This is intentional and documented
   — do not "fix" it by applying global filtering inside Family Spaces.

7. **Every dangerous setting change requires double confirmation.** Content
   filter toggles, gender change, and account deletion all require a
   two-step confirm flow (warning screen → typed confirmation or password).
   See `docs/product/06-settings-spec.md` §4.

8. **All media — everywhere, no exceptions — goes through the classification
   pipeline.** Posts, comments, profile photos, poll options, messages. If
   you add a new place a user can upload an image or video, you must wire it
   to the same pipeline described in `docs/architecture/moderation-pipeline.md`.
   There is no "internal" or "low-stakes" upload surface that skips this.

9. **RTL Hebrew is not an afterthought.** This is a right-to-left, Hebrew-first
   product. Every screen, every component, every animation direction
   (including swipe/scroll directions for the stories rail, step-transition
   slide direction, etc.) must be built RTL-correct from the start, not
   patched in later. See `docs/product/00-master-spec.md` §6.3.

If you are ever unsure whether something violates one of these invariants,
stop and ask rather than guessing. Eli's explicit standing instruction
(carried over from the product spec process) is: **never guess on an
ambiguous point — ask.**

## 4. Repo map

```
safeplace/
├── CLAUDE.md                       ← you are here
├── docs/
│   ├── product/                    ← source-of-truth product specs (read-only reference, Hebrew)
│   ├── architecture/               ← technical architecture derived from the specs (English)
│   ├── decisions/                  ← ADRs + the open-questions backlog
│   ├── legal/                      ← tracker for every point flagged "requires legal sign-off"
│   └── design/                     ← visual language, once locked in Claude Design
├── apps/
│   ├── mobile/                     ← React Native + Expo app (primary client)
│   ├── web/                        ← desktop web (placeholder — see ADR 0001)
│   └── moderation-console/         ← internal staff tool (placeholder, future work)
├── packages/
│   ├── visibility-policy/          ← ★ single source of truth for all visibility rules
│   ├── shared-types/               ← domain types shared across apps/services
│   ├── design-tokens/              ← colors, type scale, motion constants
│   └── api-client/                 ← typed Supabase/API client wrapper
├── services/
│   └── moderation-pipeline/        ← async LLM classification + human review queue
└── .claude/commands/                ← slash commands for recurring workflows
```

## 5. Stack & conventions

- **Client**: React Native + Expo, TypeScript strict mode. Single codebase
  targets iOS and Android; Expo's web target is the placeholder path for
  desktop until/unless `apps/web` is built out separately (see ADR 0001).
- **Backend**: Supabase (Postgres + Auth + Storage). Row-Level Security is
  the primary enforcement layer for visibility rules at the data tier — see
  ADR 0002 and `docs/architecture/visibility-model.md`.
- **Moderation pipeline**: runs as an async service, not inline in the
  request path. An upload is accepted immediately; classification and
  filtering apply within the pipeline's latency budget. Never make a user
  wait on a synchronous LLM call to publish a post.
- **Monorepo tooling**: pnpm workspaces. Run everything from the repo root.
- **Language**: all code, comments, commit messages, and file names are in
  English. Product content (UI copy, the docs/product specs) is in Hebrew,
  RTL. Keep this boundary clean — don't hardcode Hebrew strings in component
  logic; route them through a strings/i18n layer even though Hebrew-only is
  the MVP scope (see `docs/product/06-settings-spec.md` §3.5 — additional
  languages are an explicit future item).
- **Testing**: `packages/visibility-policy` requires unit test coverage for
  every rule — this is the one package where "ship it, test later" is not
  acceptable, given invariant #2 above.

## 6. How to use the docs

- `docs/product/*.md` are the **source of truth for what to build**. They
  are Eli's original characterization documents, lightly cleaned up. Do not
  edit them to reflect implementation decisions — if an implementation
  detail changes something product-level, raise it as a question rather than
  silently editing the spec.
- `docs/architecture/*.md` are **derived from** the product docs — written
  for engineers, not stakeholders. If you find a conflict between an
  architecture doc and a product doc, the product doc wins; flag the
  architecture doc for correction.
- `docs/decisions/*.md` are ADRs (Architecture Decision Records). Add one
  whenever you make a non-trivial, hard-to-reverse technical choice. Use
  `docs/decisions/0000-template.md`.
- `docs/decisions/open-questions-backlog.md` is a compiled list of every
  item the product specs marked "⏳ to be planned" — i.e. explicitly
  deferred, not forgotten. Check it before assuming a gap is an oversight.
- `docs/legal/legal-tracker.md` lists every point the product specs flagged
  "⚖ requires legal sign-off." None of these are blockers for writing code
  during development, but **do not ship a flagged item to production
  without confirming it's been cleared** — flag this explicitly if you reach
  a point where you're about to wire up something on this list end-to-end
  (e.g., the gender-change flow, account deletion, cross-gender messaging).

## 7. Definition of done for a new screen

Before considering a screen "done," confirm:

1. It matches its `docs/product/*.md` spec — including the "⏳ to be
   planned" items still being explicitly deferred (don't silently invent
   answers to open questions; surface them).
2. RTL layout is correct (text direction, icon mirroring, scroll/swipe
   direction, animation direction).
3. Any visibility-sensitive content goes through
   `packages/visibility-policy`, not a local check.
4. Any media upload path is wired to the moderation pipeline.
5. `prefers-reduced-motion` / reduced-motion equivalent is respected for any
   custom animation (master spec §6.3.4).
6. Empty states and error states have copy, not just a blank screen.

## 8. What not to do

- Don't add a recommendation/discovery algorithm that isn't already
  specified (master spec explicitly avoids algorithmic engagement-bait
  patterns — see `docs/architecture/visibility-model.md` and the feed spec's
  three-weight algorithm, which is the **only** algorithmic surface defined
  so far).
- Don't add public like-counts, read receipts, or social-pressure UI patterns
  beyond what's specified — these were deliberately chosen with restraint
  given the target community (see `00a-knowledge-base-fb-vs-ig.md` §5.3).
- Don't invent new data collection (e.g., precise geolocation) beyond what's
  specified — location tagging is explicitly place-name-only, never
  coordinates (see `02-post-creation-spec.md` §3.5).
- Don't build monetization, ads, or analytics instrumentation — explicitly
  out of scope until after development completes (master spec, intro).
