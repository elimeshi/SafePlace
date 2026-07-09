# 0005 — UI Component Library (`packages/ui`)

## Status

Accepted

## Context

The visual language is locked (`design-reference/`, ADR 0003) but authored as
web / React-DOM components with inline CSS-variable styling. The production
client is React Native + Expo (ADR 0001), which cannot consume those
components directly. Every MVP screen (onboarding, feed, compose, single post)
needs the same primitives — buttons, fields, toggles, the gender "doors",
source labels, post cards, the neutral system notice — and they must be
RTL-correct and reduced-motion-aware from the start (invariant #9, master spec
§6.3.4). We need one home for these so screens compose them rather than
re-implementing look-and-feel per screen.

## Decision

Create **`packages/ui`**, a React Native component library that **ports** the
`design-reference/` components into shipped, token-driven primitives. Styling
and stateful behavior are extracted into **pure functions** (e.g.
`resolveButtonStyle(...)`) unit-tested with **vitest** (the repo's test
standard); the RN view layer is a thin wrapper verified visually in an Expo
gallery. Components read only from `@safeplace/design-tokens` (via a `theme`
bridge) — no hardcoded colors — and are RTL- and reduced-motion-correct.

## Alternatives considered

- **Put components inside `apps/mobile`** — simplest short-term, but muddies
  the app/library boundary, makes the primitives harder to test in isolation,
  and blocks reuse by a future `apps/web`. Rejected for the same
  package-oriented reasons the monorepo already splits `design-tokens` and
  `visibility-policy` into packages.
- **Keep using the web design-reference components** — wrong platform; they
  rely on the DOM and CSS variables. They remain the visual source of truth,
  not shipped code.
- **Adopt a third-party RN component kit** — would fight the bespoke,
  restrained visual language and the RTL/motion specifics; the design is
  specific enough that a thin bespoke layer over tokens is cleaner.

## Consequences

- `packages/ui` declares `react`, `react-native`, and
  `react-native-reanimated` as peer dependencies; `apps/mobile` provides them.
  Because RN components can run under `react-native-web`, this package is the
  natural shared UI layer if `apps/web` is ever built (ADR 0001), keeping
  `design-tokens` and `visibility-policy` platform-agnostic as intended.
- Component logic is tested with vitest via pure functions; render-level tests
  (jest-expo / react-native-testing-library) are a deliberate later addition,
  not a Phase 0 dependency.
- The `theme` bridge in `packages/ui` is the single seam between tokens and
  RN styles; `apps/mobile` re-exports it so screens have one import surface.
- Any visibility-sensitive rendering (e.g. `PostCard`'s filtered-media
  placeholder) is UI defense-in-depth only — real enforcement stays in RLS /
  `visibility-policy` (invariant #2); the component never makes the call
  itself.
