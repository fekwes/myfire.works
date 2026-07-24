# Handoff — Rebrand to "Fireworks" + UX/UI overhaul

> Working handoff for continuing OnFIRE in a fresh session. Read this first, then
> the files it points to. Everything here is committed to the repo so a new
> session (fresh clone) has the full context.

---

## 1. Snapshot — what exists today

**OnFIRE** is a UK FIRE (Financial Independence, Retire Early) planner — a
recruiter-facing portfolio piece (GitHub `fekwes/onfire`). It models tax-aware
drawdown across ISA, GIA, SIPP, State Pension and property with correct UK
2026/27 tax, plus Coast FIRE, Barista FIRE, Monte Carlo confidence, and a
persona-first onboarding.

- **Live (prod):** https://onfire-nu.vercel.app (Vercel, auto-deploys from `main`).
- **Status:** functional beta. PR #1 and #2 are merged; `main` is the source of truth.
- **Quality gate:** `npm test` (117 tests), `npx tsc --noEmit`, `npx eslint .`,
  `npm run build` all green. CI runs them on every PR (`.github/workflows/ci.yml`).

### Tech stack
Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4,
Vitest, Recharts, next-themes. Auth + saved plans via Supabase (`@supabase/ssr`).
AI tips via Google Gemini (`@google/genai`, `gemini-flash-latest`).

### Repo map (the files that matter)
- `lib/fire-engine.ts` — deterministic tax-aware drawdown engine (`simulateFire`),
  UK tax/CGT, bisection solvers, inflation, part-time (Barista) income. **Well-tested; treat as stable.**
- `lib/monte-carlo.ts` — stochastic confidence model + guardrail strategies.
- `lib/coast-fire.ts`, `lib/fire-number.ts`, `lib/what-if.ts` — derived analyses.
- `lib/vanguard-funds.ts` — curated UK funds, fees, fund→growth, portfolio allocation.
- `lib/quiz.ts` — personas (Standard/Lean/Fat/Coast/Barista), PLSA lifestyles, `assembleQuizInputs`.
- `lib/checklist.ts` — "Complete your plan" progressive checklist logic.
- `components/QuizFlow.tsx` — 3-step onboarding (persona → lifestyle → ages).
- `components/FireDashboard.tsx` — the planner (north-star card, levers, charts, checklist).
- `components/FireForm.tsx` — Your Finances, grouped anchored sections (#balances/#funds/#property/#scenario).
- `components/PlanChecklist.tsx`, `QuickLevers.tsx`, `WhatIfCard.tsx`, `ConfidencePanel.tsx`, `AiInsights.tsx`.
- **Design system:** `app/globals.css` (tokens: colours, fonts, data palette),
  `components/ui/` (Button, Card, Menu), `docs/DESIGN.md`.
- `docs/ARCHITECTURE.md` — engine assumptions & UK tax modelling (keep updated).
- `app/methodology/page.tsx` — public methodology page.

### Deploy & env (no secrets in repo — gitignored `.env.local` + Vercel env vars)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public, browser-safe under RLS).
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; account-delete route).
- `GEMINI_API_KEY` (server-only; AI tips degrade gracefully if unset).
- `NEXT_PUBLIC_SITE_URL` (OG/sitemap/share links).
- Supabase schema: `supabase/migrations/*_portfolios.sql` (portfolios table + RLS).

---

## 2. Known issues / backlog (fix alongside or before the rebrand)

### 2a. Saved financial profiles — save works, load/multiple feel broken
User report: "you can save but not load; you can't have multiple." Code review
(`components/SavedPlans.tsx`, `components/PlanProvider.tsx`, `QuizFlow.tsx`):
- The **capability exists**: `SavedPlans` lists all `portfolios` rows and clicking a
  chip calls `onLoad(plan.inputs) → setInputs`, and you can save multiple **named** plans.
- **Why it feels broken:**
  1. `SavedPlans` only renders on the **Your Finances** tab, when signed in — easy to miss.
  2. The **quiz sign-up and auto-save always use the fixed name `"My plan"`** with
     `upsert onConflict: "user_id,name"`, so every save overwrites the same row →
     effectively one profile, and no obvious "load" affordance.
  3. `PlanProvider` auto-loads only the single most-recent plan on login.
- **Recommended fix:** a first-class "Profiles" UI — name-on-save, a visible list with
  Load/Rename/Duplicate/Delete, an active-profile indicator, and a "Save as new" vs
  "Update current" distinction. Verify load actually applies end-to-end against Supabase.
