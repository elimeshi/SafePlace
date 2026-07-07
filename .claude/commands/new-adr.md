---
description: Record a non-trivial, hard-to-reverse technical decision as an ADR
---

Use this when you and the user have just settled a technical decision that
would be costly to silently reverse later — a library choice, a schema
shape, an enforcement strategy, anything that future-you would want
explained rather than rediscovered from the diff.

1. Find the next sequential number in `docs/decisions/` (4-digit, zero-padded).
2. Copy `docs/decisions/0000-template.md` to `docs/decisions/NNNN-short-title.md`.
3. Fill in Context, Decision, Alternatives considered, and Consequences.
   Write Context and Alternatives honestly — a future reader (including a
   future AI session) needs to know what was rejected and why, not just
   what was chosen.
4. If the decision resolves an item in
   `docs/decisions/open-questions-backlog.md`, remove that item and note
   the ADR number in your response.
5. If the decision touches anything in `docs/legal/legal-tracker.md`, do
   **not** mark that tracker item 🟢 — an ADR records an engineering
   decision, not a legal sign-off. Leave it 🔴/🟡 and say so explicitly.
