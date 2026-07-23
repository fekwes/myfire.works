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

**48 Vitest tests pass. `tsc`/`eslint` clean.**

## Key files

- `lib/fire-engine.ts` — the deterministic, tax-aware drawdown engine (the core; read `docs/ARCHITECTURE.md`).
- `lib/coast-fire.ts` — Coast FIRE. `lib/monte-carlo.ts` — MC engine.
- `components/FireDashboard.tsx` — the planner (summary + form + charts + tabs).
- `components/FireForm.tsx` — inputs (essentials + "More options" progressive disclosure).
- `components/{AssetTimelineChart,IncomeSafetyChart,ConfidencePanel}.tsx` — charts.
- `components/{AuthProvider,AuthButton,SavedPlans}.tsx` + `lib/supabase/*` + `middleware.ts` — auth.
- `app/methodology/page.tsx` — the docs page (keep it in sync with the engine).
- `docs/ARCHITECTURE.md` (engine deep-dive), `docs/ONBOARDING.md` (Stage 6 spec).

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

## NEXT TASK — Stage 6: onboarding quiz + landing page

Full spec in **`docs/ONBOARDING.md`**. Summary: move `/` to a landing page,
current planner to `/planner`, add a `/start` multi-step quiz that collects the
~6 key inputs (age, retirement age, target income, ISA/SIPP/GIA balances,
monthly contributions, optional property), reveals the live result, then offers
sign-up to save (reusing Supabase). Hand off quiz→planner via
`localStorage["onfire:plan"]`. Silent defaults for statutory ages / growth /
pension strategy / life expectancy.

## Also nice-to-have polish (backlog)

- `docs/ARCHITECTURE.md` still has a few pre-property/pre-2026 phrasings ("21 tests", "two balances", "flat 5% applied identically to ISA and SIPP", "past age 58") — refresh it.
- Consider showing property value / total net worth somewhere visual (currently only flows via GIA jumps + sustainability).
- Deploy to Vercel (add `NEXT_PUBLIC_SUPABASE_*` + `ANTHROPIC_API_KEY` env vars; add the deployed URL to Supabase Auth redirect URLs).
