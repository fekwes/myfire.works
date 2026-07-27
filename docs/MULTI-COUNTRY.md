# Multi-country architecture

> **Status: Design.** Nothing here is built. See [`README.md`](./README.md) for
> the documentation index.

How Fireworks becomes a planner that can model more than one country, with the
US and Spain as the two target markets.

This is a design document. Nothing here is built.

> **On the numbers.** The rule in this project is to verify tax figures against
> primary sources and never invent them. Figures below are cited where they were
> checked, and marked **[verify]** where they were not. Spain's were researched
> for this document. **The US figures were not** — a research run was attempted
> and failed (see §6), so the US pack's data is explicitly unsourced and must be
> gathered before implementation. The *architecture* does not depend on those
> numbers; the US pack's contents do.

---

## 1. Corrections to the first draft

An earlier version of this document claimed Spain has no tax-free savings
wrapper. **That was wrong**, and the correction changes the assessment:

- **`Plan de Ahorro 5` (SIALP / CIALP) is a genuine tax-free wrapper.** Up to
  **€5,000/year**, held **5 years**, and the gains are **fully exempt from
  IRPF** — the ISA/Roth treatment. Only one may be held at a time.
  ([Agencia Tributaria](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-mobiliario/rendimientos-integrar-base-imponible-ahorro/rendimientos-operaciones-capitalizacion-seguros-vida-invalidez/planes-ahorro-largo-plazo/caracteristicas-requisitos.html),
  [BBVA](https://www.bbva.es/finanzas-vistazo/ef/seguros/sialp-seguro-individual-ahorro-largo-plazo.html))
- **PIAS** is a second, larger vehicle whose gains become exempt if taken as a
  life annuity after a qualifying period. **[verify limits]**

So the "tax-free / tax-deferred / taxable" model does hold for Spain. What is
true — and is the real point — is something narrower and more interesting:

**Spain's tax-free wrapper is too small to be the bridge.** £20,000/year into a
UK ISA is what funds the years between stopping work and unlocking a pension.
€5,000/year into a SIALP is not, and SIALPs are typically insurance or deposit
products rather than equity funds. A Spanish plan is therefore dominated by the
ordinary taxable account, and the product's core narrative — *"your ISA bridges
you until your pension unlocks"* — has to be rewritten rather than translated.

Two further corrections in the same area:

- **Pension plans are the tax-deferred bucket, and they are worse than a SIPP.**
  On withdrawal, Spain taxes **the entire amount — contributions as well as
  gains — as employment income** (*rendimientos del trabajo*) in the general
  base. There is no equivalent of the UK's 25% tax-free slice.
  ([BBVA](https://www.bbva.es/finanzas-vistazo/ef/planes-de-pensiones/tributacion-rescate-plan-de-pensiones.html),
  [Raisin](https://www.raisin.com/es-es/pensiones/planes-de-pensiones/fiscalidad-planes-pensiones/))
  Combined with the **€1,500/year** individual contribution limit, a pension
  plan can convert what would have been lightly-taxed savings income into
  heavily-taxed employment income. Modelling Spain honestly means the tool will
  sometimes tell users their pension plan is a bad idea.
- **Capital gains sit in a separate base with its own scale**: 19% to €6,000,
  21% to €50,000, 23% to €200,000, 27% to €300,000, 30% above.
  ([Wolters Kluwer](https://www.wolterskluwer.com/es-es/expert-insights/tramos-retenciones-irpf-2026-novedades),
  [idealista](https://www.idealista.com/news/finanzas/economia/2026/02/12/884145-novedades-fiscales-en-ahorro-e-inversion-para-2026-asi-son-los-nuevos-tipos-de-hasta-el))

---

## 2. The real finding: the UK is the easy case of everything

The engine is not "UK-flavoured". It is shaped by the fact that **the UK is the
structurally simplest version of every dimension a FIRE model has.** That is why
it looks portable and isn't.

| Dimension | UK | Spain | US |
|---|---|---|---|
| Wrappers | 3, fixed | 4+ | 8+ |
| Tax bases | income, + CGT beside it | **two independent bases** | ordinary + LTCG **stacked on it** + surtax |
| Jurisdictions | 1 (+Scotland) | **state + 17 communities** | **federal + 50 states** |
| State pension | flat rate × years/35 | **f(contribution history)** | **f(35-year earnings history)** |
| Forced withdrawals | none | none | **RMDs** |
| Cliffs | one taper | wealth-tax thresholds | **hard subsidy cliff** |
| Cost basis | one scalar | **FIFO lots + tax-free switching** | **lots, specific-ID** |

Six structural gaps follow. Each is described below as *what the engine assumes*
versus *what it must support*.

---

## 3. The six gaps

### G1 — Wrappers are hard-coded fields, not data

`isaBalance`, `isaGrowth`, `isaHoldings`, `isaWithdrawal`, `isaDepletedAge`, and
the same for `gia` and `sipp`:

```bash
grep -rcoE "\b(isa|Isa|ISA|sipp|Sipp|SIPP|gia|Gia|GIA)\w*" --include="*.ts*" lib/ components/
# lib/fire-engine.ts:202   components/FireForm.tsx:83   lib/coast-fire.ts:39 ...
```

**Needs to become:** a list of wrappers described by their tax treatment.

```ts
type TaxTreatment = "tax-free" | "tax-deferred" | "taxable";

interface WrapperSpec {
  id: string;                       // "isa" | "sialp" | "roth-ira" | "401k"
  label: string;
  treatment: TaxTreatment;
  accessAge?: number;
  annualContributionLimit?: number;
  /** Minimum holding period before the tax treatment applies (SIALP's 5 years). */
  minimumHoldYears?: number;
  /** UK's 25% PCLS. A property of the wrapper, not a special case in the engine. */
  taxFreeFractionOnWithdrawal?: number;
  taxFreeLifetimeCap?: number;
  /** Which income bucket a withdrawal lands in — this is what makes Spain's
   *  pension plan behave differently from a SIPP without engine changes. */
  withdrawalBucket: IncomeBucket;
  forcedMinimumFraction?: (age: number) => number;   // RMD, RRIF
}
```

Note what `withdrawalBucket` buys: a UK SIPP withdrawal is 75% employment income
and 25% nothing; a Spanish pension-plan withdrawal is 100% employment income; a
Roth withdrawal is nothing. Same field, three countries, no branching.

### G2 — Tax is one function; it needs to be buckets → bases

The engine has `calculateUkIncomeTax` and `calculateCapitalGainsTax` side by
side. That is a UK-specific arrangement. The general model:

```ts
type IncomeBucket =
  | "employment" | "pension-withdrawal" | "rental"
  | "interest" | "dividends" | "realised-gains" | "state-pension";

interface TaxBase {
  id: string;
  schedule: { upTo: number; rate: number }[];
  allowance?: (totalIncome: number) => number;   // UK taper lives here
  /** Income in `stacksOn` is added first to decide which band applies —
   *  this is exactly how US long-term capital gains work. */
  stacksOn?: string;
}

interface TaxSystem {
  bases: TaxBase[];
  /** Where each bucket lands, and how much of it counts.
   *  Canada's 50% capital-gains inclusion is `{ base: "general", inclusion: 0.5 }`. */
  routing: Record<IncomeBucket, { base: string; inclusion?: number }>;
  /** Applied after the bases: NIIT, regional surcharges. */
  surtaxes?: Surtax[];
}
```

This one model expresses all four countries:

- **UK** — one `income` base with the personal-allowance taper in `allowance`;
  a `cgt` base that `stacksOn: "income"` to choose 18% vs 24%.
- **Spain** — `general` and `savings`, two independent progressive bases, no
  stacking. Regional variation is a second `general` schedule added to the state
  one.
- **US** — `ordinary`, plus `ltcg` with `stacksOn: "ordinary"` (which is
  precisely the mechanism people find confusing and calculators get wrong), plus
  NIIT as a surtax, plus a state base.
- **Canada** — a single base; capital gains routed in at `inclusion: 0.5`.

The existing `bisect` solver works unchanged against any of these, because they
are all monotonic in gross income. **That is the single most valuable thing in
the current codebase** and the reason this refactor is feasible at all.

### G3 — State pension is a scalar; Spain and the US both need a history

This is the gap that most changes the data model, and the one that most affects
which country to build first.

- **UK** — flat rate × qualifying years / 35. A scalar and a count.
- **Spain** — *base reguladora* = the sum of contribution bases over the **last
  25 years (300 months) ÷ 350**, multiplied by a percentage running from **50%
  at 15 years contributed to 100% at 36 years 6 months** (2026).
  ([BBVA](https://www.bbva.es/finanzas-vistazo/ef/planes-de-pensiones/calculo-pension-jubilacion.html),
  [CaixaBank](https://www.caixabank.com/es/esfera/content/como-calcular-pension-jubilacion))
- **US** — AIME from the 35 highest indexed earnings years, through bend points,
  adjusted for claiming age. **[verify — research run failed]**

**Both target markets compute the pension from an earnings history over a
window. The UK is the outlier.** So `FireInputs` needs contribution/earnings
history — or a defensible synthesis of one (current salary, years contributed to
date, assumed future contributions to retirement) — and the pension model
becomes `pack.statePension(history, claimAge, region)`.

Build it once and both markets get it. That is the central planning fact in this
document.

#### The Spanish detail worth building the product around

For an early retiree the "last 25 years" window is mostly *after* they stopped
working, so it is mostly zeros. Spain fills those gaps — *integración de
lagunas* — and for retirements from **1 January 2026** the employee rules are:
first 48 months at 100% of the minimum base, months 49–60 at 100%, months 61–84
at 80%, and the remainder at 50%.
([Iberley](https://www.iberley.es/revista/cambios-que-entraran-vigor-ano-2026-pension-jubilacion-395),
[El Economista](https://www.eleconomista.es/economia/noticias/13936841/05/26/los-periodos-sin-cotizar-contaran-como-la-base-minima-para-calcular-la-pension-de-jubilacion-pero-los-autonomos-solo-tendran-seis-meses.html))

**The self-employed get almost none of this.** *Autónomos* can only cover about
six months, and only via *cese de actividad*; otherwise the months count as
zero.
([Autónomos y Emprendedor](https://www.autonomosyemprendedor.es/articulo/jubilacion/seguridad-social-permite-autonomos-completar-lagunas-cotizacion-solo-supuesto/20260217174903052021.html))

Three consequences:

1. **Employment status becomes a modelled input**, not a detail. Employee vs
   autónomo materially changes the pension of an identical saver.
2. ***Convenio especial*** — paying voluntarily to keep contributing after
   stopping work — becomes a genuine plan lever, sitting alongside "retire a year
   later" in the What-if card.
3. **This is the Spanish FIRE question nobody can answer today**: *if I stop
   working at 45, what actually happens to my state pension, and is a convenio
   especial worth paying for?* A tool that answers it is differentiated. It is
   also the reason Spain is worth more than the earlier draft credited.

### G4 — Drawdown is a fixed sequence; it needs to respect constraints

Today: ISA → GIA → SIPP, then compute the tax. That works when the only
non-linearity is a gentle taper. It does not work where crossing a threshold
costs a lump sum:

```ts
type PlanConstraint =
  | { kind: "taper";  on: IncomeBucket[]; threshold: number; rate: number }
  | { kind: "cliff";  on: IncomeBucket[]; threshold: number; lossAtThreshold: number }
  | { kind: "step";   on: IncomeBucket[]; steps: { above: number; cost: number }[] }
  | { kind: "floor";  on: IncomeBucket[]; threshold: number };
```

- UK personal-allowance taper → `taper` (already implemented, just generalised).
- Canada OAS clawback → `taper`.
- US ACA premium tax credits → `cliff`. **[verify current figures]**
- US IRMAA → `step`.
- Spain wealth tax → effectively a `step` on assets rather than income, so the
  constraint's `on` needs to admit a net-worth measure as well as income buckets.

The engine's yearly step changes from *"withdraw, then compute"* to *"propose,
evaluate, choose"*. **Not a general optimiser** — a small set of candidate
strategies per year (draw tax-free first; fill to the top of a named band; stay
under a named cliff; take only forced minimums plus the shortfall), each
simulated, each scored on net cost including constraint penalties, best one
kept. Deterministic, explainable in the UI, and testable — all of which a
black-box optimiser would not be.

### G5 — Cost basis is one scalar; Spain and the US need lots

`giaBasis` is a single number consumed pro-rata. Spain mandates **FIFO**, and
has *traspaso*: switching between investment funds **without realising the
gain**, carrying the original cost and acquisition date — **but ETFs are
excluded**, so each ETF sale is a taxable event.
([Rankia](https://www.rankia.com/blog/fondos-inversion/2059196-como-traspasar-fondo-inversion),
[BBVA](https://www.bbva.es/finanzas-vistazo/ef/bolsa/fiscalidad-etf.html))

That is not a rounding difference — it is a first-order reason Spanish investors
hold funds rather than ETFs, and a model that ignores it will overstate Spanish
tax drag badly. The US needs lots too, for tax-loss and tax-gain harvesting.

`Lot[] { units, cost, acquired }` plus a per-country disposal policy
(`fifo` | `specific-id` | `average`), and `traspaso` as a wrapper-level flag.

### G6 — Currency, regions, i18n

Mechanical but not small. `lib/format.ts` is already centralised. Region becomes
a required input for Spain and the US, not optional. Spain forces the first
translation; `Glossary`, `/methodology` and the quiz copy are the bulk of it and
are the easiest part of this whole programme to underestimate.

---

## 4. The shape of the thing

```
lib/
  engine/            country-agnostic: the yearly loop, solvers, constraints,
                     lots, forced flows, the candidate-strategy chooser
  countries/
    types.ts         CountryPack, WrapperSpec, TaxSystem, PlanConstraint
    uk/              wrappers, tax bases, State Pension, regions (rUK, Scotland)
    us/              …
    es/              …
```

```ts
interface CountryPack {
  id: CountryId;
  currency: { code: string; locale: string };
  regions: Region[];
  wrappers: WrapperSpec[];
  taxSystem: (region: Region, filing: FilingStatus) => TaxSystem;
  statePension: (history: ContributionHistory, claimAge: number) => number;
  constraints: PlanConstraint[];
  disposalPolicy: "fifo" | "specific-id" | "average";
  drawdownCandidates: DrawdownStrategy[];
}
```

And in the plan:

```ts
interface FireInputs {
  schemaVersion: 2;
  country: CountryId;
  region: string;
  filingStatus?: FilingStatus;
  wrappers: Record<string, WrapperState>;
  contributionHistory?: ContributionHistory;
  // country-agnostic fields unchanged
}
```

### The migration is not optional

This changes the persisted plan shape, and §3 of `HANDOFF-FIREWORKS.md` exists
because of exactly this hazard. `onfire:plan` in every browser, every `?p=`
share link anyone has sent, and every `portfolios` row holds the v1 flat shape.

`sanitisePlanInput` is already the single choke point all three pass through, so
the migration has one home: read v1, return v2, keep it for several releases.
`lib/identifiers.test.ts` should grow a case pinning the v1 reader, so nobody
deletes it as dead code. Without this, the refactor silently orphans every saved
plan and every shared link.

### Why the refactor is safe to attempt

`lib/fire-engine.test.ts` has ~110 UK-specific assertions. Phase 0 is
behaviour-preserving by definition: the UK pack must reproduce today's numbers
exactly, and that suite is the proof. This is the difference between a refactor
you can verify and one you hope about.

---

## 5. Which is easier — Spain or the US?

**Spain is easier to build. The US is worth more. They share the two hardest
pieces.**

| | Spain | US |
|---|---|---|
| Wrappers | 4, one of them tiny | 8+, plus techniques that matter more than the accounts |
| Tax bases | two, independent — tidy | ordinary + stacked LTCG + surtax + state |
| Jurisdictions | 17 communities | 50 states |
| Pension | contribution history + gap-filling + employee/autónomo | 35-year indexed earnings history |
| Constraints | wealth tax (on assets) | hard subsidy cliff, IRMAA steps |
| Forced withdrawals | none | RMDs |
| Cost basis | FIFO + traspaso (ETFs excluded) | lots + harvesting |
| Filing status | individual/joint, moderate effect | changes every bracket — needs joint plans first |
| i18n | **required** | none |
| Market | small, FIRE not established | largest by far |
| **Relative effort** | **~2×** UK-refactor baseline | **~4×** |

**The interesting part is the overlap.** G3 (history-based pensions), G4
(constraint-aware drawdown) and G5 (lots) are needed by both. Neither country is
1× on its own, but the pair is far less than the sum:

- **US first** → Spain becomes roughly **+1×**, because the hard machinery
  exists and Spain adds mostly data, regions and translation.
- **Spain first** → the US is still roughly **3.5×**, because Spain exercises
  history-based pensions and lots but barely touches cliffs, forced withdrawals
  or filing status.

So **starting with the US is the right call** — which is the one you made —
**provided Phase 0 builds G3, G4 and G5 generically rather than shaped around
the US.** If the refactor hard-codes a cliff because ACA is the only cliff in
view, Spain's wealth tax will not fit and the work gets done twice.

---

## 6. Plan

**Phase 0 — the refactor.** G1, G2, G5, and the *interfaces* for G3 and G4.
`countries/uk` reproduces today's behaviour exactly, proven by the existing
engine suite. `schemaVersion: 2` plus the v1 reader. No user-visible change.
Worth doing on its own merits: it turns "add a country" from a rewrite into a
data change.

**Phase 1 — US research.** The blocker right now. The deep-research run for this
document failed, so **there is currently no verified US data at all**. Needed
before any US code: 2026 contribution limits and phase-outs per account type;
federal brackets and standard deduction; LTCG bracket boundaries and the
stacking rule; NIIT thresholds; the Roth conversion ladder's 5-year seasoning
mechanics; 72(t)/SEPP and Rule of 55; current ACA premium-tax-credit rules and
FPL figures post-expiry of the enhanced credits; the Social Security PIA/AIME
formula and what many zero years actually cost; RMD ages and divisors; IRMAA
tiers. Primary sources — IRS, SSA, CMS — not blog summaries.

**Phase 2 — joint plans.** Already on the backlog independently, and a hard
prerequisite for the US: filing status changes every bracket. Cheaper before the
US pack than during it.

**Phase 3 — the US pack.** Constraint-aware drawdown first, since it is both the
hardest part and the differentiator. Social Security as a user-entered estimate
initially, with an honest note about why — a wrong benefit figure is worse than
an admitted gap.

**Phase 4 — Spain.** Data, regions, FIFO/traspaso, wealth tax, i18n. Lead with
the convenio-especial question (§3), because that is the part no existing tool
answers.

### The trap

Adding a `country` field and a second tax table would ship something called "US
support" within a week, and then the ACA cliff, filing status, RMDs and
conversion ladders would each arrive as a special case bolted onto a model that
cannot express them — by which point the flat wrapper fields are load-bearing in
twice as much code and every saved plan is still v1. **The refactor is cheap now
and expensive after the first foreign country.** Do Phase 0 first even if the
answer to "which country" later turns out to be "neither yet".