- **Persistence policy (user):** pre-existing/older user saves do **not** need to keep
  working (app isn't in real use yet — only test data). **But saves made from now on
  must remain loadable for future users** — so land the persistence model cleanly now.

### 2b. Non-linear flows / rough edges
User: "some parts are not linear and they look bad." Audit the full journey
(landing → quiz → planner → finances → confidence → account) for dead-ends,
inconsistent spacing/typography, and abrupt transitions. Feeds Task B.

---

## 3. TASK A — Rebrand to "Fireworks" (domain: myfire.works)

**Intent:** rename the product to **Fireworks** and build a high-quality, professional
visual identity with genuine attention to detail. Lean into the **double meaning** —
*FIRE* (financial independence) × *fireworks* (celebration, the moment your plan
"goes off", sparks, trajectory, the finale). Avoid anything that reads as generic or
AI-generated.

### Deliverables
1. **Naming & voice** — "Fireworks", tagline options, domain `myfire.works` wiring
   (`NEXT_PUBLIC_SITE_URL`, metadata, OG). Confirm the FIRE acronym stays legible to
   a UK finance audience while the fireworks metaphor carries the warmth.
2. **Logo system** — a distinctive wordmark + mark. Explore: a spark/ember,
   an ascending-trajectory firework, a launch arc doubling as a growth curve.
   Deliver SVG (light/dark), favicon/`app/icon.svg`, `app/opengraph-image`.
3. **Design system refresh** — revisit tokens in `app/globals.css`: a palette that
   evokes fireworks against a night sky (deep ink base + a small set of vivid spark
   accents) while staying legible, accessible (WCAG AA), and professional — not
   gaudy. Choose type pairing (display + text + mono) with intent. Update
   `components/ui/` primitives and `docs/DESIGN.md`.
4. **Motion** — tasteful, reduced-motion-safe "spark/launch" micro-interactions for
   key moments (reveal, on-track state, milestones) — restrained, premium.
5. **References** — collect 3–5 visual references before designing; state the
   rationale. The bar is "looks like a funded product", not a template.

### Constraints
- Keep it accessible and theme-aware (light/dark), matching the existing a11y bar.
- No stock/AI-slop aesthetics; deliberate hierarchy and spacing.
- Ship incrementally: tokens → primitives → per-screen, keeping tests/build green.

---

## 4. TASK B — Full UX/UI overhaul (after branding direction is set)

**Intent:** rethink the whole app's UX/UI. Fix non-linear flows; review fonts,
colours, proportions; raise polish everywhere.

### Method
1. **Audit** every screen and the end-to-end journey; list concrete issues
   (screenshots/notes). Cover: landing, `/start` quiz, `/planner`, `/finances`,
   Confidence, `/account`, `/methodology`, empty/error states, mobile.
2. **Redesign** information hierarchy, spacing scale, type scale, and the data-viz
   language (charts, stat tiles, meters) as one coherent system — use the `dataviz`
   skill for chart/colour decisions.
3. **Rebuild** screen-by-screen behind the new design system, keeping the engine and
   business logic untouched. Verify each with `npm test` + build + a browser pass
   (light & dark), then commit.
4. Fold in the **Profiles** fix (2a) and the non-linear-flow fixes (2b).

### Definition of done
Cohesive, professional, detail-oriented UI; linear, obvious flows; AA-accessible;
green quality gate; live on `myfire.works`.

---

## 5. Working conventions (for the next session)
- **Branch:** develop on `claude/onfire-stage-6-onboarding-tghour` (restart from latest
  `main` since PR #2 is merged), or a new feature branch. Never push to `main` directly.
- **Never commit secrets.** They live in gitignored `.env.local` + Vercel env vars.
- Keep the quality gate green on every commit. Update `docs/ARCHITECTURE.md` /
  `docs/DESIGN.md` / methodology when behaviour or design changes.
- Don't open a PR unless asked. Use the GitHub MCP tools for GitHub actions.
- Read `node_modules/next/dist/docs/` before Next.js API work (this is a breaking
  Next version — see `AGENTS.md`).

---

## 6. Kickoff prompt for the next session

Paste this into a new chat to continue:

```
You're continuing the "Fireworks" project (formerly OnFIRE) in repo fekwes/onfire.

FIRST: read docs/HANDOFF-FIREWORKS.md end to end — it has the full context, repo
map, deploy/env notes, known issues, and the two plans. Then skim docs/DESIGN.md,
docs/ARCHITECTURE.md, and app/globals.css.

Work on branch claude/onfire-stage-6-onboarding-tghour (restart it from latest main
if needed; never push to main directly). Keep the quality gate green on every
commit: npm test, npx tsc --noEmit, npx eslint ., npm run build. Never commit
secrets. Don't open a PR unless I ask.

We're doing TWO things, in order:

1) REBRAND to "Fireworks" (domain myfire.works). Lean into the double meaning:
   FIRE (financial independence) × fireworks (the celebratory moment, sparks,
   launch/trajectory). I want a genuinely high-quality, professional identity with
   attention to detail — not generic or AI-looking. Deliver: naming/voice, a
   distinctive logo + wordmark (SVG light/dark, favicon, OG image), a refreshed
   design system (palette + type pairing + tokens in app/globals.css + components/ui
   + docs/DESIGN.md), and restrained, reduced-motion-safe micro-interactions.
   Collect 3–5 visual references and explain your rationale BEFORE building. Propose
   the direction and check with me before rolling it across the app.

2) After the brand direction is agreed, a FULL UX/UI overhaul: audit every screen
   and the whole journey (landing → quiz → planner → finances → confidence →
   account), fix the non-linear/rough parts, rework fonts/colours/proportions and
   the data-viz as one coherent system (use the dataviz skill for charts), and
   rebuild screen-by-screen behind the new brand — engine/business logic untouched.
   Also fix saved "Profiles" (see handoff §2a): make Load/multiple/name-on-save
   first-class; saves made from now must stay loadable.

Start with Task 1: give me the naming/voice options + logo & design-system
direction with references, and ask me anything you need before implementing.
```
