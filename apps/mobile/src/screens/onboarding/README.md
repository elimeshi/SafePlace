# Onboarding screens

This is where the 3-step onboarding wizard from
`docs/product/00-master-spec.md` §6.2 belongs — the designated first real
screen to build, per `docs/decisions/0003-first-push-scope.md`.

**Before writing any code here:**

1. Complete the Claude Design visual lock-in session (see
   `docs/design/README.md`) — or, if that hasn't happened yet, at minimum
   read `docs/product/00-master-spec.md` §5–§6.3 in full for the visual and
   motion direction, and treat `packages/design-tokens` as placeholder
   values to be revisited.
2. Use `.claude/commands/new-screen.md` as the implementation workflow.
3. Read `docs/product/00-master-spec.md` §6 end to end — all three steps
   share context (the wizard's overall rationale, the exit-quickly
   principle) that isn't repeated in each step's subsection.

## The three steps, at a glance

1. **Step 1 — Welcome** (§6.2.1): not a form. A single emotional "front
   door" screen — logo, one sentence, two buttons (create account / log
   in). Deliberately minimal.
2. **Step 2 — Account details + gender selection** (§6.2.2): name,
   email/phone, password, gender (neutral presentation, no loaded
   explanation at this step), terms-of-service checkbox.
3. **Step 3 — Your defaults** (§6.2.3): a **read-only** display of the
   filter defaults assigned based on the chosen gender. Not editable here
   by design — see `docs/architecture/visibility-model.md` §5 for why this
   is intentional simplicity, not a gap to fill in.

Step 3 is the first point where this screen should call
`resolveDefaultFilterSettings` from `@safeplace/visibility-policy` — don't
hardcode the displayed defaults separately from that function.
