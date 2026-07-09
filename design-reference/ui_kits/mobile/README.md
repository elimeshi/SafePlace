# Safe-Place — Mobile app UI kit

The primary client (React Native + Expo in production; recreated here in HTML/React for design). Mobile-first, RTL Hebrew. Open `index.html` for the interactive flow.

## Flow
`onboarding → feed → compose`, wired in `index.html` inside a phone frame. Screen state persists in `localStorage` (`sp_screen`); the "התחל מחדש" button resets it.

## Screens
- **Onboarding.jsx** — the 3-step wizard (master §6.2): welcome → account + gender → read-only defaults. Uses fade-and-rise entrance, staggered per element.
- **Feed.jsx** — the main feed (feed-spec §2): app bar, stories rail (create-circle first, RTL), connected-spaces rail, post cards with colored source labels, a filtered-media post, follow-suggestions strip, bottom tabs.
- **Compose.jsx** — post creation (post-creation-spec §3): identity + exposure picker ("מי יראה את זה?"), text-first writing area, attachments bar. The media button triggers the neutral women-detected upload notice (master §4.4.2).

## Grounding
Every screen derives from the product specs in `elimeshi/SafePlace` (`docs/product/*`). Where the spec defers a decision (⏳), the kit shows a reasonable MVP treatment — it does not invent unspecified features. Composes the design-system components from `components/`; does not re-implement them.
