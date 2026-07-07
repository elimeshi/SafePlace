# Design

This folder is intentionally near-empty. Per
`docs/decisions/0003-first-push-scope.md`, the visual language (color
palette, Hebrew RTL typography, card layout, the onboarding wizard's
animation system) is being locked in via a Claude Design session **before**
final values land here and in `packages/design-tokens`.

When that session concludes, this folder should hold:

- `visual-language.md` — the finalized token rationale (why these colors,
  why this type pairing), distinct from the raw token values in
  `packages/design-tokens` (which are code, not documentation).
- Exported reference screens / component specs from the Claude Design
  session, as a durable record separate from the live design tool.

Until then, `packages/design-tokens` ships with placeholder values directly
transcribed from the product spec's stated direction
(`docs/product/00-master-spec.md` §6.3.5: a deep, soft blue as primary, a
warm accent used sparingly, generous whitespace) — treat them as a
starting point for the Claude Design session, not as final answers.
