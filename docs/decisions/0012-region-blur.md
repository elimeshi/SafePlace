# 0012 — Region Blur: Redacting Instead of Withholding

## Status

Accepted — **built, and switched off.** The read side is gated behind
`moderation.pipeline_config.region_blur_enabled`, default `false`, pending the
product/community sign-off described under Consequences.

## Context

Until now a viewer whose filter applies to an item gets no image at all. For
an image *about* a woman that is the right outcome. For a street photograph
where a woman is one figure among twenty, it costs the viewer the entire
photograph to obscure something incidental.

Eli proposed having the vision model return the regions containing women and
serving a version with those regions obscured, so the rest of the image
survives.

The attraction is obvious. The danger is not, and it is structural:
**withholding an image fails safe, and blurring regions fails open.** If the
localizer misses one woman in a crowd, the viewer is served an image that
still contains her — and believes the filter worked. That is worse than
showing them nothing, and worse than showing them everything, because it
breaks the promise silently.

Vision models are also weakest at exactly this task. They are near-perfect at
"is a woman here" and merely decent at "where, exactly" — coordinates are
approximate, and Haiku-tier is the weakest at them.

## Decision

Build it, with the pipeline **verifying its own output** rather than trusting
the localizer:

```
classify → woman_present
   → localize (normalized boxes + a completeness claim)
   → pad each box outward
   → abandon if coverage is too high (blurring most of an image ≡ withholding it)
   → redact server-side, irreversibly
   → RE-CLASSIFY the redacted output
        ├─ confident "no woman"  → store the derivative and serve it
        └─ anything else         → discard it and withhold as before
```

Every uncertainty falls back to the pre-existing behaviour. An incomplete set
of boxes, an unreadable response, a truncated generation, a failed redaction,
a re-check that is merely *unsure* — all of them withhold the original.
Blurring is an improvement offered when the pipeline is confident; it is never
a weaker substitute for withholding.

Serving reuses the existing mechanism rather than adding one:
`media_items_visible` decides which path a viewer is served and storage only
signs a path that view returned, so a filtered viewer is handed the
derivative's path and the original remains unreachable by the same rule that
protected it before.

## Alternatives considered

- **Trust the localizer and skip the re-check.** One model call cheaper per
  flagged image. Rejected: it makes a missed woman invisible to us as well as
  to the system, which converts the feature's failure mode from "sometimes
  withholds unnecessarily" into "sometimes exposes silently".
- **A person detector (YOLO/RetinaFace) for geometry, the LLM for judgment.**
  Tighter boxes, and the honest long-term answer if VLM coordinates prove too
  loose. Rejected for now on deployment weight — an ONNX runtime in a
  serverless function is a bundle-size and cold-start problem — and because
  the re-check makes loose boxes safe rather than dangerous. Revisit if the
  re-check rejects too many derivatives to be useful.
- **Blur client-side from coordinates.** Trivially reversible in a devtools
  panel. Not a filter; rejected outright.
- **Pixel coordinates instead of normalized.** Rejected: the API scales
  oversized images down before the model sees them and does not report the
  dimensions used, so a pixel box would be expressed in a coordinate system we
  cannot reconstruct. Normalized coordinates survive any aspect-preserving
  scale. (This assumption — that the scale preserves aspect ratio — is the one
  thing worth verifying empirically against the real API.)
- **Gaussian blur.** Substantially recoverable by deconvolution. Each region
  is instead resampled down to a few pixels and blown back up, which discards
  the information rather than smearing it.

## Consequences

- **The switch is a product decision, not an engineering one, and it is not
  ours.** Whether a blurred-region image reads to this community as a
  reasonable accommodation or as *worse* than no image — an image that
  announces "a woman is here, obscured" — is plausibly a rabbinic question.
  There is also the dignity of the woman depicted, whose image is being served
  in altered form without her involvement. Hence: built, tested, off.
- **It creates a third filtered state the specs do not describe.**
  `05-personal-area-spec.md` §2.6.3 defines the filtered state as a neutral
  placeholder, and the master-spec notice tells a male uploader that many
  users "will not be able to see this media" — which stops being accurate for
  a post that is served blurred. Both need product review before the switch is
  thrown; flagged in the backlog, not silently edited.
- **Roughly 3 model calls per flagged image instead of 1**, and unchanged for
  everything else — most uploads are never flagged. At Haiku rates that is
  about $0.008 versus $0.003 per flagged image.
- **A second stored object per redacted item**, subject to the same storage
  policy as the original.
- **What is recorded is deliberately not where anyone was.**
  `moderation.redactions` holds a region *count* and a coverage *fraction* —
  never the rectangles. "A woman is at these coordinates in this person's
  photograph" is a more sensitive record than the verdict beside it, and once
  the derivative exists nothing needs it. Same reasoning as ADR 0011.
- **`legal-tracker.md` item 7 stays 🔴**, and this enlarges what counsel has
  to look at: the product would now store machine-altered derivatives of
  users' photographs.
