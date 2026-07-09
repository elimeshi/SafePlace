# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the repo into a green-building foundation with a finalized, RN-ready design-token set and a tested React-Native component kit (`packages/ui`), so every MVP screen (onboarding, feed, compose, single-post) has a green pipeline, final tokens, and reusable primitives to build on.

**Architecture:** The locked visual language currently lives as web/React-DOM components in the untracked `Safe-Place Design System/` folder. Phase 0 (a) commits the missing lockfile so CI is green, (b) folds that folder into the repo as tracked design reference, (c) reconciles `packages/design-tokens` from placeholder → the locked values in an RN-shaped form (incl. RN shadow tokens), and (d) ports the component primitives into a new platform-agnostic-where-possible `packages/ui` RN library. Component styling/behavior is extracted into **pure functions unit-tested with vitest** (the repo's test standard); the RN view layer is a thin wrapper verified visually in an Expo component gallery. No backend, no network — fully buildable offline.

**Tech Stack:** pnpm 9 workspaces + Turborepo 2, TypeScript strict, React Native 0.74 / Expo 51, react-native-reanimated ~3.10, vitest 2 (pure-logic tests). Design source of truth: `Safe-Place Design System/` (tokens `*.css`, components `*.jsx` + `*.d.ts` + `*.prompt.md`).

---

## Decisions locked for this phase

- **Component testing:** extract style/behavior into pure functions (`resolveButtonStyle(...)`, `staggerDelayForIndex(...)`, toggle/gender reducers) tested with vitest. Do **not** add jest-expo / react-native-testing-library in Phase 0 — render-level tests are a later, optional addition. Rationale: matches the repo's vitest standard, avoids a heavy RN-render harness, still gives real coverage of the logic that matters.
- **Shadows:** CSS `box-shadow` does not port to RN. Add an RN-shaped `elevation` token set (`shadowColor/shadowOffset/shadowOpacity/shadowRadius` + Android `elevation`) derived from the Design System's blue-tinted shadows.
- **Fonts:** token names only in Phase 0 (`Rubik`, `Rubik-Medium`, `Rubik-SemiBold`, `Rubik-Bold`, `Heebo`). Actually loading font files via `expo-font` is deferred to the onboarding phase (Phase 2) where they first render on a device; note it in `apps/mobile` README.
- **`packages/ui` platform:** React Native components (`.tsx`) importing from `react-native` + `react-native-reanimated`. Kept as its own package (not inside `apps/mobile`) for a clean, testable boundary and future `react-native-web` reuse per ADR 0001. Documented in ADR 0005.

---

## File structure

**Created:**
- `packages/ui/package.json` — `@safeplace/ui`, deps on `react-native`, `react-native-reanimated`, `@safeplace/design-tokens`.
- `packages/ui/tsconfig.json` — extends `tsconfig.base.json`.
- `packages/ui/src/index.ts` — barrel export.
- `packages/ui/src/theme.ts` — the RN token bridge (moved/generalized from `apps/mobile/src/lib/theme.ts`), incl. typed `TextStyle`/`ViewStyle` helpers.
- `packages/ui/src/motion/useRiseIn.ts` — staggered fade-and-rise entrance hook (reanimated).
- `packages/ui/src/motion/stagger.ts` — pure `staggerDelayForIndex(index, opts)`.
- `packages/ui/src/motion/usePressScale.ts` — press `scale(0.97)` hook.
- `packages/ui/src/motion/useCtaHalo.ts` — CTA breathing-halo hook.
- `packages/ui/src/motion/reduced-motion.ts` — `useReducedMotion()` wrapper over `AccessibilityInfo`.
- `packages/ui/src/primitives/Button.tsx` + `Button.styles.ts` (pure `resolveButtonStyle`).
- `packages/ui/src/primitives/{TextField,Toggle,GenderChoice,Checkbox}.tsx` (+ `.styles.ts` where behavior/style logic is non-trivial).
- `packages/ui/src/content/{Icon,Avatar,SourceLabel,InteractionBar}.tsx`.
- `packages/ui/src/feedback/SystemNotice.tsx`.
- `packages/ui/src/surfaces/PostCard.tsx`.
- `packages/ui/src/**/__tests__/*.test.ts` — vitest pure-logic tests.
- `docs/decisions/0004-vision-classifier-provider.md`, `0005-ui-component-library.md`, `0006-rls-test-strategy.md`.
- `apps/mobile/app/gallery.tsx` — throwaway component-gallery route (RTL + motion eyeball test).
- `design-reference/` — the folded-in Design System (see Task 2).

**Modified:**
- `packages/design-tokens/src/{colors,typography,spacing}.ts` — placeholder → final; add `elevation.ts`.
- `packages/design-tokens/src/index.ts` — export `elevation`.
- `apps/mobile/src/lib/theme.ts` — re-export from `@safeplace/ui` (single seam preserved).
- `apps/mobile/package.json` — add `@safeplace/ui` dep.
- `pnpm-lock.yaml` — created & committed.
- `docs/decisions/README.md`, `docs/design/README.md` — reference the new ADRs / design-reference.

---

## Task 1: Green the build (commit the lockfile)

**Files:**
- Create: `pnpm-lock.yaml`

- [ ] **Step 1: Install dependencies (generates the lockfile)**

Run: `pnpm install`
Expected: resolves all workspaces, writes `pnpm-lock.yaml`. If it fails, capture the error — do not hand-edit the lockfile.

- [ ] **Step 2: Verify the pipeline is green**

Run: `pnpm turbo run typecheck lint test`
Expected: all three tasks PASS across `@safeplace/visibility-policy`, `shared-types`, `design-tokens`, `api-client`, `moderation-pipeline`, `mobile`. (visibility-policy tests should report full pass.)

- [ ] **Step 3: Commit**

```bash
git add pnpm-lock.yaml
git commit -m "chore: commit pnpm lockfile so CI installs with --frozen-lockfile"
```

---

## Task 2: Fold the Design System into the repo as tracked reference

**Files:**
- Rename: `Safe-Place Design System/` → `design-reference/`
- Delete: all `*:Zone.Identifier` files (Windows download cruft)
- Modify: `docs/design/README.md`

- [ ] **Step 1: Move the folder and strip Zone.Identifier cruft**

```bash
git mv "Safe-Place Design System" design-reference 2>/dev/null || mv "Safe-Place Design System" design-reference
find design-reference -name '*:Zone.Identifier' -delete
```
Expected: `design-reference/` exists; `find design-reference -name '*Zone.Identifier'` returns nothing.

- [ ] **Step 2: Point `docs/design/README.md` at it**

Replace the "intentionally near-empty… pending Claude Design session" text with a short section: the visual language is now locked; canonical reference is `design-reference/` (tokens in `design-reference/tokens/*.css`, component reference in `design-reference/components/**`), and the buildable RN expression of it is `packages/design-tokens` + `packages/ui`.

- [ ] **Step 3: Commit**

```bash
git add -A design-reference docs/design/README.md
git commit -m "chore: fold locked Design System into repo as design-reference/"
```

---

## Task 3: Reconcile design-tokens → final values (colors)

**Files:**
- Modify: `packages/design-tokens/src/colors.ts`
- Test: `packages/design-tokens/src/__tests__/colors.test.ts`

Authoritative values: `design-reference/tokens/colors.css` and `group-palette.css`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/design-tokens/src/__tests__/colors.test.ts
import { describe, expect, it } from "vitest";
import { colors, groupPalette } from "../colors";

describe("colors", () => {
  it("primary + accent match the locked brand", () => {
    expect(colors.primary).toBe("#2C5985");
    expect(colors.accent).toBe("#C97D4F");
  });
  it("exposes the full blue ramp", () => {
    expect(colors.blue900).toBe("#10263C");
    expect(colors.blue050).toBe("#F2F6FA");
  });
  it("exposes semantic status + label tokens", () => {
    expect(colors.warning).toBe("#B7791F"); // settings danger zone
    expect(colors.suggestedLabel).toBe("#F59E0B");
    expect(colors.neutralLabel).toBe("#94A3B8");
  });
  it("group palette has the 12 locked colors, no free choice", () => {
    expect(groupPalette).toHaveLength(12);
    expect(groupPalette[0]).toBe("#2C5985");
    expect(groupPalette[2]).toBe("#C97D4F");
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm --filter @safeplace/design-tokens test`
Expected: FAIL (`colors.blue900` undefined).

- [ ] **Step 3: Rewrite `colors.ts` to final values**

Drop the ⚠️ PLACEHOLDER banner. Keep the existing flat semantic keys (`primary`, `accent`, `background`, `textPrimary`, …) for backward-compat, and add the full ramp + tint keys transcribed from `colors.css`:

```ts
export const colors = {
  // Primary ramp (deep, soft blue) — locked, master spec §6.3.5.
  blue900: "#10263C", blue800: "#1B3B5C", blue700: "#234B73", blue600: "#2C5985",
  blue500: "#3F6D99", blue400: "#5C82A8", blue300: "#8AA6C2", blue200: "#C2D2E1",
  blue100: "#E3EBF2", blue050: "#F2F6FA",
  // Warm accent — primary CTA only.
  terracotta700: "#A35F36", terracotta600: "#B96E42", terracotta500: "#C97D4F",
  terracotta400: "#D79A74", terracotta100: "#F6E7DC",
  // Ink / neutrals.
  ink900: "#1A1D21", ink700: "#3C4149", ink500: "#6B7280", ink400: "#9AA1AC",
  ink300: "#C3C8D0", ink200: "#E5E7EB", ink100: "#EEF0F3", ink050: "#F7F8FA", white: "#FFFFFF",
  // Semantic status + soft tints.
  success: "#2F855A", successSoft: "#EAF5EF",
  warning: "#B7791F", warningSoft: "#FBF3E2",
  danger: "#C53030", dangerSoft: "#FBEAEA",
  // Feed source-label semantics.
  suggestedLabel: "#F59E0B", neutralLabel: "#94A3B8",
  // ── Flat semantic aliases (keep existing consumers working) ──
  primary: "#2C5985", primaryLight: "#5C82A8", primaryDark: "#1B3B5C", accent: "#C97D4F",
  background: "#FFFFFF", backgroundMuted: "#F7F8FA",
  textPrimary: "#1A1D21", textSecondary: "#6B7280", textOnPrimary: "#FFFFFF",
  border: "#E5E7EB", borderStrong: "#C3C8D0",
} as const;

export const groupPalette = [
  "#2C5985", "#5B8C5A", "#C97D4F", "#7C6A9C", "#B08968", "#4A7C7C",
  "#A85751", "#6B7A8F", "#8C7355", "#5A6B8C", "#9C7A6A", "#557A6B",
] as const;
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm --filter @safeplace/design-tokens test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-tokens/src/colors.ts packages/design-tokens/src/__tests__/colors.test.ts
git commit -m "feat(tokens): finalize color ramp from locked design system"
```

---

## Task 4: Reconcile typography + add radius.xl + RN elevation tokens

**Files:**
- Modify: `packages/design-tokens/src/typography.ts`, `packages/design-tokens/src/spacing.ts`
- Create: `packages/design-tokens/src/elevation.ts`
- Modify: `packages/design-tokens/src/index.ts`
- Test: `packages/design-tokens/src/__tests__/tokens.test.ts`

Authoritative: `design-reference/tokens/{typography,spacing,fonts}.css`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/design-tokens/src/__tests__/tokens.test.ts
import { describe, expect, it } from "vitest";
import { fontFamily, fontSize, tracking, typeRole } from "../typography";
import { radius } from "../spacing";
import { elevation } from "../elevation";

describe("typography", () => {
  it("adds Heebo as the numeric companion family", () => {
    expect(fontFamily.numeric).toBe("Heebo");
  });
  it("adds the 4xl onboarding display size", () => {
    expect(fontSize["4xl"]).toBe(38);
  });
  it("exposes near-zero Hebrew tracking", () => {
    expect(tracking.tight).toBeCloseTo(-0.16); // -0.01em * 16
  });
  it("exposes a semantic display type role", () => {
    expect(typeRole.display.fontSize).toBe(38);
    expect(typeRole.display.fontFamily).toBe("Rubik-Bold");
  });
});
describe("radius", () => {
  it("adds the large-media xl radius", () => { expect(radius.xl).toBe(22); });
});
describe("elevation", () => {
  it("card shadow is blue-tinted and RN-shaped", () => {
    expect(elevation.card.shadowColor).toBe("#10263C");
    expect(elevation.card.elevation).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm --filter @safeplace/design-tokens test`
Expected: FAIL (module `../elevation` not found).

- [ ] **Step 3: Update `typography.ts`**

Drop the PLACEHOLDER banner. Add Heebo, `4xl`, `tracking`, and `typeRole` (RN `TextStyle`-shaped, letter-spacing in px = em × 16, line-heights in px):

```ts
export const fontFamily = {
  base: "Rubik", medium: "Rubik-Medium", semibold: "Rubik-SemiBold", bold: "Rubik-Bold",
  numeric: "Heebo",
} as const;
export const fontSize = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 38 } as const;
export const fontWeight = { regular: "400", medium: "500", semibold: "600", bold: "700" } as const;
export const lineHeight = { tight: 1.25, base: 1.5, relaxed: 1.75 } as const;
export const tracking = { tight: -0.16, normal: 0, label: 0.16 } as const; // px (em*16)
export const typeRole = {
  display: { fontFamily: "Rubik-Bold", fontSize: 38, lineHeight: 44 },
  h1:      { fontFamily: "Rubik-Bold", fontSize: 30, lineHeight: 36 },
  h2:      { fontFamily: "Rubik-SemiBold", fontSize: 24, lineHeight: 30 },
  h3:      { fontFamily: "Rubik-SemiBold", fontSize: 20, lineHeight: 26 },
  body:    { fontFamily: "Rubik", fontSize: 16, lineHeight: 26 },
  bodyStrong: { fontFamily: "Rubik-Medium", fontSize: 16, lineHeight: 26 },
  meta:    { fontFamily: "Rubik", fontSize: 14, lineHeight: 20 },
  label:   { fontFamily: "Rubik-Medium", fontSize: 12, lineHeight: 16 },
} as const;
```

- [ ] **Step 4: Add `radius.xl` in `spacing.ts`**

Add `xl: 22` to the `radius` object (keep `sm:6, md:10, lg:16, full:9999`).

- [ ] **Step 5: Create `elevation.ts`** (RN shadow tokens derived from the blue-tinted CSS shadows)

```ts
// Blue-tinted, soft, low — never heavy black (design system readme).
export const elevation = {
  xs:   { shadowColor: "#10263C", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sm:   { shadowColor: "#10263C", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  card: { shadowColor: "#10263C", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  lg:   { shadowColor: "#10263C", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 30, elevation: 6 },
} as const;
```

- [ ] **Step 6: Export elevation from `index.ts`**

Add `export * from "./elevation";`.

- [ ] **Step 7: Run tests, verify pass; then typecheck the workspace**

Run: `pnpm --filter @safeplace/design-tokens test && pnpm --filter @safeplace/design-tokens typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/design-tokens/src docs
git commit -m "feat(tokens): finalize typography, add radius.xl and RN elevation tokens"
```

---

## Task 5: Write the three ADRs

**Files:**
- Create: `docs/decisions/0004-vision-classifier-provider.md`, `0005-ui-component-library.md`, `0006-rls-test-strategy.md`
- Modify: `docs/decisions/README.md` (index)

Use `docs/decisions/0000-template.md`. One commit. Content summary each (full prose written during execution; **before finalizing 0004, invoke the `claude-api` skill** to fix the exact model + pricing/latency posture):

- [ ] **Step 1: ADR 0004 — Vision classifier provider.** Decision: Claude vision model behind a `ClassifierProvider` interface (`classify(image) → { rawConfidenceScore }`), default model Haiku 4.5 for the high-volume first pass (medium band already escalates to humans), `VISION_MODEL_PROVIDER`/`ANTHROPIC_API_KEY` env-driven, provider swappable. Rationale: real behavior day one, cost-aware, no lock-in. Alternatives: dedicated CV service (heavier), stub-only (defers real behavior).
- [ ] **Step 2: ADR 0005 — `packages/ui` component library.** Decision: RN component library ported from `design-reference/`, pure-function styling tested with vitest, token-driven, RTL/reduced-motion first. Rationale: one home for the visual language, clean testable boundary, future `react-native-web` reuse. Alternatives: components inside `apps/mobile` (rejected — reuse/boundary), keep web components (rejected — wrong platform).
- [ ] **Step 3: ADR 0006 — RLS test strategy.** Decision (records the Phase 1 approach): integration tests that exercise Postgres RLS through the Supabase JS client as distinct signed-in users (anon/service + seeded users), asserting the two-axis visibility matrix, run against local `supabase start`. pgTAP considered for policy-unit coverage; integration chosen as primary for fidelity to real client access. Rationale: RLS is the un-bypassable enforcement tier (invariant #2) and must be tested like application code.
- [ ] **Step 4: Update `docs/decisions/README.md`** to list 0004–0006 and commit.

```bash
git add docs/decisions
git commit -m "docs(adr): add 0004 vision provider, 0005 ui library, 0006 rls test strategy"
```

---

## Task 6: Scaffold `packages/ui` + the RN theme bridge

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/index.ts`, `packages/ui/src/theme.ts`
- Test: `packages/ui/src/__tests__/theme.test.ts`
- Modify: `apps/mobile/src/lib/theme.ts`, `apps/mobile/package.json`

- [ ] **Step 1: `package.json`** — name `@safeplace/ui`, private, `main: src/index.ts`, scripts `typecheck`/`lint`/`test` mirroring other packages; deps: `@safeplace/design-tokens: workspace:*`; peerDeps: `react`, `react-native`, `react-native-reanimated`; devDeps: `vitest`, `@types/react`, `react-native`, `typescript`.
- [ ] **Step 2: `tsconfig.json`** — extend `../../tsconfig.base.json`, `jsx: react-jsx`, `rootDir: src`, `outDir: dist`.
- [ ] **Step 3: `theme.ts`** — bridge tokens into typed RN style helpers:

```ts
import { colors, fontFamily, fontSize, fontWeight, lineHeight, tracking, typeRole, spacing, radius, motion, elevation } from "@safeplace/design-tokens";
export const theme = { colors, fontFamily, fontSize, fontWeight, lineHeight, tracking, typeRole, spacing, radius, motion, elevation } as const;
export type Theme = typeof theme;
```

- [ ] **Step 4: test the bridge** (vitest) — asserts `theme.colors.primary` and `theme.typeRole.body.fontSize` are wired. Run `pnpm --filter @safeplace/ui test` → PASS.
- [ ] **Step 5: `apps/mobile/src/lib/theme.ts`** — re-export: `export { theme, type Theme } from "@safeplace/ui";` (preserves the single import seam). Add `@safeplace/ui: workspace:*` to `apps/mobile/package.json`, run `pnpm install`.
- [ ] **Step 6: Commit**

```bash
git add packages/ui apps/mobile/src/lib/theme.ts apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(ui): scaffold @safeplace/ui with the RN theme bridge"
```

---

## Task 7: Motion primitives

**Files:**
- Create: `packages/ui/src/motion/{stagger.ts,reduced-motion.ts,useRiseIn.ts,usePressScale.ts,useCtaHalo.ts,index.ts}`
- Test: `packages/ui/src/motion/__tests__/stagger.test.ts`

- [ ] **Step 1: Write the failing test for the pure stagger calc**

```ts
// packages/ui/src/motion/__tests__/stagger.test.ts
import { describe, expect, it } from "vitest";
import { staggerDelayForIndex } from "../stagger";

describe("staggerDelayForIndex", () => {
  it("first element has no delay", () => { expect(staggerDelayForIndex(0)).toBe(0); });
  it("uses ~100ms steps within the 80-120 band", () => {
    const d = staggerDelayForIndex(2);
    expect(d).toBeGreaterThanOrEqual(160);
    expect(d).toBeLessThanOrEqual(240);
  });
  it("returns 0 for every index when reduced motion is on", () => {
    expect(staggerDelayForIndex(3, { reducedMotion: true })).toBe(0);
  });
});
```

- [ ] **Step 2: Run it, verify it fails.** `pnpm --filter @safeplace/ui test` → FAIL.
- [ ] **Step 3: Implement `stagger.ts`**

```ts
import { motion } from "@safeplace/design-tokens";
const STEP = (motion.staggerDelayMs.min + motion.staggerDelayMs.max) / 2; // 100ms
export function staggerDelayForIndex(index: number, opts: { reducedMotion?: boolean; stepMs?: number } = {}): number {
  if (opts.reducedMotion) return 0;
  return Math.max(0, index) * (opts.stepMs ?? STEP);
}
```

- [ ] **Step 4: Run tests, verify pass.**
- [ ] **Step 5: Implement the reanimated hooks** (verified visually in the gallery, not unit-tested):
  - `reduced-motion.ts`: `useReducedMotion()` — subscribes to `AccessibilityInfo.isReduceMotionEnabled()` + change events, returns boolean.
  - `useRiseIn.ts`: given `{ index }`, returns an `useAnimatedStyle` fading opacity 0→1 and translateY `motion.entranceTranslateY`→0 over `motion.durationMs.base` with `Easing.bezier(...motion.easing.standard)`, delayed by `staggerDelayForIndex(index, { reducedMotion })`. When `reducedMotion`, snap to final state (no transform).
  - `usePressScale.ts`: returns `{ onPressIn, onPressOut, animatedStyle }` animating scale 1→`motion.pressScale`→1; no-op transform under reduced motion.
  - `useCtaHalo.ts`: infinite-repeat soft shadow/opacity pulse on `motion.ctaHaloDurationMs`; disabled under reduced motion.
  - `index.ts`: barrel.
- [ ] **Step 6: Typecheck + commit**

Run: `pnpm --filter @safeplace/ui typecheck && pnpm --filter @safeplace/ui test`
```bash
git add packages/ui/src/motion
git commit -m "feat(ui): fade-and-rise, press-scale, cta-halo motion primitives (reduced-motion gated)"
```

---

## Task 8: `Button` — the port pattern-setter (full TDD)

**Files:**
- Create: `packages/ui/src/primitives/Button.styles.ts`, `Button.tsx`
- Test: `packages/ui/src/primitives/__tests__/Button.styles.test.ts`

Source of truth: `design-reference/components/forms/Button.jsx` + `Button.d.ts`. Variants `primary | cta | secondary | ghost | danger`; sizes `sm | md | lg`; props `halo`, `block`, `disabled`, `onPress`.

- [ ] **Step 1: Write the failing test for `resolveButtonStyle`**

```ts
// packages/ui/src/primitives/__tests__/Button.styles.test.ts
import { describe, expect, it } from "vitest";
import { resolveButtonStyle } from "../Button.styles";
import { theme } from "../../theme";

describe("resolveButtonStyle", () => {
  it("primary rest uses deep blue bg + white text", () => {
    const s = resolveButtonStyle({ variant: "primary", size: "md", state: "rest", disabled: false });
    expect(s.container.backgroundColor).toBe(theme.colors.primary);
    expect(s.label.color).toBe(theme.colors.textOnPrimary);
  });
  it("cta uses the one warm terracotta accent", () => {
    const s = resolveButtonStyle({ variant: "cta", size: "md", state: "rest", disabled: false });
    expect(s.container.backgroundColor).toBe(theme.colors.accent);
  });
  it("pressed primary darkens one step", () => {
    const s = resolveButtonStyle({ variant: "primary", size: "md", state: "pressed", disabled: false });
    expect(s.container.backgroundColor).toBe(theme.colors.primaryDark);
  });
  it("disabled halves opacity regardless of variant", () => {
    const s = resolveButtonStyle({ variant: "cta", size: "md", state: "rest", disabled: true });
    expect(s.container.opacity).toBe(0.5);
  });
  it("md size meets a 44pt touch target", () => {
    const s = resolveButtonStyle({ variant: "primary", size: "md", state: "rest", disabled: false });
    expect(s.container.minHeight).toBeGreaterThanOrEqual(44);
  });
});
```

- [ ] **Step 2: Run it, verify it fails.** `pnpm --filter @safeplace/ui test` → FAIL.
- [ ] **Step 3: Implement `Button.styles.ts`** — pure `resolveButtonStyle({variant,size,state,disabled})` returning `{ container: ViewStyle, label: TextStyle }`, reading only from `theme` (variant→bg/hover/active/text/border maps mirroring `Button.jsx`; size→padding/minHeight/fontSize with `md.minHeight=44`, `lg=52`, `sm=36`; disabled→opacity 0.5). No hardcoded hexes.
- [ ] **Step 4: Run tests, verify pass.**
- [ ] **Step 5: Implement `Button.tsx`** — `Pressable` wrapper: tracks pressed state, applies `resolveButtonStyle`, `usePressScale`, optional `useCtaHalo` when `halo`; `accessibilityRole="button"`, `accessibilityState={{ disabled }}`, honors `block`; label uses `theme.typeRole` + `tracking.label`. Text is RTL-native (RN handles Hebrew); no manual mirroring needed for a centered label.
- [ ] **Step 6: Export from `src/index.ts`; typecheck; commit**

```bash
git add packages/ui/src/primitives/Button.tsx packages/ui/src/primitives/Button.styles.ts packages/ui/src/primitives/__tests__ packages/ui/src/index.ts
git commit -m "feat(ui): Button primitive (5 variants, 3 sizes) ported from design system"
```

**⟵ REVIEW CHECKPOINT.** Stop here and get sign-off on the `Button` API + port pattern before porting the rest (this is the "component API first reviewable" gate promised to Eli).

---

## Task 9: Remaining primitives + content + surfaces (parallelizable)

Each component follows the **Task 8 pattern**: pure style/behavior fn in `*.styles.ts` (vitest-tested) + thin `.tsx` wrapper; source of truth is the matching `design-reference/components/**/<Name>.jsx` + `.d.ts` + `.prompt.md`; token-driven, RTL-correct, reduced-motion aware; exported from `src/index.ts`; one commit per component. These are independent and MAY be dispatched to parallel subagents in a worktree.

For each: read the reference file, port props exactly, write the pure-logic test first, implement, verify, commit.

- [ ] **TextField** (`primitives/TextField.tsx`) — floating label, focus = 1.5px blue border + 3px soft-blue ring (`colors.blue100`), valid-check affordance, RTL text input (`textAlign` follows writing direction), `accessibilityLabel` from label. Test: `resolveFieldState(focused, valid, hasValue)` → border color + label position.
- [ ] **Toggle** (`primitives/Toggle.tsx`) — the switch used across settings + onboarding step 3. Test: `toggleTrackStyle(on, disabled)` colors; knob offset **mirrored for RTL** (on = knob to the *left* in RTL). Include an `readOnly` visual mode (onboarding step-3 defaults preview is display-only).
- [ ] **GenderChoice** (`primitives/GenderChoice.tsx`) — two large "door" buttons, symmetric, neutral; selected = thicker border + `blue050` fill (mirrors `GenderChoice.jsx`). Test: `doorStyle(selected, hovered)`. `accessibilityRole="radio"`, `accessibilityState={{ selected }}`, grid is RTL (גבר/אישה order per reference).
- [ ] **Checkbox** (`primitives/Checkbox.tsx`) — ToS consent box from onboarding step 2. Test: `checkboxStyle(checked)`. `accessibilityRole="checkbox"`.
- [ ] **Icon** (`content/Icon.tsx`) — port the curated Lucide glyph set from `design-reference/components/content/Icon.jsx` (`ICON_NAMES`) as `react-native-svg` paths (add `react-native-svg` peer dep) OR, to avoid a new native dep in Phase 0, wrap `@expo/vector-icons` Lucide set; **decide during execution and note it** (prefer `react-native-svg` inline paths for fidelity + no icon-font). 24×24, 2px stroke, `currentColor`→`color` prop. Test: `ICON_NAMES` contains the curated set (home, search, bell, plus, heart, comment, share, bookmark, users, image, poll, map-pin, tag, shield-check, lock, eye, settings, more-horizontal, info, user).
- [ ] **Avatar** (`content/Avatar.tsx`) — image or initial fallback; optional story `ring` with `ringColor`; sizes; the single subtle avatar-ring gradient allowed by the design. Test: `avatarFallbackInitial(name)` + `ringStyle(color)`.
- [ ] **SourceLabel** (`content/SourceLabel.tsx`) — the colored feed source label (group color+icon / neutral "פוסט ציבורי" / "מוצע עבורך"). **~16% tint** of the group color, never full saturation. Test: `sourceLabelStyle({kind, color})` → tinted bg + readable text; covers all three kinds.
- [ ] **InteractionBar** (`content/InteractionBar.tsx`) — like/comment/share/save row, minimal, counts as numbers (no lists — invariant #5). Test: `interactionState(liked, saved)` icon/color selection.
- [ ] **SystemNotice** (`feedback/SystemNotice.tsx`) — the neutral info/warning/danger block; canonical use is the women-detected upload notice + settings danger-zone. Wraps `Icon` + `Button`. Test: `noticeTone(tone)` → bg/border/icon per tone (info/warning/danger).
- [ ] **PostCard** (`surfaces/PostCard.tsx`) — the core feed unit; header (Avatar+name+time+⋯) → SourceLabel → body text → media/filtered-placeholder → InteractionBar. `filtered` prop renders the diagonal-stripe placeholder + "מדיה מסוננת לפי ההעדפות שלך" (UI defense-in-depth only — real enforcement is Phase 1 RLS). Test: `postCardMediaMode({ hasMedia, filtered })` → `"image" | "filtered" | "none"`.

---

## Task 10: Component gallery route + phase verification

**Files:**
- Create: `apps/mobile/app/gallery.tsx`
- Modify: `apps/mobile/README.md` (note the gallery + deferred font loading)

- [ ] **Step 1: Build the gallery** — a scrollable RTL screen rendering every `@safeplace/ui` component in its key states (Button all variants/sizes + halo; TextField focus/valid; Toggle on/off/readonly; GenderChoice; Checkbox; SourceLabel all kinds; Avatar with/without ring; InteractionBar; SystemNotice all tones incl. the exact women-detected copy; PostCard normal + filtered). Wrap groups in `useRiseIn` to exercise staggered entrance.
- [ ] **Step 2: Run it**

Run: `pnpm --filter @safeplace/mobile start` (or the `run` skill) and open the `/gallery` route in Expo Go / simulator.
Expected: renders RTL, Hebrew text correct direction, motion respects the OS reduce-motion setting, terracotta appears only on the CTA.

- [ ] **Step 3: Full green pipeline**

Run: `pnpm turbo run typecheck lint test`
Expected: all PASS across all workspaces including `@safeplace/ui` and `@safeplace/design-tokens`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/gallery.tsx apps/mobile/README.md
git commit -m "feat(mobile): component gallery route for RTL + motion verification"
```

---

## Definition of Done (CLAUDE.md §7 applied to Phase 0)

- [ ] `pnpm turbo run typecheck lint test` green across every workspace; lockfile committed (CI installs clean).
- [ ] `packages/design-tokens` holds **final** values (no PLACEHOLDER banners), incl. RN elevation tokens; unit-tested.
- [ ] `packages/ui` exports all 11 primitives, each with a passing pure-logic vitest suite; token-driven (no hardcoded hexes in components).
- [ ] RTL correct and reduced-motion honored, verified on-device via `/gallery`.
- [ ] ADRs 0004–0006 written; `design-reference/` tracked; `docs/design/README.md` updated.
- [ ] No visibility/upload surfaces touched (Phase 0 is pre-data) — nothing to route through `visibility-policy` or the moderation pipeline yet.

## Self-review notes

- **Spec coverage:** green build ✓(T1), design lock-in ✓(T2-4), motion system ✓(T7), component kit ✓(T8-9), ADRs ✓(T5), gallery/verify ✓(T10). All Phase-0 roadmap items covered.
- **Type consistency:** `resolveButtonStyle` returns `{container,label}` used identically in T8 test + `Button.tsx`; `staggerDelayForIndex(index, opts)` signature identical in T7 + consumed by `useRiseIn`; `theme` shape defined in T6 consumed everywhere after.
- **Deferred (flagged, not silent):** font-file loading via expo-font → Phase 2; `react-native-svg` vs `@expo/vector-icons` icon decision → resolved in T9 during execution; render-level component tests → optional later.
