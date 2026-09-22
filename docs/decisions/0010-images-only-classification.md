# 0010 — Images-Only Classification for MVP

## Status

Accepted

## Context

The product spec classifies "every image and video" (master spec §4.4.1), and
`visibility-model.md` §4 lists video-bearing surfaces. But a vision model
takes frames, not video: classifying a clip means decoding it, sampling frames
on some strategy, classifying each, and combining the results — with a
sampling rate that trades cost against the chance of missing a woman who
appears for two seconds.

That is a real subsystem, not a flag. Meanwhile, since migration 0007 an
unclassified item is withheld from everyone but its uploader, so "we haven't
built video yet" cannot mean "video sits unclassified" — that would be an
invisible post with no explanation and nobody looking at it.

## Decision

**MVP classifies images only. Any media the pipeline cannot classify —
including video, and including media whose `content_type` is unknown — is
completed as `pending_review` and filed in the human review queue.**

The classification prompt, the provider, and the band logic are all
image-shaped. Nothing guesses at a format.

## Alternatives considered

- **Frame sampling now (ffmpeg or a WASM decoder in the worker).** The
  complete answer, and where this ends up. Rejected for MVP on Eli's
  direction ("without video for now"): it is a subsystem with its own
  accuracy question — how many frames, chosen how — and shipping it badly is
  worse than not shipping it, because a video that passes on sampled frames
  looks classified.
- **Reject video at upload.** Simple, and it would keep the queue clean.
  Rejected because it collides with invariant #1's spirit: upload is never
  blocked on what the content is. It would also be a silent product
  amputation rather than a deferral.
- **Treat video as `general` (auto-approve).** Rejected outright. It would
  serve unexamined video to exactly the viewers who asked not to see this
  content, which is the one failure mode the whole system exists to prevent.

## Consequences

- **Video is usable but slow.** A video post is visible to its uploader
  immediately and to everyone else once a moderator clears it. That is honest,
  and it is a real moderation-cost bet: if the pilot posts a lot of video, the
  queue absorbs it, and that shows up as moderator load rather than as a bug.
- **Unknown `content_type` is treated the same way.** NULL means "we don't
  know what this is", and the safe reading of that is a human, not a guess.
- **The seam for video already exists.** Frame sampling becomes a different
  `ClassifierProvider` — or a pre-step that hands the existing provider a
  frame — without touching the queue, the bands, or the visibility tier.
- **Adds an open question** to the backlog: video frame-sampling strategy.
