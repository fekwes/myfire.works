# Going multi-country — evaluation and plan

Fireworks models UK financial independence. This document assesses what it would
take to also model **Canada**, **Spain** and the **United States**: what the
existing code can reuse, what has to become pluggable, which country is easiest,
and where each one gets genuinely hard.

Nothing here is started. It is a decision document, not a spec.

> **On the numbers.** This project's rule is to verify tax figures against
> primary sources and never invent them, so this document deliberately reasons
> about *mechanisms* rather than reciting rates. The handful of figures that the
> difficulty ranking actually depends on were checked and are cited inline;
> everything else is marked **[verify]** and must be sourced before a line of
> code is written against it. Several are contested even between reputable
> secondary sources — the OAS clawback threshold below is a live example.

---

## 1. The core finding

The engine is in better shape for this than it looks, and the UI is in worse
shape than it looks.

**The simulation is already country-agnostic in structure.** `simulateFire` does
one thing per year: grow the pots, work out the net income needed, draw from
wrappers in tax-efficiency order, tax the draw, record a snapshot. That loop is
correct for any country. The solvers around it (`solveGrossIncomeForNet`,
`solveSippGrossForNetGradual`, `solveGiaGrossForNet`) invert a progressive tax
function by bisection precisely *because* nobody wanted to hand-code a
band-by-band inverse — and bisection doesn't care whose tax function it is. That
is the single most valuable piece of accidental portability in the codebase.

**But the wrapper names are the data model, not labels.** `isaBalance`,
`isaGrowth`, `isaHoldings`, `isaWithdrawal`, `isaDepletedAge`, and the same
again for `gia` and `sipp`. There are ~200 such symbol occurrences in
`lib/fire-engine.ts` alone and ~80 in `components/FireForm.tsx`:

```bash
grep -rcoE "\b(isa|Isa|ISA|sipp|Sipp|SIPP|gia|Gia|GIA)\w*" --include="*.ts*" lib/ components/ app/
# lib/fire-engine.ts:202   components/FireForm.tsx:83   lib/coast-fire.ts:39
# lib/fire-number.ts:36    components/AssetTimelineChart.tsx:29 ...
```

So the work is not "add a tax table". It is one structural refactor — turning
three hard-coded wrappers into a list of wrappers described by their tax
treatment — after which each country is mostly data plus its own genuine
oddities.

### The insight that makes it tractable

The UK's three wrappers are not three arbitrary things. They are three *tax
treatments*, and almost every country's accounts fall into the same three:

| Treatment | UK | Canada | US | Spain |
|---|---|---|---|---|
| Tax-free in and out | ISA | TFSA | Roth IRA / Roth 401(k) | *(none)* |
| Tax-deferred, taxed on withdrawal, age-locked | SIPP | RRSP → RRIF | Traditional 401(k) / IRA | Plan de pensiones |
| Taxable, tax on gains | GIA | Non-registered | Brokerage | Fondos / cuenta |

Three of the four map cleanly. **Spain's blank cell is the interesting one** and
is discussed in §4.

---

## 2. What is reusable, and what isn't

### Reusable as-is

- The year-by-year simulation loop and phase model (accumulation → bridge →
  pension → state pension). The *shape* of an early-retirement plan is universal.
- `bisect` and the solver pattern — works against any monotonic net-of-tax
  function.
- `lib/monte-carlo.ts`, including the common-random-numbers fix. Asset-class
  return assumptions are global, not national.
- `lib/fire-number.ts`, `lib/coast-fire.ts`, `lib/what-if.ts` — arithmetic over
  a target and a horizon.
- `lib/assets.ts` — the holdings model and asset-class returns. Now that
  `ASSET_CLASSES` is a single source of truth, adding country-specific classes
  is a one-place change.
- Everything infrastructural: `plan-storage`, `share`, `profiles`, `plan-sync`,
  auth, the design system, the charts, export, the checklist, the quiz *engine*.
- The property model (value, growth, sale, downsize) — the mechanics travel; the
  tax on disposal doesn't.

### Country-specific by nature

1. **Income tax.** Bands, rates, allowances, tapers. Same *shape* everywhere
   (piecewise-linear, monotonic), so it fits behind one function — but the US
   and Canada add a second jurisdiction layer, and Spain a second *base*.
