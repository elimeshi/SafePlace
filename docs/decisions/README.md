# Decisions

- `0000-template.md` — copy this for any new ADR.
- `0001-client-platform.md` — React Native + Expo.
- `0002-backend-platform.md` — Supabase.
- `0003-first-push-scope.md` — design system + onboarding wizard first.
- `0004-vision-classifier-provider.md` — Claude vision behind a swappable provider.
- `0005-ui-component-library.md` — `packages/ui`, RN primitives ported from design-reference.
- `0006-rls-test-strategy.md` — integration tests through the Supabase client, local-first.
- `0007-i18n-and-direction.md` — build direction/locale-agnostic now; English+LTR is a future opt-in setting.
- `0008-mobile-session-persistence.md` — AsyncStorage-backed session for MVP.
- `0009-classification-worker-runtime.md` — Postgres queue drained by a stateless scheduled handler.
- `0010-images-only-classification.md` — MVP classifies images; video goes to human review.
- `0011-raw-score-retention.md` — keep verdict + confidence 90 days, service-role only, never the reasoning.
- `0012-region-blur.md` — redact regions instead of withholding the whole image; built, switched off.
- `0013-random-feed-ordering-and-ranking-seam.md` — seeded-keyset random feed; `feed_page` is the ranking seam.
- `0014-explicit-only-interaction-signals.md` — like/comment/save/share/mute/feedback only; no time-on-post.
- `0015-classify-while-composing-drafts.md` — author-only drafts so classification runs while typing; purge.
- `0016-likes-are-number-only.md` — invariant #5 wins over `03` §4.1; counts via `post_stats`.
- `0017-multi-audience-exposure.md` — `post_audiences`, OR visibility, Family Space never mixes (pending Eli).
- `0018-multi-group-content-classification.md` — four ordinal ladders (sex/violence/religion/addictions), level 3 prohibited, Haiku 5.5 + Sonnet escalation.
- `0019-hash-dedupe-verdict-reuse.md` — only an exact SHA-256 match copies a resolved verdict (dHash stored, never grants a clearance — amended 2026-11-02); no near-dup search.
- `open-questions-backlog.md` — every item the product specs explicitly
  deferred (97 items), organized by area. Check here before assuming
  something was overlooked.
