# Fireworks (UK/US/ES FIRE App) — Project Handoff & Architecture Map

> **Current Repository**: `/Users/alberto/Documents/Claude Projects/uk-fire-app`  
> **Status**: Production Ready / Fully Merged on `main`  
> **Last Comprehensive Audit**: July 28, 2026  

---

## Executive Overview

Fireworks is a modern, privacy-first financial independence & early retirement (FIRE) calculator built specifically for real tax systems (UK, US, and Spain). It replaces generic 4% rule-of-thumb calculators with country-specific tax rules, wrapper drawdown ordering, statutory pension access ages, Monte Carlo risk modeling, and Coast FIRE sensitivity solvers.

---

## Tech Stack & Dependencies

- **Framework**: Next.js 16 (App Router, Turbopack, React 19, Server & Client Components).
- **Styling & UI**: Vanilla CSS Design Tokens + Tailwind CSS v4, Lucide React icons, dark/light mode CSS variables.
- **Testing Suite**: Vitest (263 unit tests across 25 suites), 100% type-safe TypeScript (`npx tsc --noEmit`), ESLint (`npm run lint`).
- **Persistence & Auth**: LocalStorage-first (`onfire:plan:uk`, `onfire:plan:es`, `onfire:plan:us`), with optional cloud sync via Supabase Auth (`lib/supabase/`).
- **Analytics**: Cookieless, privacy-first Umami Analytics (`lib/analytics.ts`, 0 cookies, 0 fingerprinting).
- **AI Integration**: Google Gemini 2.5 Flash API (`/api/import-plan`, `/api/estimate-portfolio`, `/api/analyze`, `lib/portfolio-import.ts`).

---

## Core Engine Architecture

```
                       ┌─────────────────────────┐
                       │   User Inputs / Quiz    │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │      resolveInputs()    │
                       └────────────┬────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
   │  ukPack (UK)    │     │  esPack (ES)    │     │  usPack (US)    │
   │  ISA, SIPP, GIA │     │  PIAS, Pension, │     │  Roth, 401k,    │
   │  Rest-of-UK tax │     │  Cuenta-Valores │     │  Brokerage      │
   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │      simulateFire()     │
                       │ (Year-by-year loop)     │
                       └────────────┬────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────────┐ ┌───────────────────┐ ┌──────────────────────┐
│ executeDrawdownSeq()  │ │ computeFireNumber │ │    runMonteCarlo()   │
│ Tax Solver & Buckets  │ │ Bridge vs Pension │ │ 2,000 Volatility Runs│
└───────────────────────┘ └───────────────────┘ └──────────────────────┘
```

---

## Wrapper & Tax Systems Breakdown

### 1. United Kingdom (`ukPack` — `lib/countries/uk/`)
- **Wrappers**:
  - `isa`: Tax-free accumulation and withdrawal (up to £20k/yr contribution limit).
  - `gia`: Taxable general investment account (CGT £3k allowance, 18%/24% bands).
  - `sipp`: Tax-deferred pension (NMPA age 57 unlock, 25% tax-free lump sum up to £268,275 cap; UFPLS vs lump-sum strategy).
- **Tax Rules**: Rest-of-UK income tax (20%, 40%, 45%), Personal Allowance (£12,570, tapered £1 per £2 over £100k), State Pension (£12,547.60/yr at age 67).

### 2. Spain (`esPack` — `lib/countries/es/`)
- **Wrappers**:
  - `pias`: Tax-exempt savings plan (*Planes Individuales de Ahorro Sistemático*).
  - `cuenta-valores`: Taxable brokerage account (*Base del Ahorro* savings scale: 19% to 28%).
  - `plan-pensiones`: Tax-deferred pension (1,500 € annual limit, access age 65, taxed under IRPF general scale).
- **Tax Rules**: IRPF progressive bands (19% to 47%), Mínimo Personal (€5,550 base, €6,700 for age 65+, €8,100 for age 75+), Pensión Pública (€14,000/yr at age 67).

### 3. United States (`usPack` — `lib/countries/us/`)
- **Wrappers**:
  - `roth`: Tax-free Roth IRA / Roth 401(k).
  - `brokerage`: Taxable brokerage (long-term capital gains 0%, 15%, 20%).
  - `401k`: Tax-deferred 401(k) / Traditional IRA (access age 59.5).
- **Tax Rules**: Federal Income Tax, Federal Standard Deduction, Social Security estimates.

---

## Solver Modules & Math Utility Map

1. **`lib/bisect.ts`**: Unified monotonic binary search solver with bracket clamping (`smallestPassing`).
2. **`lib/fire-number.ts`**: Calculates required Target FIRE Pot and splits requirements between **Bridge Assets** (current age to pension access age) and **Pension Assets** (pension access age to life expectancy).
3. **`lib/coast-fire.ts`**: Computes minimum capital required today to sustain retirement without further monthly contributions (`solveCoastNumber`) and earliest Coast Age (`solveCoastAge`).
4. **`lib/what-if.ts`**: Sensitivity analysis evaluating required monthly contributions and early/late retirement trade-offs (`retirementSensitivity`).
5. **`lib/monte-carlo.ts`**: 2,000-iteration random walk market stress test with Guyton-Klinger spending guardrails and percentile distribution outputs.

---

## Verification & Commands

Run these standard terminal commands to verify codebase health:

```bash
# Run unit tests (263 passing across 25 suites)
npm test

# Run TypeScript type check (0 errors)
npx tsc --noEmit

# Run ESLint (0 errors, 0 warnings)
npm run lint

# Run Next.js production build (pre-renders static pages)
npm run build
```

---

## Key Files & Entry Points

- **Form & Planner Dashboard**: `app/planner/page.tsx`, `components/FireDashboard.tsx`, `components/FireForm.tsx`.
- **State Provider**: `components/PlanProvider.tsx` (manages region switching, local storage persistence, Supabase sync).
- **Quiz Onboarding**: `app/start/page.tsx`, `components/QuizFlow.tsx`, `lib/quiz.ts`.
- **Simulation Engine**: `lib/fire-engine.ts`, `lib/engine/drawdown.ts`, `lib/engine/tax.ts`.
- **Country Definitions**: `lib/countries/index.ts`, `lib/countries/uk/`, `lib/countries/es/`, `lib/countries/us/`.