2. **Capital gains.** Structurally different, not just differently rated. UK: a
   separate CGT regime with its own rates. Canada: gains are *included in income*
   at 50% — no separate rate at all. Spain: a separate savings base with its own
   progressive scale. US: preferential long-term rates that stack on ordinary
   income, plus a surtax.
3. **Wrappers** — contribution limits, access ages, penalties, forced
   withdrawals.
4. **State pension.** The biggest single divergence, and the main driver of the
   difficulty ranking. See §4.
5. **Forced withdrawals.** A concept the engine does not have at all: the UK
   never makes you take money out. Canada and the US both do.
6. **Cliffs and clawbacks** — means-tested benefits that create enormous
   effective marginal rates the engine currently cannot express.
7. **Currency, locale, fund catalogue** — mechanical, but `lib/vanguard-funds.ts`
   is ~40 UK-domiciled funds and would need a per-country catalogue.

---

## 3. The refactor that has to come first

### 3.1 Wrappers become data

```ts
type TaxTreatment = "tax-free" | "tax-deferred" | "taxable";

interface WrapperSpec {
  id: string;                    // "isa" | "tfsa" | "roth-ira" | "401k"
  label: string;                 // "ISA", "TFSA", "Roth IRA"
  treatment: TaxTreatment;
  /** Age before which withdrawals are blocked or penalised. */
  accessAge?: number;
  annualContributionLimit?: number;
  /** UK's 25% PCLS. Rare, but not unique — model it, don't special-case it. */
  taxFreeFractionOnWithdrawal?: number;
  /** Lifetime cap on that tax-free cash (the UK's LSA). */
  taxFreeLifetimeCap?: number;
  /** Forced minimum withdrawal as a fraction of balance, by age (RRIF, RMD). */
  forcedMinimumFraction?: (age: number) => number;
}
```

And in the plan:

```ts
interface FireInputs {
  country: CountryId;
  wrappers: Record<string, { balance: number; monthlyContribution: number;
                             growth?: number; holdings?: Holding[] }>;
  // ... the country-agnostic fields stay as they are
}
```

**This changes the persisted plan shape, which is exactly what §3 of the handoff
warns about.** `onfire:plan`, every `?p=` share link and every `portfolios` row
holds the old flat shape. It needs a `schemaVersion` field and a migration
inside `sanitisePlanInput` that reads v1 (flat `isaBalance`…) and returns v2
(`wrappers.isa.balance`…), kept for at least a couple of releases. Doing this
without the migration would orphan every saved plan and every link anyone has
shared. `lib/identifiers.test.ts` should grow a case pinning the v1 reader.

### 3.2 A country pack

```ts
interface CountryPack {
  id: CountryId;                       // "uk" | "ca" | "es" | "us"
  currency: { code: string; locale: string };
  wrappers: WrapperSpec[];
  /** Sub-jurisdiction: Scotland, a province, a state, an autonomous community. */
  regions?: { id: string; label: string }[];

  incomeTax(taxableIncome: number, ctx: TaxContext): number;
  capitalGainsTax(realisedGain: number, ctx: TaxContext): number;
  statePensionAnnual(ctx: PensionContext): number;

  /** Tax-efficient draw order. Differs by country, and it is not obvious. */
  drawOrder: string[];
  /** Means-tested cliffs the drawdown must respect (ACA, OAS). */
  constraints?: PlanConstraint[];
}
```

`TaxContext` carries filing status, region and the year's other income — the
things a tax function needs and the current code passes implicitly.

Existing UK behaviour becomes `packs/uk.ts`, and the `fire-engine.test.ts` suite
becomes the proof the refactor changed nothing. **That is the safety net that
makes this refactor safe to attempt at all:** ~110 UK-specific engine assertions
already exist, so a behaviour-preserving refactor is verifiable rather than
hopeful.

### 3.3 What the UI has to grow

- A country selector, and it must be part of the plan (a share link has to open
  in the sender's country, not the reader's).
