# Fireworks — UK FIRE planner

[![CI](https://github.com/fekwes/onfire/actions/workflows/ci.yml/badge.svg)](https://github.com/fekwes/onfire/actions/workflows/ci.yml)

A UK **FIRE** (Financial Independence, Retire Early) planner that models the three phases that actually decide whether early retirement works in the UK — drawing down an **ISA/GIA bridge** before your pension unlocks, taking the **25% tax-free SIPP lump sum** and paying real income tax on the rest, and letting the **State Pension** offset your drawdown later — with the **UK tax you'll actually pay**, year by year.

> For planning purposes only. Not financial advice.

The name is a double meaning: **FIRE** × **fireworks** — the celebratory moment a plan "goes off" — and the domain (`myfire.works`) reads as *it works*. Built with [Next.js](https://nextjs.org) and [Claude Code](https://claude.com/product/claude-code) as an AI pair-programmer; see [How this was built](#how-this-was-built).

## What it does

1. **Bridge phase** — from your target retirement age until your SIPP unlocks (57 from April 2028), income comes from your **ISA** (tax-free) first, then your **GIA** (Capital Gains Tax on the gains portion of each withdrawal).
2. **Pension phase** — at your access age, up to £268,275 (25% of the pot) is available tax-free; the rest is drawn against 2026/27 UK income-tax bands.
3. **State Pension phase** — from State Pension age (67 by default), it reduces how much your pots must fund.

On top of the core drawdown engine:

- **Your FIRE number** — bisects the pot you need at retirement vs. what you're on course for, in today's money.
- **Per-wrapper portfolios** — build a real portfolio in each of ISA/GIA/SIPP from a searchable ~40-fund UK catalogue (or custom holdings), with weights and fee-aware growth. **Import with AI** reads a pasted broker statement or a CSV.
- **Property** — a rental (taxable income, optional later sale) and a home (net worth, optional downsize to release tax-free cash).
- **Confidence** — a Monte Carlo pass stress-tests the plan against bad markets, seeded from your actual equity/bond split.
- **Coast FIRE**, inflation in real terms, share links, CSV/JSON/print export, and optional saved profiles behind sign-in.

## The interesting part: the engine

[`lib/fire-engine.ts`](lib/fire-engine.ts) is a standalone, fully-tested TypeScript module — no framework dependencies — that models:

- **UK income tax** (2026/27, rest-of-UK) including the £100,000–£125,140 personal-allowance taper, verified against known HMRC figures.
- **A gross-up solver.** Given a target *net* income plus other taxable income (the State Pension, rental, part-time work), there's no clean closed-form inverse of a progressive tax function with a tapering allowance — so the engine uses **bisection search** instead of a hand-derived band-by-band formula. A small, deliberate trade of "clever maths" for "obviously correct and easy to verify".
- **A full year-by-year simulation** — tracking ISA/GIA/SIPP separately (each with its own growth), applying contributions, the 25% lump sum, property events, and the withdrawal waterfall — producing the data the dashboard charts directly.

**One design rule worth calling out:** returns are always **deterministic**. A wrapper is a balance plus a single net-of-fees growth rate. When you build a portfolio, that rate is *derived* from your holdings — each holding's expected return comes from its **asset class** ([`lib/assets.ts`](lib/assets.ts)), never a per-fund guess. Even the AI import only classifies fund names into asset classes; it never invents a return. So the whole projection is reproducible from the URL, and nothing an LLM says can move a number.

Full write-up: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Contributor's map, deploy notes and roadmap: [docs/HANDOFF-FIREWORKS.md](docs/HANDOFF-FIREWORKS.md).

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4, `next-themes` (dark default) — the "Night & Ember" design system |
| Charts | Recharts, on a colour-blind-validated data ramp |
| Auth & saved plans | Supabase (`@supabase/ssr`), Row-Level Security |
| AI features | Google Gemini (`gemini-flash-latest`), structured JSON output |
| Testing | Vitest (168 tests) |
| Hosting | Vercel (Speed Insights, cookieless) |

The app builds and runs with **none** of the optional services configured — auth, AI and saved plans each degrade to a friendly state — so it deploys safely without them.

## Getting started

```bash
git clone https://github.com/fekwes/onfire.git
cd onfire
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Everything core works with no configuration.

To enable the optional features, copy the env template and fill in what you need:

```bash
cp .env.local.example .env.local
```

| Variable | Enables |
|---|---|
| `GEMINI_API_KEY` | AI tips + AI portfolio import ([free key](https://aistudio.google.com/apikey)) |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | sign-in + saved profiles |
| `SUPABASE_SERVICE_ROLE_KEY` | full account deletion (server-only) |
| `NEXT_PUBLIC_SITE_URL` | canonical/OG/sitemap/share URLs |

## Running the checks

```bash
npm test          # Vitest
npx tsc --noEmit  # types
npm run lint      # ESLint
npm run build     # production build
```

## Status

Live on Vercel, deploying from `main`. Core engine, onboarding quiz, tabbed dashboard/edit-plan, per-wrapper portfolios + AI import, property, Monte Carlo, SEO and the design system are all shipped. Next up: verifying saved profiles against a live Supabase, then partner/joint plans and Scottish tax bands. The full roadmap and "things not to rename" live in [docs/HANDOFF-FIREWORKS.md](docs/HANDOFF-FIREWORKS.md).

## How this was built

I built this with **Claude Code** as an AI pair-programmer, and *how* I used it is the more useful thing to show than pretending otherwise. What I actually did:

- **Owned the spec and the tax rules** — the 25% lump sum and £268,275 cap, the personal-allowance taper, the ISA→GIA→SIPP waterfall, the deterministic-returns rule above — and verified every figure against real 2026/27 UK guidance rather than trusting generated numbers.
- **Reviewed every change, including the tests.** One generated test asserted SIPP drawdown for a scenario where — once I worked the numbers — the ISA legitimately never depletes; the fix was the fixture, not the engine. Catching that needs understanding the simulation, not reading a green tick.
- **Made the calls the AI can't** — a static web app over native (free hosting, no App Store overhead), asset-class-based returns over per-fund guesses, keeping the projection reproducible from a URL.
- **Tested the UI live in a browser** at every step, in both themes and at mobile width — this codebase has a documented history of bugs that were invisible until measured.
