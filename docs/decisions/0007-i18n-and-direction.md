# 0007 — i18n Readiness and Layout Direction

## Status

Accepted

## Context

The product is Hebrew-first and right-to-left (invariant #9). `CLAUDE.md` §5
already requires routing user-facing strings through an i18n layer even in the
Hebrew-only MVP, and `06-settings-spec.md` §3.5 lists additional languages as a
future item. New direction from Eli: support **English + LTR as an opt-in,
per-account setting** — not a default; Hebrew/RTL stays the default. The i18n
*runtime* (string catalogs, the account language setting, the switcher) is
future work, but the component library (`packages/ui`) and screens being built
now must not bake in assumptions that turn "add English/LTR" into a rewrite.

## Decision

Build direction- and locale-agnostic from the start; defer the i18n runtime.

1. **Layout uses flow-relative style props** — `start`/`end`,
   `marginStart`/`marginEnd`, `paddingStart`/`paddingEnd`, and
   `flexDirection: "row"` (which React Native auto-mirrors under RTL). Never
   physical `left`/`right`. A global `I18nManager.forceRTL(false)` then mirrors
   the whole UI for an English/LTR account with no per-component changes.
2. **Copy is never hardcoded in component logic.** Design-system components
   take user-facing text as props; any component with built-in copy (e.g.
   `SystemNotice`'s notice, `PostCard`'s filtered-media label) carries a
   **Hebrew default that is overridable via prop**, so an i18n layer can
   substitute translated strings later.
3. **Direction-sensitive motion derives from `I18nManager.isRTL`**, not a fixed
   constant. The fade-and-rise entrance is direction-neutral (translateY). The
   step-slide (onboarding wizard) and rail scroll (feed stories) resolve their
   left/right direction at runtime; `design-tokens`' `RTL_STEP_TRANSITION_DIRECTION`
   becomes a direction-aware helper when the wizard is built (Phase 2).

Fonts need no work — Rubik/Heebo cover Latin as well as Hebrew.

## Alternatives considered

- **RTL-only now, add LTR later** — rejected; retrofitting physical→logical
  props and extracting hardcoded copy across every component is exactly the
  rework this ADR avoids, at the cheapest possible moment (before the
  components exist).
- **Build the full i18n runtime now** — rejected as out of MVP scope (YAGNI):
  there are no non-Hebrew strings yet, no catalog, and the account setting
  belongs with the settings screen (Phase 6). Readiness is cheap; the runtime
  is not, and isn't needed to ship the Hebrew MVP.

## Consequences

- `packages/ui` components use flow-relative props and prop-overridable copy —
  enforced in the Task 9 port briefs and reviewable per component.
- A future i18n phase adds: a string catalog + `t()` layer, the per-account
  language/direction setting (`06-settings-spec.md`), and the `I18nManager`
  wiring + app reload needed to switch direction. Added to
  `open-questions-backlog.md` (i18n runtime + English catalog).
- Defaults are unchanged: Hebrew/RTL remains the default for every account;
  this ADR only makes the opposite direction reachable without rework.
