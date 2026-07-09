# Safe-Place — Design System

**מקום שמור** — a community social network for the Haredi (ultra-Orthodox Jewish) public in Israel. Facebook-inspired structure, Instagram-inspired polish, governed by one defining idea: a **gender-conditioned content-visibility system** where every user controls, in simple terms, what they consume. Hebrew-first, right-to-left, mobile-first. Israel-only at launch.

This project is the **visual lock-in** the source repo was explicitly waiting for: `packages/design-tokens` shipped *placeholder* values and `docs/design/README.md` reads "intentionally near-empty… pending Claude Design session." This design system turns that direction into a concrete, buildable foundation.

## The three words
Every decision is measured against **פשטות · שליטה אישית · הסכמה הדדית** (simplicity · personal control · mutual consent). If a feature seems to need a fourth principle, it is probably out of scope.

## Sources
Built from the product characterization repo (read-only reference — the reader may not have access, stored here in case they do):
- **GitHub:** [`elimeshi/SafePlace`](https://github.com/elimeshi/SafePlace) — explore it to build richer, spec-accurate designs.
  - `CLAUDE.md` — engineering invariants (visibility, symmetry, RTL, double-confirm).
  - `docs/product/00-master-spec.md` — vision, legal framing, spaces model, the 3-step onboarding wizard, §6.3 visual & motion direction.
  - `docs/product/01-feed-spec.md` — the main feed (v2): stories rail, spaces rail, weighted algorithm, post cards, source labels.
  - `docs/product/02-post-creation-spec.md` — post/status creation, the exposure field.
  - `packages/design-tokens/src/*` — colors, typography, spacing, motion (colors & fonts placeholder; **motion values are final** and transcribed verbatim).

There are 9 further product specs (single-post, group page, personal area, settings, moderation, search, messages) not yet turned into UI here — see "Next steps."

---

## Content fundamentals — how Safe-Place writes

- **Language:** Hebrew, RTL, always. Product copy is Hebrew; code/comments are English (clean boundary — CLAUDE.md §5).
- **Register:** warm, respectful, calm. Community-oriented ("הקהילה שלנו"), never slangy, never hype. Reflects a conservative, modern-Haredi audience.
- **Person:** addresses the user directly as **אתה/את** ("אתה שולט במה שאתה רואה, ובמה שאתה חולק"). Uses **אנחנו** for the platform's own voice ("הגדרנו עבורך…").
- **Neutrality is a rule, not a tone choice.** The gender mechanism is described factually and symmetrically — never "this is how men/women should behave," always "these are the settings we configured; you can change them anytime." The women-detected upload notice is the canonical example: *"זוהו נשים במדיה שהעלית. עליך לדעת שבעקבות זאת משתמשים רבים ברשת לא יוכלו לראות את תוכן המדיה שלך בפוסט הנוכחי. אישור / חזרה"* — informs, does not block, does not preach.
- **Dangerous actions get plain, honest warnings** and a double-confirm (settings §3.6). No dark patterns, no guilt.
- **No social-pressure copy.** Counts are shown quietly ("42"), never "only 3 left!" or read-receipt shaming (CLAUDE.md §8).
- **Emoji:** used *sparingly and warmly* in sample user content (💙 🙏), reflecting real community posting. Not used in system/chrome copy.
- **Casing:** Hebrew has no case. The Latin wordmark is "Safe·Place" (title case, mid-dot).
- **Example microcopy:** buttons — "יצירת חשבון", "הבנתי, המשך", "עקוב", "פרסם"; placeholders — "מה תרצה לשתף?", "כתוב לקבוצה…"; labels — "מי יראה את זה?", "מוצע עבורך", "פוסט ציבורי".

---

## Visual foundations

- **Color vibe:** restrained, modest, calm. A **deep soft blue** (`--blue-600` #2C5985) carries the brand; a single **warm terracotta** (`--terracotta-500` #C97D4F) is the one touch of warmth, reserved for the primary CTA of a screen. Everything else is generous white and quiet greys. Muted, never loud — "visual codes that don't shout" (§5.1.1).
- **Group palette:** 12 pre-defined muted colors (blue, sage, terracotta, plum, tan, teal, brick, slate, olive, indigo, clay, forest). Admins pick one per group; it becomes the group's identity and tints its source label. Source labels use a **soft ~16% tint** — never full saturation.
- **Typography:** modern Hebrew sans — **Rubik** (UI + display) with **Heebo** as companion/numerals. Near-zero letter-spacing (Hebrew wants it tight). Comfortable 1.6 line-height on body. Font choice is called out in the spec as "especially critical for this audience."
- **Whitespace:** "נדיבות בלבן" (generosity in white) is a *named* principle — err toward the larger end of the spacing scale between sections. The eye should rest, not be crowded.
- **Backgrounds:** flat. White surfaces on a very light grey page (`--ink-050`). **No gradients** as decoration (a single subtle avatar-ring gradient is the only exception), **no stock photos or generic illustrations** (§6.3.5 forbids them), no textures or patterns. Real user media only.
- **Cards:** the feed is "Facebook-lite" — each post is a self-contained white card with a **subtle 1px frame** (`--border-subtle`), soft **`--radius-lg`** (16px) corners, a **restrained shadow** (`--shadow-card`), and breathing room to the next card. Order and clarity over density.
- **Corner radii:** 6 (inputs) · 10 (buttons, labels) · 16 (cards) · 22 (large media/panels) · full (avatars, pills).
- **Elevation:** soft and low. Blue-tinted shadows (`rgba(16,38,60,…)`), never heavy black drop-shadows.
- **Borders:** thin, cool grey. Focus state = 1.5px blue border + a 3px soft blue ring (`--ring-focus`).
- **Motion (final, not placeholder — §6.3):** 200–400ms, soft ease-out (`cubic-bezier(0.25,0.1,0.25,1)`). The signature is **fade-and-rise** (opacity 0→1 + translateY 8px), staggered 80–120ms between elements on step load. Primary CTAs carry a very slow **breathing halo** (3.5s). Press feedback is a subtle **scale(0.97)**. RTL step transitions: outgoing exits left, incoming enters from right. Everything gates on `prefers-reduced-motion`. No 3D, parallax, floating particles, or attention-grabbing effects (§6.3.3).
- **Hover / press:** hover fills with a soft blue-grey (`--surface-sunken`); primary/CTA darken one step; press shrinks 3%. Gender "doors" thicken border + background on select — "pressing a door," not "ticking a box."
- **Transparency & blur:** used only where functional — the sticky app bar uses a translucent white + backdrop blur so content scrolls softly beneath it.
- **Filtered media state:** a modest diagonal-stripe placeholder with an eye icon and "מדיה מסוננת לפי ההעדפות שלך" — the UI layer of the visibility system (defense-in-depth; real enforcement is server/DB-side per CLAUDE.md invariant #2).

---

## Iconography

- **The repo ships no icon set.** Substituted: **[Lucide](https://lucide.dev)** (ISC license) — 24×24, 2px rounded stroke, `currentColor`. Its clean, geometric, restrained style matches the product's Instagram-like polish. **⚠ Flagged substitution** — replace with a bespoke or licensed set before production if desired.
- Icons are embedded as vector glyph data inside the `Icon` component (no runtime CDN dependency in the bundle). See `components/content/Icon.jsx` → `ICON_NAMES` for the curated set (home, search, bell, plus, heart, comment, share, bookmark, users, image, poll, map-pin, tag, shield-check, lock, eye, settings, more-horizontal, …).
- **Group icons** — the spec describes a categorized gallery of *hundreds* of built-in icons chosen per-group by admins (feed-spec §2.2.4). That gallery is **out of scope** for the component library and is not shipped here.
- **Emoji** appear only inside sample *user content*, never as UI chrome.
- **No logo / brand mark exists in the source.** Per policy we do **not** invent one — the brand renders as the **"Safe·Place" wordmark** in Rubik Bold (deep blue, one terracotta mid-dot) with the Hebrew tagline "מקום שמור". Supply a real logo and it replaces the wordmark everywhere. See `guidelines/brand-wordmark.card.html`.

---

## Index / manifest

**Foundations** (root): `styles.css` (entry — `@import`s only) → `tokens/` (`fonts`, `colors`, `group-palette`, `typography`, `spacing`, `motion`, `base`).

**Components** (`components/`, namespace `window.SafePlaceDesignSystem_58efd0`):
- `forms/` — **Button**, **TextField**, **Toggle**, **GenderChoice**, **Checkbox**
- `content/` — **Icon**, **Avatar**, **SourceLabel**, **InteractionBar**
- `feedback/` — **SystemNotice**
- `surfaces/` — **PostCard**

**UI kits** (`ui_kits/`):
- `mobile/` — the primary app: **Onboarding** (3-step wizard), **Feed**, **Compose**. Open `ui_kits/mobile/index.html`.

**Specimen cards** (`guidelines/`): color (primary, accent, neutrals, semantic, groups, labels), type (display, body, families), spacing (scale, radius/elevation), brand (wordmark, motion, principles). All appear in the Design System tab.

**`SKILL.md`** — makes this system usable as a downloadable Agent Skill.

### Intentional additions
- **Icon** — a wrapper over Lucide glyphs. The source defines no icon component, but UI icons (like/comment/share/plus/etc.) are needed throughout; this keeps them consistent and dependency-free.

---

## Caveats & next steps
- **Fonts:** Rubik + Heebo (Google Fonts, OFL) are the spec's own named candidates — legitimate, but the final Hebrew pairing should be confirmed and the files bundled into `apps/mobile` before production.
- **Colors** were transcribed from placeholder tokens (spec direction §6.3.5) and lightly systematized. Confirm the exact primary/accent hexes with the stakeholder.
- **Icons:** Lucide is a substitution — see Iconography.
- **Screens not yet built:** single-post, group page, personal area (family spaces), full settings (double-confirm flows), search, moderation console, messages. The `feedback/SystemNotice` and `forms/Toggle` primitives are ready for the settings dangerous-zone work.
