# OnFIRE — project handoff / context

Read this first when continuing work in a new session. It's the single source
of truth for where the project stands and what's next.

> **Repo location (absolute):** `/Users/alberto/Documents/Claude Projects/uk-fire-app`
> This is the git root. **`cd` into it first** — the parent directory
> `/Users/alberto/Documents/Claude Projects` is *not* a git repo, so a new
> session must enter the `uk-fire-app` subfolder before running git/npm.

## What it is

**OnFIRE** — a UK FIRE (Financial Independence, Retire Early) planner. A
recruiter-facing portfolio piece for the user (**GitHub: fekwes**). It models
drawdown across ISA, GIA, SIPP, State Pension and property, with correct UK
tax, plus Coast FIRE and Monte Carlo confidence modelling.

- **Repo:** https://github.com/fekwes/onfire (private)
- **Local dir (absolute):** `/Users/alberto/Documents/Claude Projects/uk-fire-app`
  (folder still named `uk-fire-app`; the GitHub repo was renamed to `onfire`).
- **Live dev:** `npm run dev` → http://localhost:3000

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Recharts · Vitest · `next-themes` · Supabase (`@supabase/ssr`) · Anthropic SDK
(AI tips route, model `claude-opus-4-8`).

## Design language ("Ink & Lime")

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
- **Login (Supabase)** — code complete and wired; gated on env config. Publishable key is set in `.env.local` (gitignored); the Sign-in UI is live.
- **Stage 6** — onboarding quiz + landing page. `/` is now a landing page (hero + "Build my plan" CTA), the planner moved to `/planner`, and `/start` is a 7-step quiz that collects the ~6 key inputs, reveals the live `simulateFire` result, and ends with an optional Supabase sign-up ("maybe later" skips). Quiz→planner state is handed over via `localStorage["onfire:plan"]`. Silent defaults (statutory ages, growth, pension strategy, life expectancy) live in `lib/quiz.ts`.
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
  - **Account deletion** currently removes the user's saved-plan rows + local plan and signs out; full auth-record deletion needs a service-role server route (`SUPABASE_SERVICE_ROLE_KEY`) — not yet built.

**74 Vitest tests pass. `tsc`/`eslint` clean. Production build green.**

## Key files

- `lib/fire-engine.ts` — the deterministic, tax-aware drawdown engine (the core; read `docs/ARCHITECTURE.md`).
- `lib/coast-fire.ts` — Coast FIRE. `lib/monte-carlo.ts` — MC engine.
- `components/FireDashboard.tsx` — the planner (summary + form + charts + tabs).
- `components/FireForm.tsx` — inputs (essentials + "More options" progressive disclosure).
- `components/{AssetTimelineChart,IncomeSafetyChart,ConfidencePanel}.tsx` — charts.
- `components/{AuthProvider,AuthButton,SavedPlans}.tsx` + `lib/supabase/*` + `middleware.ts` — auth.
- `app/methodology/page.tsx` — the docs page (keep it in sync with the engine).
- `app/page.tsx` (landing), `app/planner/page.tsx` (dashboard), `app/start/page.tsx` (quiz).
- `components/QuizFlow.tsx` + `components/quiz/QuizPrimitives.tsx` — the onboarding quiz.
- `lib/quiz.ts` (`assembleQuizInputs` + silent defaults), `lib/plan-storage.ts` (localStorage handoff).
- `docs/ARCHITECTURE.md` (engine deep-dive), `docs/ONBOARDING.md` (Stage 6 spec, now built).

## Conventions (please keep)

- **One stage = one commit**, message ends with the Co-Authored-By line. Push after each.
- **Verify UK tax figures against real 2026/27 guidance** (WebSearch) — never invent numbers. Income-tax & CGT thresholds are frozen; State Pension is £12,547.60/yr (2026/27).
- **Pension default is "gradual" (UFPLS)** — 25% of each withdrawal tax-free. Lump-sum cash goes to GIA, never ISA.
- Run `npm test` + `npx tsc --noEmit` + `npx eslint .` and **verify in the browser** (both themes) before committing.
- Keep the Methodology page and `docs/ARCHITECTURE.md` accurate when the engine changes.

## Pending — user-only Supabase steps (I can't do these)

1. Run `supabase/migrations/20260101000000_portfolios.sql` in the Supabase SQL editor (or `supabase db push`) — creating tables needs dashboard/secret access the publishable key doesn't have.
2. Create an account via the Sign-in popover (I don't create accounts or enter passwords).
Then saving plans works end-to-end.

## Stage 6 — DONE

Onboarding quiz + landing page shipped per **`docs/ONBOARDING.md`**: landing at
`/`, planner at `/planner`, quiz at `/start`, quiz→planner handoff via
`localStorage["onfire:plan"]`, optional Supabase sign-up at the end. Silent
defaults centralised in `lib/quiz.ts`. Browser-verified in both themes.

## NEXT TASK — pick from the backlog below

No specific next stage is queued. The polish backlog (below) is the natural
next thing; a deploy to Vercel would make the portfolio piece shareable.

## Also nice-to-have polish (backlog)

- `docs/ARCHITECTURE.md` still has a few pre-property/pre-2026 phrasings ("21 tests", "two balances", "flat 5% applied identically to ISA and SIPP", "past age 58") — refresh it.
- Consider showing property value / total net worth somewhere visual (currently only flows via GIA jumps + sustainability).
- Deploy to Vercel (add `NEXT_PUBLIC_SUPABASE_*` + `ANTHROPIC_API_KEY` env vars; add the deployed URL to Supabase Auth redirect URLs).
