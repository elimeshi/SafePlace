---
description: Implement a new screen from its product spec, end to end
---

You are implementing a screen for Safe-Place. Follow this sequence exactly;
do not skip steps even if they feel obvious.

## 1. Locate and read the spec

Ask the user which screen, if not already clear from the conversation. Find
its spec in `docs/product/` (use `docs/product/README.md` for the index if
unsure which file). **Read the entire file**, not just the section that
seems most relevant — earlier sections often define shared mechanisms
(visibility rules, animation principles, terminology) that later sections
assume without restating.

## 2. Cross-check architecture docs

Before writing code, check whether this screen touches:

- Any user-generated content with media → re-read
  `docs/architecture/visibility-model.md` and confirm which axis
  (exposure, classification, or both) applies.
- Any upload surface → re-read `docs/architecture/moderation-pipeline.md`
  and confirm the upload is wired to the classification queue, not a
  shortcut.
- Any data model concept not yet in `docs/architecture/data-model.md` → add
  it there as you go, don't let the model drift undocumented.

## 3. Check the backlog before assuming a gap

If the spec leaves something unspecified, check
`docs/decisions/open-questions-backlog.md` first — it's very likely already
flagged. If it's there, implement the "starting point" / "MVP default" the
backlog lists, and leave a `// TODO(open-question): see docs/decisions/...`
comment rather than silently inventing different behavior. If it's *not* in
the backlog and genuinely blocks implementation, stop and ask — per Eli's
standing instruction, never guess on an ambiguous point.

## 4. Implement

- RTL-correct from the first line of layout code — not patched in after.
- Pull colors, type, and motion timing from `packages/design-tokens`, never
  inline magic values.
- Route every visibility check through `packages/visibility-policy`.
- Match the component structure to how the spec itself organizes the
  screen (its own section headers are usually a good component boundary
  guide).

## 5. Self-check against the Definition of Done

Before presenting the work as complete, walk through `CLAUDE.md` §7
explicitly and confirm each point, out loud, in your response — don't just
silently claim "done."
