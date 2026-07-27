# Documentation

Start with **[`HANDOFF-FIREWORKS.md`](./HANDOFF-FIREWORKS.md)**. It is the single
source of truth for where the project stands; where any other document disagrees
with it, it wins.

Every document here opens with a **Status** line, which tells you how much to
trust it:

| Status | Means |
|---|---|
| **Current** | Describes the app as it is today. Update it in the same commit that changes the behaviour it describes. |
| **Design** | A proposal. Some or none of it is built — each one says which. Do not read it as a description of the app. |
| **Archive** | Historical record, superseded. Kept for the reasoning, not the facts. Never update it; correct the current document instead. |

## The documents

| Document | Status | What it is |
|---|---|---|
| [`HANDOFF-FIREWORKS.md`](./HANDOFF-FIREWORKS.md) | Current | Repo map, deploy/env, identifiers that must never be renamed, conventions, known gaps, backlog. **Read first.** |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Current | Deep-dive on `lib/fire-engine.ts`: the simulation loop, UK income tax, the gross-up solver, and every modelling assumption. |
| [`DESIGN.md`](./DESIGN.md) | Current | The "Night & Ember" design system — colour, type, the chart ramp and the primitives that implement it. |
| [`REVIEW-2026-07.md`](./REVIEW-2026-07.md) | Current | Stability/performance/scalability review after PR #9. Its `R1`–`R5` recommendations are referenced from the handoff's backlog. |
| [`MULTI-COUNTRY.md`](./MULTI-COUNTRY.md) | Design | How the planner would support more than one country. Nothing built. US figures in it are explicitly unsourced. |

Everything in this directory is live. Superseded documents live one level down
in **[`archive/`](./archive/)**, so that the list above is never padded with
things you should not act on:

| Archived | What it was |
|---|---|
| [`archive/HANDOFF.md`](./archive/HANDOFF.md) | The pre-rebrand OnFIRE handoff. Superseded by `HANDOFF-FIREWORKS.md`. |
| [`archive/ONBOARDING.md`](./archive/ONBOARDING.md) | The Stage 6 brief for the quiz and landing page. Built, then changed twice — the app is the truth now. |
| [`archive/ONBOARDING-PLAN.md`](./archive/ONBOARDING-PLAN.md) | A cold walkthrough of the live app that drove the PR #8/#9 onboarding work. |

## Specs

Behaviour is specced with **[OpenSpec](https://github.com/Fission-AI/OpenSpec)**
under [`../openspec/`](../openspec/), and this is the default workflow for
changes — propose, apply, archive. [`../AGENTS.md`](../AGENTS.md) has the loop.

Specs and docs are not the same thing and do not compete:

- **A spec says what the app must do.** Current-state only, no history,
  testable. `openspec/specs/fire-engine/spec.md` is the baseline.
- **A doc explains how and why** — the design reasoning, the accepted
  simplifications, the deploy story. `ARCHITECTURE.md` is the engine's *why*;
  the spec is its *what*.

Only `fire-engine` is specced so far. Add capabilities as changes touch them,
not in one speculative sweep — a wrong spec is worse than a missing one.

## Elsewhere in the repo

- **[`../README.md`](../README.md)** — the public-facing introduction: what the
  app does, the engine, how to run it.
- **[`../AGENTS.md`](../AGENTS.md)** — instructions for AI agents working in this
  repo. `CLAUDE.md` just includes it, so there is one copy, not two.
- **[`../app/methodology/page.tsx`](../app/methodology/page.tsx)** — the
  user-facing methodology page. It and `ARCHITECTURE.md` describe the same
  engine to two different audiences; a change to the engine's behaviour has to
  land in both.

## Keeping this honest

The failure mode here is not a missing document, it's a confident and wrong one.
Two rules keep that in check:

1. **A doc that states a number is a doc that goes stale.** Test counts, bundle
   sizes and "N tests pass" lines are the first things to rot — this set had
   three different test counts in it at once. Prefer describing the shape of
   things; where a number really is the point, expect to update it.
2. **Archive, don't leave.** When a document stops being true, mark it Archive
   and move what survives into the current one. A superseded doc that still
   reads as current is worse than no doc, because it is followed.
