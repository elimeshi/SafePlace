# 0001 — Client Platform: React Native + Expo

## Status

Accepted

## Context

The product spec mandates a mobile-first experience (`00-master-spec.md`
§5.2.3 — mobile is the default, desktop is centered 600px column, "most
users are there"), heavy custom animation work (onboarding wizard §6.3, feed
scroll-collapse behavior in `01-feed-spec.md` §6), and a high bar on visual
polish ("Instagram-grade" UX, master spec §1.2, §5.1). It also needs to ship
on iOS and Android from day one, by a single primary developer working
through VS Code + an AI coding agent.

## Decision

Build the client in **React Native + Expo**, TypeScript strict mode, as a
single codebase targeting iOS and Android. Desktop/web is not built as a
first-class native target yet — see "Consequences" below.

## Alternatives considered

- **Flutter**: excellent performance and animation control, but introduces a
  second language (Dart) and a separate ecosystem from the rest of the
  stack (Supabase tooling, the moderation pipeline, etc., which are
  TypeScript/JS-first). Rejected primarily to keep one language across the
  whole monorepo, which matters more given a single-developer-plus-AI-agent
  workflow than Flutter's marginal animation-performance edge.
- **Web-first PWA (Next.js)**: fastest to a public URL, but the target
  community's primary usage context is mobile-first per the spec, and a PWA
  gives up native gesture/animation fidelity that the onboarding wizard and
  feed interactions are specified in detail to need (master spec §6.3).
  Rejected as the primary client; may still be revisited for the desktop
  surface (see Consequences).

## Consequences

- Expo's managed workflow gives fast iteration and OTA updates, at the cost
  of needing to eject (or use config plugins) for any native module Expo
  doesn't support out of the box. Watch for this if/when push notifications,
  camera/media handling, or the LLM classification client SDK need native
  modules outside Expo's managed set.
- RTL support must be configured at the Expo/React Native level from the
  start (`expo.extra.rtl` / `I18nManager.forceRTL`), not patched in later —
  see `CLAUDE.md` invariant #9.
- Desktop web is **not** solved by this ADR. Expo does support a web target,
  which can serve as a placeholder, but the spec's desktop layout (centered
  600px column, distinct side-column content per
  `01-feed-spec.md` §5.2 — explicitly marked "to be planned in full
  separately") may eventually warrant a dedicated Next.js app in `apps/web`.
  This is an open question — see `open-questions-backlog.md`.
- `packages/design-tokens` and `packages/visibility-policy` are written as
  platform-agnostic TypeScript so they can be reused if/when a separate web
  app is built.
