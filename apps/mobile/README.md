# @safeplace/mobile

The primary Safe-Place client — React Native + Expo, targeting iOS and
Android. See `docs/decisions/0001-client-platform.md` for why.

## Structure

```
apps/mobile/
├── app/                 ← expo-router file-based routes
│   ├── _layout.tsx       ← root layout; bootstraps RTL before first render
│   ├── index.tsx         ← current entry point (wiring-check placeholder)
│   └── gallery.tsx       ← dev-only component gallery (/gallery route)
├── src/
│   ├── lib/
│   │   ├── rtl.ts         ← forces RTL — see CLAUDE.md invariant #9
│   │   └── theme.ts       ← re-exports the @safeplace/ui theme bridge
│   ├── screens/
│   │   ├── onboarding/    ← next up: the 3-step wizard (see its README)
│   │   └── feed/          ← second push (see its README)
│   └── navigation/        ← navigation helpers (not routes — see its README)
└── assets/                ← fonts, images (empty until the design session)
```

## Getting started

```bash
# from the repo root
pnpm install
pnpm --filter @safeplace/mobile start
```

This currently renders a minimal wiring-check screen (RTL Hebrew text,
themed via `@safeplace/design-tokens`) — not a real product screen yet.
See `src/screens/onboarding/README.md` for what to build next.

## Component gallery

`@safeplace/ui` is the RN component kit (ported from `design-reference/`,
token-driven, RTL- and reduced-motion-correct). Open the **`/gallery`** route
to eyeball every primitive's states, RTL layout, and the fade-and-rise / press
/ CTA-halo motion on a device — toggle the OS "reduce motion" setting to verify
the gating. It is a dev screen, not part of the product flow.

**Fonts:** the Rubik/Heebo families named in the tokens are not yet loaded via
`expo-font` — that lands with the onboarding screen (Phase 2), where they first
render. Until then the device falls back to its default sans.

## Before you build a screen

Read the root `CLAUDE.md` in full — especially the invariants in §3 and the
Definition of Done in §7. Use `.claude/commands/new-screen.md` as your
workflow.
