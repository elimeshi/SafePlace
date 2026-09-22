# 0004 — Vision Classifier Provider

## Status

Accepted

## Context

The moderation pipeline (`moderation-pipeline.md`, `07-moderation-spec.md`)
classifies whether uploaded media contains women, at upload time, for every
media surface (invariant #8). The specific vision-model vendor was left open
(`open-questions-backlog.md` §A). The pipeline must not sit in the synchronous
publish path (ADR 0002), classification thresholds are configuration not
constants (`classification.ts`), and only the resolved `MediaClassification`
enum — never the raw score — leaves the service. The team wants real
classification behavior from the first build of the pipeline, without locking
the product to one vendor.

## Decision

Classify via a **Claude vision model behind a `ClassifierProvider`
interface** — a single async `classify(image) → { rawConfidenceScore }` seam
that the three-tier band logic already consumes. The concrete model is
**configuration** (`VISION_MODEL_PROVIDER`, `ANTHROPIC_API_KEY` in
`.env.example`), not hardcoded. Starting model: **Claude Haiku 4.5** for the
high-volume first pass — it is vision-capable and cost/latency-appropriate
for per-upload classification, and the medium-confidence band already routes
to a human, so a cheaper first pass does not weaken the safety floor.
Accuracy (especially false-negative rate) is validated against real content
at Phase 3; if it is insufficient, the config escalates to a more capable
model (**`claude-sonnet-5`** is the next rung) with no code change.

> **Amended, Phase 3.** The original text named `claude-opus-4-8` as the
> escalation example; that is no longer the right next step. The current
> lineup is the Claude 5 family plus Haiku 4.5, so the first pass is
> **`claude-haiku-4-5`** (no date suffix) and the escalation target is
> **`claude-sonnet-5`**. Both are read from `moderation.pipeline_config`
> (ADR 0009's config table), not from the environment and never from a
> literal in pipeline code.
>
> One implementation note that changed the provider's shape: a vision model
> cannot emit a calibrated probability, so the provider returns a **verdict
> plus its own confidence**, and a pure projection maps that pair onto the
> 0..1 scale the spec's thresholds are written in. The three-band mechanism
> and the deferred thresholds are unchanged; what changed is that we stopped
> asking the model for a number it cannot produce honestly.

## Alternatives considered

- **Hardcode a single model** — rejected; thresholds and vendor are meant to
  be tuned post-MVP without redeploys, and a swappable seam costs nothing.
- **A dedicated computer-vision service / self-hosted model** — more control
  and no per-call API cost, but heavier to build and operate for a
  single-developer team, and the classification task ("does this contain
  women") is well within a general vision LLM's ability. Revisit if per-call
  cost or latency becomes a constraint at scale.
- **Stub-only classifier for development** — considered as the dev default,
  but the team chose real behavior from day one; a deterministic stub remains
  useful for tests and offline runs behind the same interface.

## Consequences

- The classifier is a swappable `ClassifierProvider`; `services/moderation-pipeline`
  depends on the interface, not on Anthropic specifically. A test/offline stub
  implements the same interface.
- The model id is read from config at runtime; the pipeline code never names a
  model literal, so tuning model/thresholds is a config change (consistent
  with ADR 0002's async-worker shape).
- Per-upload API cost is now an operating-cost line item
  (`open-questions-backlog.md` §A) — surfaced for tracking, not resolved here.
- Legal item #7 (automated LLM content scanning — proportionality,
  transparency, consent) in `legal-tracker.md` gates turning this on in
  production; building it does not require sign-off, shipping it does.
- Raw confidence scores stay internal (invariant reaffirmed): the provider
  returns a score, the band logic resolves it, and only the enum is persisted
  for `visibility-policy`/RLS to read.
