---
name: safeplace-design
description: Use this skill to generate well-branded interfaces and assets for Safe-Place (מקום שמור) — a Hebrew RTL community social network for the Haredi public — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

Safe-Place is **Hebrew-first, right-to-left, mobile-first**. Always build RTL-correct (text direction, icon mirroring, scroll/animation direction). The brand is restrained and modest: a deep soft blue primary, one warm terracotta accent used sparingly, generous whitespace, quiet greys, no gradients/stock imagery. Motion is gentle (fade-and-rise, 200–400ms ease-out) and always gates on `prefers-reduced-motion`. Copy is warm, respectful, factual, and gender-neutral in mechanism — never preachy.

Key files:
- `readme.md` — full product context, content fundamentals, visual foundations, iconography, and a component/kit index.
- `styles.css` + `tokens/` — the token foundation. Link `styles.css` to inherit all colors, type, spacing, and motion.
- `components/` — reusable React primitives (Button, TextField, Toggle, GenderChoice, Checkbox, Icon, Avatar, SourceLabel, InteractionBar, SystemNotice, PostCard). Read each `*.prompt.md` for usage.
- `ui_kits/mobile/` — the interactive app recreation (onboarding → feed → compose) to reference for full-screen layouts.
- `guidelines/` — foundation specimen cards.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets/tokens out and produce static HTML files for the user to view. If working on production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without other guidance, ask them what they want to build, ask a few clarifying questions, and act as an expert designer who outputs HTML artifacts *or* production code depending on the need.
