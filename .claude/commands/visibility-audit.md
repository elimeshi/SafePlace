---
description: Audit a piece of code (a query, an API handler, or a screen) against the visibility invariants
---

Run this audit whenever code touches anything that could be classified or
gender-conditioned: posts, comments, profile photos, poll images, stories,
messages, search results, or any list of users/content.

Read `docs/architecture/visibility-model.md` in full before starting if you
haven't already in this session — don't rely on memory of it.

For the code in question (ask the user to point you at it, or use the most
recently discussed file/diff), check and report on each of the following,
explicitly, one by one:

1. **Database layer**: Is there a Row-Level Security policy (or equivalent
   query-level filter) that would still block this content from an
   unauthorized viewer even if the application code above it had a bug?
   If you can't find one, that's a finding, not a pass.

2. **Server/API layer**: Does the response ever include a raw media
   reference/URL for content the requesting user's `FilterSettings`
   should hide? Filtered content must come back as a placeholder state,
   not as the real reference with a "don't render this" flag — a flag can
   be ignored by a future client; an absent reference cannot leak.

3. **UI layer**: Does the rendering logic call into
   `packages/visibility-policy` for its decision, or does it implement an
   inline `if (gender === ...)` check? Inline checks are a finding —
   they drift from the policy package over time.

4. **Two-axis correctness**: Does the code correctly treat exposure
   (public/followers/group/family) and classification (gender content
   tagging) as independent checks that both must pass, rather than
   conflating them?

5. **Family Space exception**: If this code path can run inside a Family
   Space context, does it correctly *not* apply standard classification
   filtering there, while still respecting exposure rules (Family Space
   content never leaks outside the space)?

6. **Framing in code**: Do variable names, comments, or log messages frame
   this as "male restriction"/"female restriction," or as neutral
   filter-setting language? Per `CLAUDE.md` §5, this is not just style —
   flag any naming that contradicts the master spec's required framing.

Summarize findings as a short checklist (✅ / ❌ per item above), and for any
❌, propose the specific fix before making it — don't silently patch
visibility-critical code without flagging what was wrong.
