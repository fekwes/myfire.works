# fire-engine

## Purpose

Model a UK FIRE plan year by year: grow the pots, fund a spending target from
them in a fixed order, and pay the UK tax that is actually due. Every number the
app shows — the dashboard, the FIRE number, Coast FIRE, Monte Carlo, the shared
link — is derived from this one simulation.

This spec is a baseline, written from behaviour already pinned by
`lib/fire-engine.test.ts`, `coast-fire.test.ts` and `monte-carlo.test.ts`. The
modelling *assumptions* — which simplifications are accepted, and why — live in
`docs/ARCHITECTURE.md`; this file states what the engine must do.

## Requirements

### Requirement: Deterministic projection

The engine SHALL produce identical output for identical input, with no
dependence on wall-clock time, network, or randomness.

#### Scenario: Same input, same output
- **WHEN** `simulateFire` is called twice with equal `FireInputs`
- **THEN** the two `YearSnapshot[]` results are equal

#### Scenario: Returns come from asset class, never from a model
- **WHEN** a wrapper defines holdings
- **THEN** its growth is derived from each holding's `assetClass` return, net of fees
- **AND** no per-fund figure or LLM-supplied number contributes to the projection

#### Scenario: A shared link reproduces the plan
- **WHEN** a plan is encoded into a `?p=` link and decoded again
- **THEN** simulating the decoded inputs yields the same projection as the original

### Requirement: Non-empty timeline

The projection SHALL always contain at least one year, whatever the caller
supplies.

#### Scenario: Plan end age below current age
- **WHEN** `lifeExpectancyAge` is less than `currentAge`
- **THEN** the end age is floored at `currentAge`
- **AND** the result contains at least one `YearSnapshot`
- **AND** consumers reading "the pot at retirement" do not receive `undefined`

### Requirement: Age-driven phases

Each year SHALL be labelled with exactly one phase, determined only by age.

#### Scenario: Phase boundaries
- **WHEN** age is below `retirementAge`
- **THEN** the phase is `accumulation`
- **WHEN** age is at or above `retirementAge` but below `sippAccessAge`
- **THEN** the phase is `bridge`
- **WHEN** age is at or above `sippAccessAge` but below `statePensionAge`
- **THEN** the phase is `sipp`
- **WHEN** age is at or above `statePensionAge`
- **THEN** the phase is `state-pension`

#### Scenario: The label does not change the maths
- **WHEN** a year is a retired year
- **THEN** the same withdrawal waterfall runs regardless of which retired phase labels it

### Requirement: Accumulation years

Working years SHALL grow the pots and add contributions, and SHALL NOT withdraw.

#### Scenario: Contributions applied
- **WHEN** a year's phase is `accumulation`
- **THEN** each pot grows by its own growth rate
- **AND** `monthlyContribution * 12` is added
- **AND** no withdrawal is taken

### Requirement: Withdrawal waterfall

Retired years SHALL fund the target from ISA first, then GIA, then SIPP.

#### Scenario: Order is fixed
- **WHEN** a retired year needs income
- **THEN** the ISA is drawn first, tax-free
- **AND** the GIA is drawn next, realising CGT on the gain portion
- **AND** the SIPP is drawn last

#### Scenario: SIPP is locked before its access age
- **WHEN** a retired year falls before `sippAccessAge`
- **THEN** no SIPP withdrawal is taken
- **AND** a year the ISA and GIA cannot cover is recorded with `shortfall: true`

### Requirement: Guaranteed income offsets the target

Income that arrives regardless of the pots SHALL reduce what the pots must fund,
rather than being treated as surplus.

#### Scenario: State Pension reduces the draw
- **WHEN** age is at or above `statePensionAge`
- **THEN** the State Pension's net value is subtracted from the target first
- **AND** the pots fund only the remainder

#### Scenario: Rental and part-time income
- **WHEN** rental income or part-time earnings apply in a year
- **THEN** they are taxable, and offset the target the same way

### Requirement: UK income tax, 2026/27 rest-of-UK

Tax SHALL be computed against the 2026/27 rest-of-UK bands, including the
personal-allowance taper.

#### Scenario: Allowance tapers above £100,000
- **WHEN** total income exceeds £100,000
- **THEN** £1 of the £12,570 allowance is withdrawn per £2 of excess
- **AND** the allowance reaches exactly £0 at £125,140

#### Scenario: Verified against known figures
- **WHEN** total income is £110,000
- **THEN** the tax due is £33,432
- **WHEN** total income is £200,000
- **THEN** the tax due is £76,203

### Requirement: Gross-up solver

Given a required net income, the engine SHALL find the gross withdrawal that
produces it.

#### Scenario: Round-trip
- **WHEN** `solveGrossIncomeForNet` returns a gross figure for a target net
- **THEN** taxing that gross and subtracting yields the target net within rounding tolerance

#### Scenario: Converges across the taper
- **WHEN** the required gross straddles the £100k–£125,140 taper region
- **THEN** the solver still converges, without a special case

### Requirement: Pension access strategy

The engine SHALL support both ways of taking the 25% tax-free entitlement.

#### Scenario: Gradual (UFPLS), the default
- **WHEN** the strategy is gradual
- **THEN** 25% of each SIPP withdrawal is tax-free, subject to the remaining allowance

#### Scenario: Lump sum
- **WHEN** the strategy is lump sum
- **THEN** the tax-free amount is taken once at `max(retirementAge, sippAccessAge)`
- **AND** it is capped at `TAX_FREE_LUMP_SUM_CAP` (£268,275)
- **AND** the cash lands in the GIA, never the ISA

### Requirement: Inflation in real terms

The spending target SHALL be quoted in today's money and grown to nominal terms,
while tax thresholds stay fixed so fiscal drag emerges naturally.

#### Scenario: Target grows, bands do not
- **WHEN** `inflationRate` is above zero
- **THEN** the target at a given age is the today's-money target compounded from `currentAge`
- **AND** income-tax bands remain at 2026/27 nominal levels

#### Scenario: State Pension keeps its real value
- **WHEN** the projection inflates the target
- **THEN** the State Pension is grown by the same factor

#### Scenario: Sub-simulations agree
- **WHEN** `fire-number` or `coast-fire` runs
- **THEN** it pre-inflates the target via `inflatedTargetAt`, so its verdict matches the main projection
