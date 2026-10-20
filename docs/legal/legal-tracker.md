# Legal Sign-Off Tracker

> **None of this is legal advice, and nothing here should be treated as a
> legal conclusion.** This file exists to make sure every point the product
> specs flagged as needing attorney review is tracked in one place and
> doesn't get lost or silently shipped. The product was deliberately
> designed around a specific legal framing — see `00-master-spec.md` §3 —
> but that framing has not yet been validated by counsel.

Source: every "⚖ טעון אישור משפטי" marker across `docs/product/*.md`
(16 feature-specific items), plus the master spec's own consolidated list
in §3.7 (9 items). **25 items total.**

Status legend: 🔴 not yet reviewed · 🟡 in review · 🟢 cleared

## General / cross-cutting (master spec §3.7)

| # | Item | Status |
|---|---|---|
| 1 | Whether the product counts as a "public service" under Israel's Prohibition of Discrimination Law (5761-2000), and whether the chosen framing holds up | 🔴 |
| 2 | Terms of service & privacy policy wording, consistent with the chosen legal approach | 🔴 |
| 3 | Whether the signup flow and choices presented to the user match the legal framing | 🔴 |
| 4 | Public-facing wording describing the nature of the space (how it's presented externally) | 🔴 |
| 5 | Legal basis for collecting declared gender, retention, and permitted uses | 🔴 |
| 6 | Whether a "prefer not to say" gender option is required, and its effect on the onboarding screen | 🔴 |
| 7 | Legal requirements around automated content scanning (LLM) — proportionality, transparency, consent. **Phase 3 built the scanning pipeline and made specific choices counsel should see: what is retained (the model's verdict and confidence, never its free-text reasoning), for how long (90 days), and reachable by whom (service role only) — see ADR 0011. Region blur (ADR 0012, built and switched off) would additionally store machine-altered derivatives of users' photographs. Building it needed no sign-off; switching it on for real users does.** **Phase 4 note (ADR 0015): media is now also scanned from the moment it is attached in the composer, as an author-only draft, including drafts that are never published.** | 🔴 |
| 8 | Legal status of "space" (group) admins — are they officeholders, and what's their liability | 🔴 |
| 9 | Moderation policy — the platform's responsibility for content posted on it | 🔴 |

## Feature-specific

| # | Item | Source | Status |
|---|---|---|---|
| 10 | Location-tagging data collection/retention policy — proportionality and consent | `02-post-creation-spec.md` §3.5 | 🔴 |
| 11 | Cross-gender tagging mechanism — risk of unwanted exposure, conflict with personal consumption control | `02-post-creation-spec.md` §3.6 | 🔴 |
| 12 | Comment-level media classification confirmed equivalent to post-level — confirm this holds up the same way legally. *Phase 4 note: comment media is built on the same `media_items` pipeline as post media; still unreviewed.* | `03-single-post-spec.md` §3.4 | 🔴 |
| 13 | External link sharing — does the link require signup to view, or is the post openly viewable outside the product. *Phase 4 note: copy-link is built for public posts only (`canCopyExternalLink`), no media, no preview; opening requires sign-in.* | `03-single-post-spec.md` §5.4 | 🔴 |
| 14 | Filtering-still-applies-inside-groups vs. the Family Space exception — needs precise ToS wording | `04-group-page-spec.md` §3.3 | 🔴 |
| 15 | Group admin status/liability for content posted in their group | `04-group-page-spec.md` §5.3 | 🔴 (duplicate of #8, track jointly) |
| 16 | "Number without list" privacy decision — does follower count alone require disclosure in the privacy policy. *Phase 4 note (ADR 0016): like and comment counts are now shown, never lists; this item covers them too.* | `05-personal-area-spec.md` §2.5 | 🔴 |
| 17 | Auto-swap to neutral avatar when a profile photo is filtered — must be worded as filtering, not blocking/judgment | `05-personal-area-spec.md` §2.6.1 | 🔴 |
| 18 | Private messaging in a gender-separated product — can men and women message at all, in what contexts, mutual opt-in vs. open model, how separation is enforced within a conversation | `05-personal-area-spec.md` §4.2 | 🔴 |
| 19 | Gender-change mechanism — once-per-year limit, 24h activation delay, warning copy | `06-settings-spec.md` §4.3.2 | 🔴 |
| 20 | Account deletion policy — 30-day hold period, fate of comments left on others' posts, GDPR / Israeli data-protection law compliance | `06-settings-spec.md` §4.3.3 | 🔴 |
| 21 | Moderation staff structure — employment terms, training, oversight, exposure to sensitive content, mental-health/wellbeing requirements | `07-moderation-spec.md` §4.1 | 🔴 |
| 22 | Cross-gender user search/discoverability — is this required to be possible by anti-discrimination law (default: yes, opt-out available) | `08-search-spec.md` §1.2 | 🔴 |
| 23 | No server-side search history storage — strong privacy decision; confirm compliant with Israeli privacy law, and confirm implications for moderation's ability to detect malicious search patterns | `08-search-spec.md` §6.1 | 🔴 |
| 24 | Private messaging overall mechanism and wording — communication freedom framed as non-discrimination, not "encouragement" of cross-gender contact | `09-messages-spec.md` §1.2 | 🔴 |
| 25 | Gender separation toggle in messages, as a "dangerous setting" requiring double-confirmation — exact warning copy | `09-messages-spec.md` §5.2.1 | 🔴 |

## Process

- This tracker is a development-time aid, not a substitute for actually
  engaging counsel. Per Eli's own master spec (§8.2.1), legal review is the
  first recommended near-term step alongside design and additional screen
  characterization.
- **Before shipping any of the following to production, confirm its
  tracker item is 🟢, not just built and working:** gender-change flow,
  account deletion, cross-gender messaging, automated LLM content scanning,
  group admin terms, location tagging, cross-gender tagging.
- Engineering should build all of the above per spec — being legally
  unreviewed doesn't block development — but flag explicitly before any
  production launch involving these flows.
