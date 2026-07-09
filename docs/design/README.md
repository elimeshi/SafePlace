# Design

The visual language is **locked**. Per `docs/decisions/0003-first-push-scope.md`,
the color palette, Hebrew RTL typography, card layout, colored source labels,
and the onboarding wizard's motion system were finalized in a Claude Design
session. This folder documents that direction; the buildable expression of it
lives in code.

## Where things live

- **`design-reference/`** (repo root) — the canonical export from the design
  session: token stylesheets (`design-reference/tokens/*.css`), component
  reference (`design-reference/components/**` as web/React-DOM previews with
  `*.prompt.md` usage notes and `*.d.ts` prop contracts), foundation specimen
  cards (`design-reference/guidelines/*`), and the mobile UI-kit mockups
  (`design-reference/ui_kits/mobile/*`). This is the **source of truth for the
  look** — it is web/DOM reference, not shipped code.
- **`packages/design-tokens`** — the finalized token values as
  platform-agnostic TypeScript (colors, typography, spacing/radius, motion,
  and RN-shaped elevation). These are code, not documentation.
- **`packages/ui`** — the React Native component library that ports the
  `design-reference` components into shipped, token-driven, RTL- and
  reduced-motion-correct primitives. See `docs/decisions/0005-ui-component-library.md`.

## Note on substitutions (confirm before production)

The design session flagged three items to revisit before production: the icon
set (Lucide, as a substitution), the exact Hebrew font pairing (Rubik + Heebo,
Google Fonts / OFL), and the precise primary/accent hexes — all transcribed
into `packages/design-tokens`. There is deliberately **no invented logo**; the
brand renders as the "Safe·Place" wordmark until a real mark is supplied.
