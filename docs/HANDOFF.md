# OnFIRE — handoff archive (pre-rebrand)

> ## 👉 Status: Archive. Read [`HANDOFF-FIREWORKS.md`](./HANDOFF-FIREWORKS.md) instead.
>
> That file is the current source of truth: repo map, deploy/env, the
> identifiers that must never be renamed, known gaps and the backlog. This file
> is kept for the reasoning, not the facts — **do not update it**, and do not
> act on anything in it without checking the current handoff first.
>
> The sections that told you what to *do* — env-var values, pending Supabase
> steps, the going-live checklist, the next task and the backlog — have been
> removed rather than left to mislead: every one of them was either done, wrong,
> or contradicted by the current handoff. What remains is the record of what was
> built and why, which is the part worth keeping. Full text is in git history.

> **Rebranded.** The product is now **Fireworks** (domain **myfire.works**),
> wordmark `Fire·works`, design system **"Night & Ember"**. See
> `docs/DESIGN.md`. Much of the OnFIRE-era detail below still applies to the
> engine and infrastructure — the name and visual language are what changed.
>
> **Internal identifiers were deliberately left alone** so existing data keeps
> working: the `onfire:plan` localStorage key, `onfire:flag:*` flags, the
> `onfire:flags` event, the Supabase `portfolios` table and the GitHub repo
> name. Do not "finish" the rename by changing those.
>
> **What shipped in the rebrand/overhaul (branch
> `claude/onfire-stage-6-onboarding-tghour-95enze`):**
> 1. Identity — tokens, Trajectory Burst logo/favicon/OG, naming + voice,
>    `docs/DESIGN.md`.
> 2. Landing rebuilt — ember CTA, launch-trail reveal, house-style preview
>    chart, icon markers.
> 3. Quiz — the redundant Lean/Fat personas are gone (they only re-asked the
>    spending target); it now asks target → ages → strategy
>    (`standard | coast | barista`) via `StrategyId` in `lib/quiz.ts`.
> 4. Profiles — `lib/profiles.ts` + a rebuilt `SavedPlans` with real Load /
>    rename / copy / delete and **errors that are actually surfaced** (writes
>    used to fail silently and look successful).
> 5. Charts — one validated data-viz system (see `docs/DESIGN.md`), plus fixes
>    for status colour used by position rather than meaning.
> 6. Finances restructured — `Collapsible` progressive disclosure (Property,
>    Statutory assumptions) + a `FinancesNav` section rail. Account rebuilt on
>    the design system with real error/success states. Methodology got a
>    contents list.
> 7. Fixes from a full verification sweep — **mobile header overflow** (every
>    page scrolled sideways for returning users), unlabelled icon buttons,
>    Share not announced, and print showing dead interactive chrome.

## Original OnFIRE handoff (pre-rebrand)

What follows is the handoff exactly as it stood before the rebrand, minus the
sections that gave instructions. It is history.

## What it is

**OnFIRE** — a UK FIRE (Financial Independence, Retire Early) planner. A
recruiter-facing portfolio piece for the user (**GitHub: fekwes**). It models
drawdown across ISA, GIA, SIPP, State Pension and property, with correct UK
tax, plus Coast FIRE and Monte Carlo confidence modelling.

- **Repo:** https://github.com/fekwes/onfire (private)
- **Live dev:** `npm run dev` → http://localhost:3000

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Recharts · Vitest · `next-themes` · Supabase (`@supabase/ssr`)
(AI tips route uses **Google Gemini** via `@google/genai` and `GEMINI_API_KEY` —
not the Anthropic SDK, despite older notes below).

## Design language ("Ink & Lime") — superseded by "Night & Ember", see `docs/DESIGN.md`

Warm-ink surfaces + electric-lime signature accent (deliberately NOT the
generic emerald/purple-gradient "AI look"). Bricolage Grotesque display
headings, Geist body, Geist Mono micro-labels. Logo = a "money burning"
banknote+flame. Dark is the default theme. App is **app-first** (north-star
summary + progressive disclosure), verified in-browser in both themes.

## Current state — what's built (all committed & pushed)

