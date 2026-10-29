# 0019 — Hash Dedupe: Reuse a Resolved Verdict for an Identical Image

## Status

Accepted (2026-10-30).

## Context

Social traffic re-uploads the same images constantly: forwarded memes,
screenshots, the same event photo posted by five relatives. Each re-upload
is a full vision-model call today. The call is cheap (ADR 0018) but not free,
and the latency is user-visible under fail-closed visibility
(`20260922000001_unclassified_fail_closed.sql`).

A verdict copied from another upload must never weaken safety: copying
"general" from an image that is only *nearly* identical is exactly how a
filtered viewer ends up seeing a woman.

## Decision

**Before calling the model, the worker computes a SHA-256 of the bytes and a
64-bit dHash of the decoded image, and if another media item with the same
SHA-256 or the same dHash already holds a resolved classification
(`general` or `contains_women`, levels non-null), it copies that item's
levels and classification without a model call.** Both hashes are stored on
`media_items` for future lookups. Equality only — no Hamming-distance
search.

The copy is recorded in `classification_scores` with `provider = 'dedupe'`,
`model_id = 'copy:<source media id>'`, `verdict = 'duplicate'`, so it is as
auditable as a model verdict.

## Alternatives considered

- **No dedupe.** Simplest. Rejected because the hash is ~1 ms, the model is
  seconds, and the re-upload rate on a family network is expected to be
  high.
- **Perceptual near-duplicate search (Hamming ≤ k).** Catches re-encoded
  and lightly cropped copies. Rejected for now: a small Hamming distance
  cannot distinguish a re-encode from a face swap, and a wrong "general"
  copy fails open. Exact dHash equality already catches most re-encodes
  (same pixels, different JPEG bytes). Revisit with data, and if revisited,
  the safe variant is asymmetric: near-duplicates may only *inherit a flag*,
  never a clearance.
- **Copying `pending_review`.** Rejected; a frozen item has no verdict to
  copy. Both uploads go to the queue.
- **Dedupe at upload time in the client / API.** Would also save storage,
  but the client cannot be trusted with a verdict and the API layer is not
  in the classification path (ADR 0009). The worker is the only place with
  the bytes and the service role.

## Consequences

- Two indexed text columns on `media_items` and two optional parameters on
  `complete_classification_job`. Legacy rows have NULL hashes and simply
  never match.
- A moderator's later re-levelling of the source item does **not**
  propagate to copies. Follow-up: a `review` resolution could update every
  row sharing the hash. Logged in `open-questions-backlog.md` §K.
- A copied verdict is only as good as the source verdict; since sources are
  resolved items (model-confident or moderator-decided), the copy inherits
  the same confidence band semantics.
- The "gate" layer, if ever built, slots in after this step and before the
  model.
