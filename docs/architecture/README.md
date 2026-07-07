# Architecture Docs

These documents translate `docs/product/*.md` into engineering terms. Read
them in this order:

1. **`visibility-model.md`** — the gender-conditioned visibility graph, the
   two independent axes (exposure × classification), and the
   enforce-at-every-layer rule. Read this first; it's referenced by
   everything else.
2. **`data-model.md`** — conceptual entity map used by `shared-types` and
   `visibility-policy`.
3. **`moderation-pipeline.md`** — the async AI classification flow, human
   review queue, reporting, and enforcement ladder.

If you're about to design a database table, an API route, or a screen that
touches user content, start here — not in `docs/product/`. The product docs
tell you *what* the product does; these tell you *how* to build it without
breaking the invariants in the root `CLAUDE.md`.
