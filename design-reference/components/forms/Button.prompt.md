**Button** — the primary interactive control. Deep blue by default; the warm terracotta `cta` variant is reserved for the single most important action on a screen (spec §6.3.5 — "one touch of warm color on the primary button").

```jsx
<Button variant="cta" size="lg" halo>יצירת חשבון</Button>
<Button variant="secondary">כניסה לחשבון קיים</Button>
```

Variants: `primary` (blue), `cta` (terracotta accent — one per screen), `secondary` (outline), `ghost`, `danger` (settings dangerous-zone). Sizes `sm | md | lg`. `halo` adds the 3.5s idle breathing glow used on onboarding CTAs. `block` for full-width. Press gives a subtle `scale(0.97)` (§6.3.2).
