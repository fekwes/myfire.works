# Architecture

This is a deeper walkthrough of [`lib/fire-engine.ts`](../lib/fire-engine.ts), the part of the app worth actually reading. Everything else (`FireForm`, `FireDashboard`, the chart components) is fairly standard React — this file is where the domain logic lives.

## The simulation loop

`simulateFire(inputs)` runs one iteration per age, from `currentAge` to `lifeExpectancyAge` (default 95), and produces a `YearSnapshot[]` — the exact series the dashboard charts render.

Each year falls into one of four phases, purely a function of age:

```
age < retirementAge        → "accumulation"   (still working, contributing, no withdrawals)
age < sippAccessAge (57)   → "bridge"         (retired, drawing the ISA/GIA tax-free)
age < statePensionAge (67) → "sipp"           (drawing the SIPP, taxable)
age >= statePensionAge     → "state-pension"  (SIPP drawdown offset by State Pension)
```

**Accumulation years** just grow each pot (ISA, GIA, SIPP, and any property) by its own growth rate and add annual contributions (`monthlyContribution * 12`) — no withdrawal logic runs.

**Retired years** all go through the same withdrawal waterfall, regardless of which of the three retired phases they're labeled — the phase label is only used for display (which chart region, which color). Concretely, each retired year:

1. Grows both balances by the growth rate.
2. Receives the State Pension (from State Pension age) and subtracts its net value from the target first — guaranteed income offsets pot withdrawals, so the pots only fund the remainder.
3. Withdraws from the ISA (tax-free), then GIA (CGT on gains), then SIPP — but the SIPP is only accessible from the access age, so bridge years must run on ISA/GIA alone (a shortfall if they can't cover it).
4. Applies the chosen pension-access strategy: **gradual (UFPLS)** — 25% of each SIPP withdrawal is tax-free (default); or **lump sum** — the 25% is taken up front and placed in the GIA (it can't fit in an ISA's £20k/yr allowance). Gross withdrawals are solved so the net-of-tax income hits the target (see the gross-up solvers).
5. Records whether the year fell short of the target (`shortfall: true`), which is what the income-safety chart colors red.

## UK income tax

`calculateUkIncomeTax(totalIncome)` implements the 2026/27 rest-of-UK bands:

| Band | Rate |
|---|---|
| Personal allowance (£12,570, tapered above £100k) | 0% |
| Next £37,700 | 20% |
| Up to £125,140 total income | 40% |
| Above £125,140 | 45% |

The tricky part is the **personal allowance taper**: for every £2 of income above £100,000, £1 of the £12,570 allowance is lost, reaching £0 exactly at £125,140. The engine computes the tapered allowance first, then applies the 20/40/45% bands to what's left — with the higher-rate band width computed as `125,140 − personalAllowance − 37,700`, which correctly collapses to the standard bands below £100k and handles the taper region without special-casing it.

This is checked against known figures in `fire-engine.test.ts` — e.g. £110,000 (inside the taper) → £33,432, £200,000 → £76,203, and exactly £125,140 → £42,516 with £0 left in the additional-rate band.

## The gross-up solver

The SIPP phase needs the opposite operation: *"I need £X net after tax, on top of Y in other taxable income (State Pension). How much gross do I have to withdraw?"*

Because the tax function is progressive **and** the personal allowance tapers with total income, there's no simple closed-form inverse — the marginal rate changes as the gross amount changes, and the taper interacts with wherever the other income already sits. Rather than deriving a piecewise inverse by hand (correct, but easy to get subtly wrong and hard to verify by inspection), `solveGrossIncomeForNet` uses **bisection search**:

```ts
const netOf = (gross: number) => {
  const total = otherTaxableIncome + gross;
  return total - calculateUkIncomeTax(total, bands);
};
// binary search for gross such that netOf(gross) === targetNet
```

`netOf` is strictly increasing in `gross` (marginal tax rate is always < 100%), so bisection converges reliably in a fixed 60 iterations — negligible cost, and the correctness of the whole thing rests entirely on `calculateUkIncomeTax`, which is the function that's actually pinned against known values in tests. This is a case where the "boring" numerical approach is more trustworthy than the "clever" algebraic one.

## Testing strategy

`lib/fire-engine.test.ts` (with `coast-fire.test.ts` and `monte-carlo.test.ts`, 48 tests in total) covers, in four groups:

- **Tax function correctness** — `calculatePersonalAllowance` and `calculateUkIncomeTax` against known HMRC figures at several points, including exactly at the taper boundaries.
- **Solver correctness** — `solveGrossIncomeForNet` round-trips through `calculateUkIncomeTax` to confirm the net-of-tax result matches the target within a rounding tolerance.
- **Lump sum** — the 25%-with-cap calculation at both a normal and a large pot size.
- **End-to-end simulation** — accumulation growth, bridge-phase tax-free funding, lump-sum timing, taxable SIPP drawdown under a scenario deliberately sized so the ISA can't cover it, State Pension offset from 67, and both a shortfall case and a fully-sustainable case.

One test originally asserted SIPP drawdown would occur for the app's *default* input values — but with those defaults (£300k ISA, £30k/year target, 5% growth), the ISA legitimately never depletes, so the assertion was wrong, not the engine. The fix was a dedicated fixture (a large target income against a small pot, forcing real SIPP usage) rather than a change to `simulateFire` itself.

## Assumptions & simplifications

Documented here rather than buried in comments, since they materially affect how literally to take the app's numbers:

- **2026/27 rest-of-UK tax rates only.** Scottish income tax bands are different and not modeled.
- **Flat nominal growth, per pot** (default 5%, editable per wrapper), not stochastic in the main projection (the Confidence tab adds Monte Carlo randomness). Inflation is modelled by growing the spending target: the target is quoted in today's money and multiplied by `(1 + inflationRate)^(age − currentAge)` each year (default 2.5%; 0 gives a purely nominal run). Tax bands and the State Pension are held at 2026/27 nominal levels, so fiscal drag falls out naturally. The planner can deflate the projection back to today's money for display.
- **GIA Capital Gains Tax is modelled in a simplified form.** The GIA is a separate, taxable bucket drawn after the ISA: each withdrawal realises a gain proportional to the pot's embedded gain, taxed at 18%/24% above the £3,000 annual exempt amount. Two simplifications: the *starting* GIA balance is assumed to carry no embedded gain (cost basis = current value, so early CGT is understated), and **dividend tax is not modelled**.
- **Contributions stop entirely at the modeled retirement age** — no tapering, no post-retirement part-time income.
- **The tax-free lump sum is taken as a single event** at `max(retirementAge, sippAccessAge)`, not phased across multiple withdrawals (which some real SIPP providers support and which can have different practical tax timing implications).
- **State Pension amount is a fixed default** (£12,547.60/year — the 2026/27 full new State Pension, £241.30/week) — it doesn't account for incomplete National Insurance records, which reduce the actual entitlement. It offsets pot withdrawals rather than being surplus income.
- **95-year fixed life expectancy horizon** — no mortality modeling, no partner/joint planning.

None of these are hidden — `DEFAULT_ASSUMPTIONS` in `fire-engine.ts` is the single place they're all defined, and every one is a `FireInputs` field with a sensible default rather than a hardcoded constant, so they're overridable if you want to stress-test different assumptions.