- **Stage 1** — bold visual identity + custom favicon/logo, rebranded FIRE UK → **OnFIRE**.
- **Stage 2** — configurable statutory ages + GIA with simplified CGT.
- **Stage 3** — Coast FIRE (now a one-line insight, the mode toggle was removed).
- **Stage 4** — in-app Methodology tab (`/methodology`) + header nav.
- **Stage 5** — Monte Carlo confidence tab (flat / ±5% / ±10% guardrails, allocation slider, fan chart).
- **Maths correctness pass** — fixed 4 real bugs (SIPP drawn before access age; lump-sum→ISA; State-Pension-as-surplus; per-wrapper growth) and moved to **2026/27** UK figures. Hand-verified.
- **Property** — rental (taxable income offsets target + optional sale w/ residential CGT → GIA) and home (net worth, optional downsize → tax-free cash to GIA). No mortgages.
- **Login (Supabase)** — code complete and wired; gated on env config.
- **Stage 6** — onboarding quiz + landing page. `/` is now a landing page (hero + "Build my plan" CTA), the planner moved to `/planner`, and `/start` is a multi-step quiz that collects the key inputs, reveals the live `simulateFire` result, and ends with an optional Supabase sign-up ("maybe later" skips). Quiz→planner state is handed over via `localStorage["onfire:plan"]`. Silent defaults (statutory ages, growth, pension strategy, life expectancy) live in `lib/quiz.ts`.
- **v1 finishing pass** (post-Stage-6):
  - **FIRE number** — `lib/fire-number.ts` bisects the pot needed at retirement vs. what you're on course for; surfaced prominently in the planner + reused in the AI prompt.
  - **Net worth incl. property** — a net-worth stat + a dashed net-worth line on the asset chart, so a home/rental is finally visible.
  - **Inflation / real terms** — the engine grows the spending target by `inflationRate` (form/quiz default 2.5%, engine default 0); the planner has a **Today's £ / Future £** toggle that deflates the projection. Sub-simulations (`fire-number`, `coast-fire`) pre-inflate the target via `inflatedTargetAt` so verdicts stay consistent. Tax bands + State Pension held at 2026/27 nominal (fiscal drag).
  - **Polish** — full SEO/OpenGraph metadata + dynamic `opengraph-image` + sitemap/robots, branded 404 + error pages, removed dead starter SVGs, `NEXT_PUBLIC_SITE_URL` env var.
- **Tabbed restructure** (the app is now onboarding + a tabbed core app):
  - **Onboarding:** `/` (landing) and `/start` (quiz). The landing shows a "Continue to your planner" CTA (and the logo routes to `/planner`) once a plan exists.
  - **Core tabs:** **Planner** (`/planner` — analysis + a compact `QuickLevers` row, Share/Export actions), **Your Finances** (`/finances` — the full `FireForm` + saved plans), **Methodology**, and an **Account** page (`/account` — password change + delete-my-data, reached from the auth dropdown).
  - **Shared state:** `components/PlanProvider.tsx` holds the one active plan (localStorage-backed) so Planner and Your Finances edit the same data. `usePlan()` is the hook.
  - **Share/Export:** `lib/share.ts` (URL-encoded read-only links → `/planner?p=`, with a "Make it mine" adopt flow) and `lib/export.ts` (CSV timeline + JSON + print, via `components/PlanActions.tsx`). No backend.
  - **Account deletion** removed saved-plan rows and signed out, without deleting
    the auth record. *(Superseded: full deletion via a service-role route shipped
    later — `app/api/account/delete/route.ts`.)*

## Key files

- `lib/fire-engine.ts` — the deterministic, tax-aware drawdown engine (the core; read `docs/ARCHITECTURE.md`).
- `lib/coast-fire.ts` — Coast FIRE. `lib/monte-carlo.ts` — MC engine.
- `components/FireDashboard.tsx` — the planner (summary + form + charts + tabs).
- `components/FireForm.tsx` — inputs (essentials + "More options" progressive disclosure).
- `components/{AssetTimelineChart,IncomeSafetyChart,ConfidencePanel}.tsx` — charts.
- `components/{AuthProvider,AuthButton,SavedPlans}.tsx` + `lib/supabase/*` + `proxy.ts` — auth.
- `app/methodology/page.tsx` — the docs page (keep it in sync with the engine).
- `app/page.tsx` (landing), `app/planner/page.tsx` (dashboard), `app/start/page.tsx` (quiz).
- `components/QuizFlow.tsx` + `components/quiz/QuizPrimitives.tsx` — the onboarding quiz.
- `lib/quiz.ts` (`assembleQuizInputs` + silent defaults), `lib/plan-storage.ts` (localStorage handoff).
- `docs/ARCHITECTURE.md` (engine deep-dive), `docs/ONBOARDING.md` (the Stage 6 brief).

## Conventions (please keep)

- **One stage = one commit**, message ends with the Co-Authored-By line. Push after each.
- **Verify UK tax figures against real 2026/27 guidance** (WebSearch) — never invent numbers. Income-tax & CGT thresholds are frozen; State Pension is £12,547.60/yr (2026/27).
- **Pension default is "gradual" (UFPLS)** — 25% of each withdrawal tax-free. Lump-sum cash goes to GIA, never ISA.
- Run `npm test` + `npx tsc --noEmit` + `npx eslint .` and **verify in the browser** (both themes) before committing.
- Keep the Methodology page and `docs/ARCHITECTURE.md` accurate when the engine changes.

## Stage 6 — DONE

Onboarding quiz + landing page shipped per **`docs/ONBOARDING.md`**: landing at
`/`, planner at `/planner`, quiz at `/start`, quiz→planner handoff via
`localStorage["onfire:plan"]`, optional Supabase sign-up at the end. Silent
defaults centralised in `lib/quiz.ts`. Browser-verified in both themes.
