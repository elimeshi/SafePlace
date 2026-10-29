# 0018 — Multi-Group Content Classification

## Status

Accepted (2026-10-30). Extends ADR 0004; does not supersede it.

## Context

The product spec defines one classification axis: does the media depict a
woman (`00-master-spec.md` §3–§4). Eli has decided the filter must also cover
violence, non-Jewish religious imagery and addictions, each with several
levels, each under the viewer's control with defaults. The whole visibility
model — `media_classification` enum, RLS, `media_items_visible`,
`packages/visibility-policy`, the uploader notice — is built around the single
women axis.

Two research questions shaped the answer. First, whether to train small
per-category models or use a vision-language model: with four open-ended,
context-dependent categories and no labelled data (and Eli, for religious
reasons, never looking at or labelling an image), a VLM prompted with a
rubric is the only option that covers all groups. Second, whether to
self-host that VLM: on verified pricing Claude Haiku 5.5 costs ~$0.12–0.18
per 1,000 images and a serverless GPU is not cheaper below ~100k images/day,
so self-hosting is a privacy/control decision for later, not a cost one.
Eli has no GPU and a $5 development budget, which covers ~30k images.

Constraints: invariants #1 (classify content, never users), #2 (every layer
enforces), #3/#4 (defaults, not rules; symmetric mechanism), #6 (Family
Spaces), #8 (every surface classified). The master spec's legal framing
(§3.6) rests on the women default being the *only* gender-conditioned one.

## Decision

**The model outputs an ordinal level (0–3) per group — `sex`, `violence`,
`religion`, `addictions` — and viewer "levels" are a per-group maximum in
`filter_settings`. Level 3 is prohibited content that never auto-publishes.
The `media_classification` enum keeps its meaning as the lifecycle state;
levels are four new nullable columns beside it.**

Concretely:

1. Ladders as in `docs/architecture/content-categories.md` §1. `addictions`
   has no level 3 (Eli dropped "alcohol present").
2. Levels 1–2 are viewer filters (`max_<group>_level`, 0–2). Level 3 files
   the item for human review with reason `ai_prohibited_content`.
3. Defaults: `sex` stays gender-conditioned (male 0, female 1); the three
   new groups default to 0 for everyone. `hide_content_with_women` becomes a
   generated column (`max_sex_level = 0`).
4. Family Spaces lift the `sex` check only.
5. Classification: Claude Haiku 5.5 (`pipeline_config.model_id`), one
   structured-output call per image for all groups, rubric cached, image
   pre-resized to 768 px long edge. A model refusal (`stop_reason:
   "refusal"`) is treated as "the model saw something it would not describe":
   `pending_review`, reason `ai_refusal`, never retried as an error.
6. Escalation: medium-band or `uncertain` answers go to a second, stronger
   model (`pipeline_config.escalation_model_id`, Claude Sonnet 5.5) before a
   human. Off when the column is NULL.
7. The uploader sees one general notice card for any level ≥ 1, with a
   details affordance naming the groups found.
8. The confidence bands of `07-moderation-spec.md` §2.1 apply per group with
   the same `low_max` / `high_min` thresholds; the sex-axis projection
   (`woman_probability`) is retained in `classification_scores` for ADR 0011
   continuity.

## Alternatives considered

- **One small classifier per category (SigLIP embedding + linear head).**
  Cheapest at inference and the original idea. Rejected as the primary
  classifier: context-dependent categories (violence, idolatry) are weak on
  frozen embeddings, every new category needs labelled data nobody here can
  produce, and the saving over Haiku 5.5 at MVP volume is tens of dollars a
  month. Kept as a deferred "gate" layer (content-categories.md §7).
- **Self-hosted open VLM (Qwen3-VL, Gemma 3, ShieldGemma 2) on a serverless
  GPU.** Comparable per-image cost to Haiku 5.5, plus 1–2 weeks of
  engineering and ongoing ops, plus cold starts. Wins only on privacy and
  vendor independence. Deferred; the `ClassifierProvider` seam makes it a
  later swap.
- **Replace the enum with a per-group vector** (drop `general` /
  `contains_women`). Cleaner on paper; rejected because every RLS policy,
  view, parity test and screen reads the enum today, and the lifecycle
  meaning (unclassified / frozen / resolved) is exactly what those readers
  need. Levels beside the enum changes the readers that care about levels
  and nothing else.
- **A JSONB `levels` column instead of four smallints.** Flexible, but
  harder to constrain, index and mirror in the parity oracle. Four columns
  with CHECK constraints are boring and correct.
- **A boolean per category instead of ordinal levels.** Would force a
  relabel every time a level definition moves. Ordinal levels let the
  user-facing "levels" be a config mapping.
- **Level 3 as a viewer toggle.** Rejected on Eli's decision: a Haredi
  network does not host nudity or gore behind a switch.

## Consequences

- **Schema + RLS + visibility-policy change** — the biggest item in the plan
  (`docs/plans/classifier-cascade.md`, Phase C). The parity suite in
  `packages/db-testing` is extended, not replaced.
- `hide_content_with_women` is read-only from the app's point of view;
  `setContentFilterEnabled` writes `max_sex_level`.
- Review-queue load is multiplied by groups; the escalation tier exists to
  keep it bounded. Moderator tooling must show the group and level
  (`review_queue.ai_levels`).
- Product-spec entries for the three new groups, and the Hebrew copy for the
  notice card, details, onboarding and settings rows, are owed by Eli.
  Tracked in `open-questions-backlog.md` §K.
- Legal tracker: items 26–28 added (classification of religious imagery,
  prohibited-content removal basis, vendor processing of user images). They
  stay 🔴 — this ADR is an engineering decision, not a sign-off.
- The female default `sex` level 1 is an assumption carried from today's
  `hideContentWithWomen: false`; logged in the backlog for Eli to confirm.
- Backlog item "LLM vendor selection (§7.4)" is re-pointed at this ADR: the
  model is Claude Haiku 5.5 with Sonnet 5.5 escalation.
