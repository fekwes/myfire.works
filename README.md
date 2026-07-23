# OnFIRE — UK Financial Independence, Retire Early Planner

A dashboard that models a UK FIRE plan across the three phases that actually determine whether early retirement works in the UK: drawing down an **ISA/GIA bridge** before your pension is accessible, taking the **25% tax-free SIPP lump sum** and paying UK income tax on the rest, and letting the **State Pension** offset your drawdown from age 67.

Built with [Next.js](https://nextjs.org), TypeScript, Tailwind CSS, and [Claude Code](https://claude.com/product/claude-code) as an AI pair-programmer — see [How this was built](#how-this-was-built) below for exactly what that means and what I did versus what the AI did.

> For planning purposes only. Not financial advice.

## What it does

1. **Bridge phase** — from your target retirement age until age 58, income is drawn tax-free from your ISA/GIA.
2. **SIPP phase** — at 58, up to £268,275 (25% of the pot) is taken as a tax-free lump sum; the rest is drawn down and taxed against 2024/25 UK income tax bands.
3. **State Pension phase** — from age 67, State Pension income reduces how much SIPP needs to be withdrawn each year to hit your target.

You enter your ages, target income, and current ISA/SIPP balances and contributions; the app simulates every year to age 95 and shows you the asset timeline, the exact year you cross from bridge funding to SIPP funding, and whether your net income holds up in every year.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, `next-themes` for dark/light mode |
| Charts | Recharts |
| Testing | Vitest |
| AI insights | Anthropic Claude API (Opus 4.8), structured JSON outputs |

## The interesting part: the tax engine

[`lib/fire-engine.ts`](lib/fire-engine.ts) is a standalone, fully-tested TypeScript module — no framework dependencies — that models:

- **UK income tax** (2024/25, rest-of-UK rates) including the £100,000–£125,140 personal allowance taper, verified against known HMRC figures (e.g. tax on £200,000 = £76,203, tax exactly at the additional-rate threshold £125,140 = £42,516).
- **A gross-up solver.** Given a target *net* income plus other taxable income (like the State Pension), there's no clean closed-form inverse of a progressive tax function with a tapering allowance — so the engine uses bisection search instead of hand-deriving a band-by-band formula. It's a small, deliberate trade of "clever math" for "obviously correct and easy to verify."
- **A full year-by-year simulation** — 40+ years, tracking two balances, applying growth, contributions, the one-off lump sum, and the withdrawal waterfall (ISA first, SIPP second) — producing the data the dashboard charts directly.

21 Vitest unit tests pin the tax function to specific known values and exercise the simulation end-to-end (bridge-only funding, lump-sum timing, shortfall detection, full sustainability). Full write-up: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Getting started

```bash
git clone https://github.com/fekwes/uk-fire-app.git
cd uk-fire-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To use the AI insights feature, copy the env template and add a key:

```bash
cp .env.local.example .env.local
# then set ANTHROPIC_API_KEY in .env.local
```

## Running tests

```bash
npm test
```

## How this was built

I'm not going to pretend this was hand-typed line by line — it wasn't. I built it with **Claude Code**, working from a five-part technical spec I wrote (reproduced below), and I think *how* I used the tool is the more useful thing to show a recruiter than pretending otherwise.

What I actually did:

- **Wrote the spec.** Each prompt below specifies a concrete deliverable — file names, exact UK tax rules (25% lump sum, £268,275 cap, State Pension offset), specific UI requirements — not "build me a FIRE calculator."
- **Reviewed every change**, including the generated tests. One test asserted SIPP drawdown would kick in for a scenario where — once I worked through the numbers — the ISA balance legitimately never depletes (a £300k ISA growing at 5% against a £30k/year target simply lasts). That's not a bug, it's correct behavior for that input; the fix was to the test's fixture, not the engine. Catching that required actually understanding the simulation, not just reading a green checkmark.
- **Verified the tax math by hand** against the known UK band thresholds and the personal-allowance taper before trusting the unit tests that pin them.
- **Tested the UI live in a browser** at every stage (theme toggle, form validation, chart tooltips, error states) rather than relying on the type-checker and lint being clean.
- **Made the calls the AI can't make for me** — e.g. choosing a Next.js web app over a native app given the actual constraints (this needs no server infrastructure to speak of, hosts for free on Vercel, and has none of a native app's App Store overhead), with a PWA as the upgrade path if a "phone app" feel is wanted later.

<details>
<summary><strong>The five prompts used to build this app</strong></summary>

**1. Project Architecture & Theme**
> I am building a modern UK FIRE (Financial Independence, Retire Early) application using Next.js and Tailwind CSS. Clean up the default template homepage and establish a sleek, trustworthy dark/light financial dashboard layout with clean typography.

**2. Core UK FIRE Calculation Engine**
> Create a dedicated TypeScript utility file `lib/fire-engine.ts`. Build calculation logic tailored specifically to UK tax rules:
> 1. Bridge Phase: Calculate ISA/GIA drawdown to bridge income from target early retirement age up to SIPP accessibility age (age 58).
> 2. SIPP Phase: Model tax-free lump sum (25% up to £268,275 cap) and taxable drawdown after age 58 using UK income tax bands.
> 3. State Pension: Integrate State Pension income entering at age 67 to automatically offset SIPP drawdown requirements.
> Include unit tests in `lib/fire-engine.test.ts` to verify the math.

**3. User Inputs Component**
> Build an interactive UI form component in `components/FireForm.tsx` where users can input: Current Age & Target Retirement Age, Target Net Annual Income, Current ISA/GIA Balance vs. Monthly Contribution, Current SIPP Balance vs. Monthly Contribution. Ensure inputs have sensible UK defaults and clear tooltips explaining the Bridge vs. Pension mechanics.

**4. Dynamic Dashboard & Charting**
> Install `recharts` and build a main dashboard view. Render a visual timeline chart showing asset balances (ISA vs SIPP) declining over time, highlighting the exact year the user transitions from ISA Bridge funding to SIPP funding, and showing net annual post-tax income safety.

**5. AI Scenario Insights (Optional Feature)**
> Add an API route `app/api/analyze/route.ts` that takes the user's FIRE simulation results and calls Claude to generate 3 tailored UK strategy tips (e.g., optimizing SIPP tax relief vs ISA bridge funding based on current UK income tax bands).

</details>

## Assumptions & limitations

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#assumptions--simplifications) for the full list — briefly: 2024/25 rest-of-UK tax rates only (no Scottish rates), a flat 5% nominal growth assumption, ISA and GIA treated as a single tax-free bucket (GIA's own CGT/dividend tax isn't modeled), and a fixed 95-year-old life expectancy horizon.

## License

MIT