- `FireForm` currently renders three named wrapper blocks with hard-coded
  copy, tooltips and colour dots. It becomes a loop over `pack.wrappers`.
  Note §5 of the handoff: hue is bound to the *entity* — that binding needs to
  become "by wrapper index within the pack" without breaking the UK's ISA=ember
  / SIPP=violet / GIA=teal.
- `Glossary`, `/methodology` and the quiz copy are UK-specific prose. This is
  the quiet majority of the work and the easiest to underestimate.
- Currency formatting is centralised in `lib/format.ts` — the one piece of the
  UI that is already ready.

---

## 4. Country-by-country assessment

### 🇨🇦 Canada — **easiest. Start here.**

**Why it's easiest:** the wrapper mapping is nearly one-to-one with the UK, so
the refactor's abstraction gets validated against a country that fits it
comfortably. TFSA behaves like an ISA, RRSP like a SIPP, non-registered like a
GIA. Tax is progressive federal + progressive provincial — two applications of
a function the engine already has. And the OAS clawback is a *taper on a
benefit above an income threshold*, which is structurally the same as the UK
personal-allowance taper already implemented in
`calculatePersonalAllowance`.

**The genuine challenges:**

1. **Forced withdrawals — a new engine concept.** An RRSP must convert to a RRIF
   by the end of the year you turn 71, after which a CRA-set minimum percentage
   must be withdrawn each year, rising with age (roughly 5.28% at 71 up to 20%
   at 95+ **[verify against CRA]**). The engine currently only ever withdraws
   what the plan *needs*. Forced withdrawals invert that: income you don't want,
   which is taxable, and which can push you over a clawback threshold. This
   changes the shape of the yearly loop, not just its parameters — which is
   precisely why it's a good first non-UK country.
   Sources: [money.ca](https://money.ca/retirement/rrsp-to-rrif-conversion-trigger-thousands-in-unexpected-taxes),
   [Shajani CPA](https://shajani.ca/rrif-minimum-withdrawals-in-2026-what-you-must-take-and-why-it-matters/)
2. **Capital gains are not a separate tax.** 50% of a gain is included in
   ordinary income — there is no CGT rate to look up. Note that the proposed
   increase to 66.67% above $250,000 was deferred and then **cancelled in March
   2025**, so 50% stands for 2026; a stale secondary source here would produce a
   materially wrong answer.
   Sources: [Scotia Wealth](https://enrichedthinking.scotiawealthmanagement.com/2025/04/07/cancellation-of-the-proposed-capital-gains-inclusion-rate-increase/),
   [Wolters Kluwer](https://www.wolterskluwer.com/en-ca/expert-insights/changes-to-capital-gains-inclusion-rate-deferred-to-2026)
   This means `capitalGainsTax` cannot be a peer of `incomeTax` in the interface
   — gains have to be *routed into* the income calculation. Better to discover
   that with Canada than with a harder country.
3. **The OAS clawback creates a 15pp marginal-rate spike**, recovered above a
   net-income threshold. Reputable sources disagree on the 2026 figure —
   $90,997 and $95,323 both appear — so this must come from CRA directly.
   **[verify]** It also interacts with RRIF minimums: forced income triggering a
   clawback is the central Canadian FIRE problem, and modelling it would be a
   real differentiator.
4. **13 provincial/territorial systems.** Ship one or two (Ontario, BC) and be
   explicit about it, exactly as the app is currently explicit about being
   rest-of-UK only.
5. **CPP depends on contribution history**, so it needs an input rather than a
   flat default — but a "your CPP estimate from My Service Canada" number field
   is an honest and simple answer.

**Verdict:** the RRIF/clawback interaction is a real engine extension, but it is
*bounded* and it exercises exactly the abstractions the refactor introduces.
Ship Canada second (after the refactor), and treat it as the proof the country
pack works.

---

### 🇪🇸 Spain — **middle difficulty, but the weakest product fit.**

**Why it's middling:** Spanish personal tax has a clean structural separation
that suits the engine — a *general base* (employment, pensions; progressive,
split state + autonomous community) and a *savings base* (interest, dividends,
capital gains; its own progressive scale). Two bases is a tidier model than the
US's stacking rules. There are also far fewer wrappers to describe.

**The genuine challenges:**

1. **There is no tax-free wrapper.** No ISA, no TFSA, no Roth. The app's entire
   three-wrapper narrative — and the "ISA bridges you until your pension
   unlocks" story that is the product's core insight — has no Spanish analogue.
   This is a *product* problem, not a code problem, and it is the biggest one.
2. **Pension plans are too small to bridge anything.** Individual contributions
   are capped at **€1,500/yr** (or 30% of net employment/business income,
   whichever is lower), with employment plans allowed more (€8,500 employer,
   €10,000 combined). A wrapper you can put €1,500 a year into is not a FIRE
   vehicle, so a Spanish plan is dominated by the taxable account.
   Sources: [VidaCaixa](https://www.vidacaixa.es/articulos/finanzas-y-ahorro/fiscalidad-planes-pensiones),
   [Bankinter](https://www.bankinter.com/blog/finanzas-personales/planes-pensiones-cambios-fiscalidad)
   — both secondary; confirm against the Agencia Tributaria before coding.
3. **A recurring wealth tax the engine cannot express.** *Impuesto sobre el
   Patrimonio*, plus the solidarity tax on large fortunes. The engine taxes
   *income and realised gains*; an annual levy on the *stock* of assets is a new
   category of deduction in the yearly loop. Not hard to add — but it must be
   added, and it changes the arithmetic of "how big a pot do I need".
4. **Enormous regional variation.** Autonomous communities set part of the
   income tax scale and diverge sharply on wealth tax (Madrid vs Catalonia is
   not a rounding difference). Region becomes mandatory input, not optional.
5. ***Traspaso* is a genuinely different mechanic.** Switching between
   investment funds can be done without realising the gain. The engine's GIA
   model assumes a switch is a disposal. Getting this wrong overstates Spanish
   tax drag substantially.
6. **The contributory pension is history-based** — computed from contribution
   bases over a long reference period, with a formula that has been mid-reform.
   Like CPP, best handled as a user-supplied estimate. **[verify]**
7. **Localisation is real work.** Spanish-language UI, and this is the first
   country that forces i18n on the app. Everything before it is English.

**Verdict:** the tax model is approachable and the wrapper list is short, but
the product story has to be rewritten from scratch, plus wealth tax, plus
regions, plus i18n. Do it third, or skip it in favour of a market where FIRE is
already an established concept.

---

### 🇺🇸 United States — **hardest by a wide margin, and the biggest prize.**

**Why it's hardest.** Not the income tax — that part is easy. It is everything
around it.

1. **Social Security cannot be approximated credibly.** The benefit comes from a
   35-year indexed earnings history run through a bend-point formula, adjusted
   for claiming age, with spousal and survivor variants, and then *the benefit
   itself is partially taxable* depending on total income. A US FIRE audience
   will check this against their own SSA statement. The honest options are a
   user-entered estimate from ssa.gov, or a real implementation — and a real one
   needs earnings history the app has no way to collect.
2. **The ACA subsidy cliff came back in January 2026, and it is now the binding
   constraint on US early retirement.** The enhanced premium tax credits from
   ARPA/IRA expired 31 December 2025, restoring the hard cutoff at **400% of the
   federal poverty level — about $62,600 for a single person and $128,600 for a
   family of four** in the continental US. One dollar of MAGI over that line
   costs the *entire* subsidy, often five figures a year.
   Sources: [KFF](https://www.kff.org/affordable-care-act/what-we-know-so-far-about-2026-aca-marketplace-enrollment-premiums-and-deductibles/),
   [healthinsurance.org](https://www.healthinsurance.org/blog/marketplace-enrollees-face-return-of-the-subsidy-cliff/),
   [Congressional Research Service](https://www.congress.gov/crs-product/R48290)

   For a pre-65 US retiree this dominates the drawdown decision: the optimal
   withdrawal plan is the one that keeps MAGI under a cliff, not the one that
   minimises income tax. The engine's model — "draw what you need, in tax-order,
   then compute the tax" — cannot express that. It needs a *constrained*
   drawdown, where a withdrawal that crosses a threshold is rejected in favour
   of one that doesn't.

   **This is also the strongest argument for doing the US at all.** The cliff
   returned seven months ago; most calculators will not have caught up, and one
   that models it properly would be genuinely differentiated rather than a
   me-too.
3. **Filing status changes every bracket.** Single vs married-filing-jointly is
   not a modifier, it is a different tax system — and joint plans are still
   unstarted (handoff backlog item 4). The US effectively *requires* that work
   first, whereas Canada and Spain merely benefit from it.
4. **Federal plus 50 states**, several with no income tax and several treating
   capital gains their own way.
5. **A wrapper zoo, and the techniques matter more than the accounts.**
   Traditional and Roth 401(k), Traditional and Roth IRA, HSA, 457, SEP — each
   with limits and income phase-outs. But the defining US FIRE techniques are
   *multi-year optimisations*, not withdrawal rules: the **Roth conversion
   ladder** (converting tax-deferred money to Roth years ahead of needing it,
   filling low brackets deliberately), the 5-year seasoning rule, 72(t) SEPP,
   the Rule of 55. A US tool that models accounts but not conversion ladders
   misses the point of US FIRE.
6. **RMDs** (forced withdrawals, as Canada) plus the preferential long-term
   capital-gains brackets that *stack* on ordinary income — including a 0%
   bracket that interacts with conversion ladders — plus the net investment
   income tax. **[verify all rates and thresholds]**

**Verdict:** the US needs two things the engine does not have — constrained
drawdown under cliffs, and multi-year tax optimisation — plus joint filing,
plus states, plus a credible Social Security answer. It is a different class of
problem, not a bigger version of the same one. Attempt it only after the
refactor has been proven on Canada, and treat the ACA cliff as the headline
feature rather than an afterthought.

---

## 5. Ranking and recommendation

| | Canada | Spain | US |
|---|---|---|---|
| Wrapper mapping | ✅ near 1:1 | ⚠️ no tax-free wrapper | ⚠️ many, plus techniques |
| Income tax | ✅ fed + provincial | ✅ two bases | ⚠️ fed + 50 states + filing status |
| Capital gains | ⚠️ folded into income | ✅ separate base | ❌ stacking + surtax |
| State pension | ⚠️ user estimate | ⚠️ user estimate | ❌ hard to do credibly |
| New engine concepts | forced withdrawals, clawback taper | wealth tax | constrained drawdown, multi-year optimisation, joint filing |
| Localisation | none | full i18n | none |
| FIRE market | strong | weak | largest by far |
| **Relative effort** | **1×** | **~2×** | **~4–5×** |

**Recommended order: refactor → Canada → US → Spain.**

Spain moves last despite sitting between the others on difficulty, because
effort should follow market: Canada is cheap and validates the architecture, the
US is where the users are, and Spain costs an i18n programme plus a rewritten
product story to reach the smallest of the three audiences.

### Phasing

**Phase 0 — the refactor (do this whatever you decide next).**
Wrappers become data; a `CountryPack` interface; `packs/uk.ts` reproduces
today's behaviour exactly, proven by the existing ~110 engine assertions;
`schemaVersion` plus a v1→v2 plan migration. **No user-visible change.** This is
worth doing on its own merits — it is what turns "add a country" from a rewrite
into a data change — and it is the only phase whose cost is entirely predictable.

**Phase 1 — Canada.** The pack, plus the two new engine concepts (forced
withdrawals, a clawback taper), plus one or two provinces. Ship it behind a
country selector, explicit about which provinces are covered.

**Phase 2 — joint plans.** Already in the backlog on its own merits, and a hard
prerequisite for the US. Two allowances, two pensions, two state pensions.
Cheaper to do before the US pack than during it.

**Phase 3 — the US.** Constrained drawdown under the ACA cliff first, because it
is both the hardest part and the differentiator. Then Roth conversion ladders.
Social Security as a user-entered estimate, with an honest note about why.

**Phase 4 — Spain.** Only alongside a decision to invest in i18n.

### The trap to avoid

The tempting move is to add a `country` field and a second tax table, ship "US
support", and discover later that the US needs constrained drawdown, joint
filing and conversion ladders — by which point the flat wrapper fields are load
bearing in twice as much code and every saved plan is in the old shape. The
refactor is cheap now and expensive after the second country. Do it first, even
if the answer to "which country next" turns out to be "none yet".
