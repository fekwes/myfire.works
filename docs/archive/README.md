# Archive

Superseded documents. **Nothing here is current, and nothing here should be
updated.** They are kept because the *reasoning* in them is still worth reading —
why the onboarding flow is shaped the way it is, what the app looked like before
the rebrand — even though the facts have moved on.

If something here is wrong, that is expected. Fix the live document instead; the
index is [`../README.md`](../README.md).

## What's here

| Document | Written | What it was | Superseded by |
|---|---|---|---|
| [`HANDOFF.md`](./HANDOFF.md) | 2026-07-23 | The OnFIRE handoff — the project's state before the Fireworks rebrand. Stages 1–6, the maths-correctness pass, the tabbed restructure. | [`../HANDOFF-FIREWORKS.md`](../HANDOFF-FIREWORKS.md), 2026-07-25 |
| [`ONBOARDING.md`](./ONBOARDING.md) | 2026-07-23 | The Stage 6 implementation brief for the quiz and landing page. | The app itself. Built as specced, then reshaped by PR #8 and PR #9. |
| [`ONBOARDING-PLAN.md`](./ONBOARDING-PLAN.md) | 2026-07-25 | A cold walkthrough of the live app by someone who had never seen it and didn't know what a SIPP is. Drove the onboarding rework. | Its findings shipped in PR #8 and PR #9. |

## Known-false statements in here

Listed so nobody has to discover them by acting on one:

- **`HANDOFF.md`** describes the **"Ink & Lime"** design language. That was
  replaced by **"Night & Ember"** in PR #3 — see [`../DESIGN.md`](../DESIGN.md).
  It also describes account deletion as data-only; full deletion via a
  service-role route shipped later.
- **`ONBOARDING.md`** and **`ONBOARDING-PLAN.md`** describe a **three-question
  quiz with five personas** (Standard / Lean / Fat / Coast / Barista). The quiz
  now asks **four** questions before the reveal, and the personas were cut to
  `standard | coast | barista` (`StrategyId` in `lib/quiz.ts`) because Lean and
  Fat only re-asked the spending target.

## Why not just delete them

Git would keep the content either way. They stay visible because a reader
wondering "why is the quiz shaped like this?" is better served by the document
that argued it than by a commit message — and because two of the three record
decisions that are still load-bearing, like leaving the `onfire:*` identifiers
alone through the rebrand.

The moment one stops earning that, delete it.
