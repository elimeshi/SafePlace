# Content Categories

> Derived from the decisions Eli made in the classifier research session
> (2026-10-22 … 2026-10-30), recorded in ADR 0018. The product spec covers
> only the women filter (`00-master-spec.md` §3–§4); the three new groups
> have **no product-spec entry yet** — Eli owes one before any of them ships.
> Until then this file is the engineering reference and the ADR is the
> authority.

## 1. Four groups, each an ordinal ladder

The model classifies every image into a level per group. Level 0 means
"nothing of this kind is depicted". Levels are ordered: a viewer who accepts
level N accepts everything at or below N.

| Group | 1 | 2 | 3 (prohibited) |
|---|---|---|---|
| `sex` | adult woman visibly depicted, modestly dressed | woman immodestly dressed, or a suggestive pose | nudity or a sexual act |
| `violence` | weapons shown, combat sport, a mild scuffle | fighting, blood, visible injury | gore, graphic death, self-harm |
| `religion` | incidental non-Jewish religious symbol (a church in a skyline) | prominent symbol, ritual, clergy | idolatry, missionary content, mockery of Judaism |
| `addictions` | drunkenness, smoking, cannabis | hard drugs, gambling | — (no level 3; the ladder is two steps) |

Eli dropped the original Addictions level 1 ("alcohol present") because
kiddush wine would trip it. So `addictions` tops out at 2, and `2` is still a
viewer choice, not a prohibition.

The `sex` level-1 definition is exactly the existing women rule
(`services/moderation-pipeline/src/classifier-prompt.ts`): any visible
depiction counts, however small, drawn or photographed; modesty does not
change *presence*; children are not adult women; uncertainty is a valid
answer. That text moves into the new rubric unchanged.

## 2. Filter vs. prohibit

- **Levels 1–2 are viewer-side filters.** Each user holds a maximum accepted
  level per group (`filter_settings.max_<group>_level`, 0–2). The upload is
  never blocked (invariant #1); the viewer decides what they see.
- **Level 3 is prohibited content.** It never auto-publishes: the pipeline
  files it for human review (`review_reason = 'ai_prohibited_content'`) and a
  moderator removes it or re-levels it. There is no viewer setting that
  opts into level 3. This is the one place the product says "no" to content
  rather than "not for me", and it is a moderation rule, not a filter.

## 3. Defaults (invariants #3 and #4)

| Group | male default | female default | user-changeable |
|---|---|---|---|
| `sex` | 0 (= today's `hideContentWithWomen: true`) | 1 (= today's `false`; **assumption, Eli to confirm** — see backlog) | yes, 0–2 |
| `violence` | 0 | 0 | yes, 0–2 |
| `religion` | 0 | 0 | yes, 0–2 |
| `addictions` | 0 | 0 | yes, 0–2 |

Only `sex` is gender-conditioned. The three new groups have one default for
everyone, which keeps the legally load-bearing asymmetry
(`visibility-model.md` §5) exactly as narrow as it is today.

`hide_content_with_women` survives as a **generated column**
(`max_sex_level = 0`) so every existing SQL reader keeps working; the app
writes `max_sex_level`.

## 4. Family Spaces (invariant #6)

Inside a confirmed Family Space the `sex` check is lifted and nothing else
is: violence, religion and addictions levels still apply to every viewer.
The exception exists for modesty between relatives; it was never about gore.

## 5. Lifecycle vs. levels

`media_items.classification` keeps its four values and its meaning as the
**lifecycle** state (`unclassified` → `general` / `pending_review` /
`contains_women`). The levels live beside it:

```
media_items.sex_level, violence_level, religion_level, addictions_level
  smallint, 0..3, NULL until classified
```

Invariants held by `moderation.complete_classification_job`:

- `classification in ('general','contains_women')` ⇔ all four levels non-null.
- `classification = 'contains_women'` ⇔ `sex_level >= 1`.
- Any level 3, any `uncertain`, any medium-confidence band, or a model
  refusal ⇒ `classification = 'pending_review'`, levels stay NULL, a
  review-queue row carries the model's partial answer in `ai_levels`.

Visibility (`packages/visibility-policy` and its SQL mirror):

```
uploader                                   → visible
classification ∉ {general, contains_women} → withheld (fail closed)
levels null                                → withheld (fail closed)
∀ group: level ≤ viewer max level          → visible   (sex skipped inside a Family Space)
```

## 6. What the uploader is told

One **general** notice card for any level ≥ 1 in any group ("content that
many users on the network chose not to see was identified in your media"),
with an affordance to see *which* groups were found. The women-specific
copy (`WOMEN_DETECTED_NOTICE_HE`) is retired by the general card; the
gender-conditioned *trigger* for the `sex` group stays as it is today (shown
to a male uploader; the ⏳ in master spec §4.4.2 is still open).

Hebrew copy for the card, the details sheet, the onboarding rows and the
settings rows is **Eli's** (product copy); the plan carries drafts marked as
such.

## 7. The pipeline, in three layers

1. **Dedupe** (ADR 0019): exact SHA-256 or exact 64-bit dHash match against
   an already-resolved item copies its verdict. No model call.
2. **Gate** — *deferred*. A SigLIP-class encoder with one binary head was
   costed and does not pay for itself below ~100k images/day on Claude Haiku
   5.5 pricing. Revisit when volume or a self-hosting decision says so.
3. **Vision model**: Claude Haiku 5.5, one structured call per image
   returning all four groups, cached rubric, images pre-resized to 768 px.
   `uncertain` or medium-confidence answers escalate to Claude Sonnet 5.5
   (config flag) before a human sees them.

Cost reference (Anthropic pricing page, 2026-10-30): ~$0.12–0.18 per 1,000
images realtime, half on the Batch API. Haiku 4.5, the ADR 0004 starting
model, is ~10× that.

## 8. Video

Unchanged: ADR 0010 routes video to human review. Frame sampling is its own
ADR when it is built; the per-group output shape above is what each frame
will produce.
