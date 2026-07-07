# 0003 — First Push Scope: Design System + Onboarding Wizard

## Status

Accepted

## Context

The product has a strong, specific visual identity already characterized in
detail (`00-master-spec.md` §5, §6.3 — restrained color, generous
whitespace, Hebrew typography, specific micro-animation timing) but no
visual design has been locked in yet (multiple "⏳ to be planned: final
color palette, font, visual elements — in collaboration with a designer"
notes throughout). Writing screens against an unlocked visual language
means redoing styling work repeatedly.

The 3-step onboarding wizard (`00-master-spec.md` §6.2) is also the single
screen where the most product-critical, legally-load-bearing UX decisions
converge: neutral gender selection, transparent default-display, and the
emotional "front door" of the product. It exercises the full RTL animation
system in one place.

## Decision

The first implementation push targets two things, in order:

1. **Visual language lock-in**, done in Claude Design *before* this push's
   code is written: color palette, Hebrew RTL typography, card layout,
   colored source labels, and the onboarding wizard's specific animations.
   Output: a design reference informing `packages/design-tokens`.
2. **The onboarding wizard** (`00-master-spec.md` §6.2, all 3 steps),
   implemented in `apps/mobile`, as the first real screen — because it
   exercises RTL layout, the animation system, the design tokens, and (in
   step 3) a first read from `packages/visibility-policy`'s default-settings
   resolver, all in one bounded, well-specified surface.

Explicitly **not** in this push: the feed, post creation, any networked
data beyond a static defaults-preview, or any Supabase schema beyond what's
needed to create an account and read back its assigned defaults.

## Alternatives considered

- **Feed + single post + profile first**: this is the actual daily-use core
  of the product, but it depends on data modeling decisions (visibility
  enforcement, the weighted algorithm) that are better made once the team
  has working visual primitives to build against. Deferred to the second
  push.
- **Full repo scaffolding with no design lock-in**: rejected — building
  screens against an undefined visual language guarantees rework, and the
  product spec explicitly calls out visual quality as non-negotiable for
  this audience.

## Consequences

- `packages/design-tokens` ships with **placeholder** values pending the
  Claude Design session (clearly marked as such in that package's README) —
  do not treat the current token values as final.
- The second push's natural scope is the feed (`01-feed-spec.md`) and single
  post screen (`03-single-post-spec.md`), since post creation
  (`02-post-creation-spec.md`) depends on the exposure-selection UI that the
  feed/post screens establish patterns for.
