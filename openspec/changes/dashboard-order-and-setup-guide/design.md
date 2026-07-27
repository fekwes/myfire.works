## Context

`/planner` renders one component, [FireDashboard.tsx](components/FireDashboard.tsx), which owns the module order, the north-star card, the money-frame toggle and the chart tab state. Everything below it is a leaf: `PlanChecklist`, `QuickLevers`, `WhatIfCard`, the three chart panels, `AiInsights`.

All plan state flows from `usePlan()` and every derived figure is recomputed synchronously in `useMemo` on `inputs`. Two of those figures are bisections over the whole simulation:

- `computeFireNumber` ([lib/fire-number.ts:38](lib/fire-number.ts:38)) — 44 iterations plus a doubling probe, each running a full `simulateFire`.
- `retirementSensitivity` ([lib/what-if.ts:56](lib/what-if.ts:56)) — two 40-iteration bisections, one per direction.

`QuickLevers` writes on every keystroke (`NumberInput` commits per change, a property PR #12 deliberately hardened the engine against), so the current page already runs roughly 130 simulations per keystroke. This change adds three more bisections and moves `QuickLevers` to the top of the page, where it will be typed into more. Performance is the technical centre of this design, not an afterthought.

The engine already models the bridge as a first-class phase: `FirePhase` is `"accumulation" | "bridge" | "sipp" | "state-pension"`, and `YearSnapshot` carries per-wrapper withdrawals and a `shortfall` flag. The new figures are solves over the existing engine, not new engine behaviour.

## Goals / Non-Goals

**Goals:**

- Reorder the dashboard to levers → projection → overview, without losing the verdict above the fold.
- Give the Overview three answers it does not have today — extra monthly needed, the FIRE number's bridge/pension shape, and what today's pots would buy — each split bridge vs pension, each derived from the existing engine.
- Make the setup guide completable, and make it appear when it is useful rather than after the fact.
- Run the AI tips once automatically without turning every dashboard view into a paid API call.
- Keep typing in Quick levers responsive despite roughly doubling the derived-figure workload.

**Non-Goals:**

- No change to the drawdown engine's behaviour. Every new figure is a solve over `simulateFire` as it stands.
- No Web Worker. Named as the escape hatch if the deferred-value approach proves insufficient, not built here.
- No generalisation to non-UK wrappers. The bridge/pension split is written in ISA/GIA/SIPP terms and will be re-expressed as wrapper roles during the multi-country Phase 0 refactor.
- No redesign of the Projection card or the chart tabs.

## Decisions

### D1. Bridge and pension are solved in two stages, and the FIRE number becomes their sum

The existing `computeFireNumber` bisects a single total pot held in the plan's *current* proportions. That total cannot be decomposed after the fact — splitting it by the same proportions would produce a bridge figure that does not actually fund the bridge years, which is exactly the number the user asked for.

Solve instead in two stages, both bisecting on the existing engine's monotonicity in starting balance:

1. **Bridge leg.** Run from `retirementAge` with contributions zeroed, SIPP set to 0, and the target pre-inflated with `inflatedTargetAt(inputs, retirementAge)` — the same guard `computeFireNumber` already uses so shifting `currentAge` does not reset the inflation baseline. Bisect the ISA+GIA pot (split in the plan's current ISA:GIA ratio) for the smallest amount where **no year in `[retirementAge, sippAccessAge)` reports `shortfall`**. Years after access age are ignored in this leg.
2. **Pension leg.** Hold the bridge pot at the stage-1 answer and bisect the SIPP for the smallest amount where `sustainableToLifeExpectancy` is true across the whole run.

`fireNumber = bridgeRequired + pensionRequired`, which satisfies the spec's "must add up" requirement by construction.

*Alternative rejected:* solve the two legs independently (pension leg from `sippAccessAge` with zero bridge). It is one fewer dependency but double-counts — a bridge pot that survives past access age would be ignored, inflating the pension figure and breaking the sum against the honest total.

**This redefines the headline FIRE number.** The two-stage answer is the minimum over feasible allocations, so it should be less than or equal to today's fixed-proportion answer; plans move towards on-track, never away. "Should be" is not "is" — CGT interacts with the GIA non-linearly, so `lib/fire-number.test.ts` MUST gain an assertion comparing the two across a spread of plans rather than assuming it. If a plan is found where the two-stage answer is larger, that is a bug in the bridge leg's feasibility check, not an acceptable result.

`surplus` and `onTrack` keep their meaning and compare `projectedAtRetirement` against the new total. `computeFireNumber` also gains a `bridgeGap` field — `bridgeRequired − projected ISA/GIA at retirement`, floored at zero — so the Overview can flag the specific failure the total hides: enough money overall, too much of it locked in a pension you cannot reach at 55.

The verdict itself does **not** move to the FIRE number. `sustainableToLifeExpectancy` from the real simulation stays authoritative, as it is today — it is the one figure that runs the actual plan with actual contributions. Introducing a second verdict from the FIRE-number comparison is how the two would drift apart.

### D2. "What today's pots buy" is two level-income solves, reported as a pair plus their minimum

The user's ask — "how much you could drawdown as income with the current pots, splitting bridge and pensions" — has an ambiguity worth settling explicitly: *drawdown starting when?* This design uses **today's balances, grown to `retirementAge` with no further contributions**. That keeps every Overview figure quoted at the same moment in time and answers the Coast FIRE question the page already gestures at ("you could stop contributing now"). See Open Questions for the alternative.

The split is not a division of one number. A level target is funded by different pots in different phases, so solve each leg for the level net income it can sustain on its own:

- **`bridgeIncome`** — the largest level net annual income the current ISA+GIA, grown to `retirementAge`, sustains across `[retirementAge, sippAccessAge)`.
- **`pensionIncome`** — the largest level net annual income the current SIPP, grown to `sippAccessAge`, plus the State Pension from `statePensionAge`, sustains from `sippAccessAge` to `lifeExpectancyAge`.
- **Headline** — `min(bridgeIncome, pensionIncome)`: the level income the plan sustains end to end.

Both legs bisect on `targetAnnualIncome`, which the engine is monotonically worse in. Reporting the two legs beneath the headline is the point of the feature: it makes an imbalance legible ("your bridge supports £40k/yr but your pension only £22k/yr") in a way a single number cannot. Where the bridge is zero years, `bridgeIncome` is not defined and only the pension leg is shown.

### D3. Required monthly contribution reuses the existing bisection, generalised

`minMonthlyForSustainable` ([lib/what-if.ts:9](lib/what-if.ts:9)) already computes exactly the total needed; it is private and splits in the plan's current ISA:SIPP proportions. Export it, and add `requiredContributions(inputs)` returning total, extra-above-current, and the extra's ISA/GIA and SIPP components.

The split of the *extra* follows the same current-proportions rule as today, with one change: where `bridgeGap > 0`, the extra is directed to the bridge pots first until the gap closes, then split proportionally. Sending new money to a SIPP when the failure is a bridge shortfall would be advice-shaped and wrong.

Where the plan is unreachable at any contribution level the function returns `null` for the amount, and the UI says so rather than rendering `Infinity` — the existing `WhatIfCard` already handles this case correctly and that handling carries over.

### D4. `WhatIfCard` is deleted; `retirementSensitivity` survives inside the Overview

The retire-a-year-earlier/later trade-off is the strongest content on the current page — it is the only place that quantifies a decision rather than restating a state. But it occupies a full card for two figures, and now sits directly beside a block answering the closely related "what would it take". Delete the component, keep `lib/what-if.ts`, and render its two outputs as compact lines under the Overview's *What it takes* block.

*Alternative rejected:* delete the calculation too. It costs two bisections per render, which is real, but the trade-off it expresses is not derivable from anything else on the page.

### D5. Performance: defer the derived figures, do not debounce the input

Roughly 300 simulations per keystroke after this change. Three mitigations, in order of leverage:

1. **`useDeferredValue` on the inputs feeding derived figures.** `QuickLevers` keeps writing per keystroke so the input and the chart stay live; the Overview's bisections read a deferred copy and lag by a frame under load. This is the whole fix for perceived responsiveness and it costs a few lines.
2. **Cut wasted bisection iterations.** 44 and 40 fixed iterations bisect far past penny precision — about 21 halvings covers a £2M range to £1. Reduce to 26 with an early exit at `hi - lo < 1`. Roughly halves the simulation count across every solve, with no visible change in any figure. This should land as its own commit with the existing tests unchanged, so any drift is attributable.
3. **One `useMemo` per solve, keyed on the deferred inputs**, so switching chart tabs or toggling the money frame does not re-solve anything.

*Alternative rejected:* debouncing `QuickLevers`. It would stop the chart tracking the input, which is the reason Quick levers is being promoted to the top of the page.

The escape hatch, if this is not enough: move the solves into a Web Worker behind a promise-returning façade. Explicitly not built now — it would be the first worker in the codebase and brings its own bundle and lifecycle cost.

### D6. Setup guide: three data-derived steps, session-scoped dismissal

`buildChecklist` reduces to steps whose completion is a fact about the plan:

| Step | Complete when |
| --- | --- |
| Add your real balances | any of ISA / GIA / SIPP balance > 0 |
| Choose your funds | any wrapper has holdings |
| Save your plan | signed in — **omitted entirely when `configured` is false** |

`buildChecklist(inputs, signedIn, authConfigured)` — the `ChecklistFlags` parameter and the whole flag API go. `"Plan created"` goes with them: a step that is `done: true` by construction is decoration that inflates progress.

**This collides with a deliberate CI guard and the collision is resolved, not worked around.** `openspec/config.yaml` lists `onfire:flag:*` and the `onfire:flags` event among identifiers that must never be renamed, and `lib/identifiers.test.ts` fails CI on a rename. Reading that test's own rationale: the guard exists because these names are "a key into data that already exists", and a rename "would silently orphan every saved plan and profile". That reasoning is about *user data*. `onfire:plan` and `portfolios` hold user data; these two flags hold a boolean meaning "this browser once clicked Run". Removing the feature orphans a value no user would miss, and a guard over an identifier that no code reads guards nothing. So the two pins are deleted alongside the feature, and the test's doc comment gains a line recording the two keys as retired — left in browsers, never read again. The `PLAN_STORAGE_KEY` and `PROFILES_TABLE` pins stay exactly as they are.

*Alternative rejected:* keep the constants exported but unused, purely to keep the test compiling. It leaves dead code whose only purpose is to satisfy an assertion about itself.

Gating changes: the guide renders whenever a step is outstanding, **including while provisional** — that is when "add your balances" is the whole point — and unmounts when all steps are done. The provisional-state north-star copy in `FireDashboard` currently carries its own "add your balances" ask; that duplicate goes, since the guide now covers it.

Dismissal moves from `localStorage` to `sessionStorage`, and the dashboard keeps a small "Show setup guide" control while dismissed. The current one-way `onfire:checklist-dismissed` key is left in place and simply unread — no migration, and a user who dismissed once is not punished for it.

`setChecklistFlag` call sites at [ConfidencePanel.tsx:156](components/ConfidencePanel.tsx:156) and [FireForm.tsx:650](components/FireForm.tsx:650) are removed. The `FireForm` one is the interesting deletion: it is the line that made "Set your withdrawal style" untickable-by-reviewing, and its removal is the fix.

### D6b. Staying out of the concurrent onboarding change's way

`revamp-onboarding-and-plan-defaults` is being planned against the same repo and touches two things this change reads:

1. **It will estimate `sippAccessAge` and `statePensionAge` from the user's age** rather than using flat defaults of 57 and 67. `sippAccessAge` is the exact boundary that defines the bridge, so every solver here reads it from the resolved inputs — which `resolveInputs` already guarantees — and **no test in this change may hardcode 57 or 67**. Tests parameterise the access age and assert the figures move with it. A rising access age also makes the zero-length-bridge case commoner, which is why it is specified rather than treated as an edge case.
2. **It will relabel the money-frame toggle** ("Future £" reads as jargon). This change consumes `realTerms` and adds no wording to the toggle. The Overview's new figures inherit whatever labels that change lands.

Beyond those, overlap is confined to `FireDashboard.tsx`. The onboarding change owns the quiz, `DEFAULT_ASSUMPTIONS`, the plan-import flow and the income chart; this change owns the dashboard's module order and the Overview. Neither needs the other to land first.

Worth noting for whoever sequences them: that change adds a second Gemini-backed feature (natural-language plan import) on the same unbilled key this change starts auto-calling. The endpoints have separate limiters, but the provider quota is shared.

### D7. AI tips: cache by input signature, suppress by session, gate by env

The endpoint is capped at 5/min and 40/day per IP with a 500/day global backstop ([app/api/analyze/route.ts](app/api/analyze/route.ts)), against a Gemini key with no billing. Auto-running is only safe with all four of these:

1. **Signature cache.** Hash the exact payload sent to `/api/analyze` — the same field list `AiInsights` already builds, rounded as it already rounds. Store results in `sessionStorage` under `fireworks:ai-tips:<signature>`. Same plan, same session, zero requests.
2. **Auto-run only on a cache miss for a plan the user has not edited since load.** Editing marks the cached tips stale and offers a refresh button; it never auto-fires. Without this, typing `2` `5` `0` `0` into a Quick levers field is four plans and four auto-runs.
3. **Module-scoped suppression.** A 503 (not configured) or a 429/quota response sets a module-level flag — not component state — so it survives remount and navigation. `lib/ai-errors.ts` already distinguishes quota exhaustion from failure; reuse it rather than string-matching.
4. **`NEXT_PUBLIC_AI_TIPS_AUTORUN`**, defaulting to on, so auto-run can be killed from Vercel without a deploy.

An in-flight `useRef` guard prevents concurrent requests; a `StrictMode` double-mount must not produce two calls, which the signature cache plus the in-flight guard together handle.

*Alternative rejected:* server-side caching keyed by plan hash. Better for the quota, but it needs a shared store — the same dependency the deferred rate-limiting work is waiting on — and it is the wrong order to add one for this.

### D8. Status ribbon

Reordering puts the verdict below two large modules. A one-line ribbon at the top carries the verdict ("On track" / "There's a shortfall" / "Provisional") with an anchor to the Overview. It is `no-print` — the printed sheet has the Overview in full.

This is the one piece of the layout not explicitly requested. It exists because "on track or not" is the page's single most important output and the requested order buries it; it is deliberately one line so it does not become a second north-star card. Easy to cut in review if it reads as clutter.

## Risks / Trade-offs

- **The FIRE number changes for every existing user.** → It moves down (a less demanding target) and only because the previous number assumed a suboptimal allocation. `/methodology` must document the two-stage definition in the same commit, and `lib/fire-number.test.ts` must assert the direction across a spread of plans rather than trusting the argument.
- **Bridge-leg feasibility is defined by "no `shortfall` flag before `sippAccessAge`", and `shortfall` is the engine's flag, not a fresh definition.** → If the engine's flag ever means something subtler than "could not fund the target this year", the bridge figure silently changes meaning. Pin the behaviour with a test that asserts the ISA/GIA pots survive to `sippAccessAge` at the returned figure and fail below it.
- **Three more bisections on a page whose first module is a text input.** → D5. Land the iteration-count cut first and measure the keystroke-to-paint cost before and after on a representative plan; if `useDeferredValue` does not hold it, the Web Worker escape hatch is scoped but unbuilt.
- **Auto-running AI tips burns a free-tier quota faster than a button ever did.** → Four independent guards (D7), each of which alone prevents the runaway case. The global 500/day backstop remains the last line, and a 429 now reads as "off for now" rather than an error.
- **Removing the `WhatIfCard` and two checklist steps removes things a user may have valued.** → The what-if figures survive in the Overview. The two dropped steps were unreachable-by-following in practice, so what is lost is a progress bar that never filled.
- **The Overview grows into the heaviest card on the page** — verdict, what-it-takes, FIRE number with split, drawdown with split, stat tiles. → Land it as a sequence of blocks with the existing `StatTile`/`MonoLabel` vocabulary, and treat "does this still read at a glance on mobile" as an acceptance check, not a follow-up.

## Migration Plan

No data migration. Plan shape, the `?p=` share encoding, and saved Supabase rows are untouched; every new figure is derived.

Two stale keys are left in local storage and simply never read again — `onfire:flag:confidence-run` and `onfire:flag:withdrawals-viewed`, plus `onfire:checklist-dismissed`. Removing them would need a cleanup pass on load for no benefit. `docs/HANDOFF-FIREWORKS.md`'s key table should mark them as retired rather than deleting the rows, so a future reader who finds them in a browser knows what they were.

Rollback is per-commit: the ordering, the Overview figures, the setup guide and the AI auto-run are independent and land as separate commits, per the repo's commit-per-stage convention.

## Open Questions

1. **Drawdown baseline.** D2 quotes "what today's pots buy" at `retirementAge` with contributions stopped. The alternative reading is *retire today* — balances as they are, drawing from now. That is a different and arguably more visceral number ("you could stop working now on £14k/yr"). Quoting at `retirementAge` was chosen for consistency with every other Overview figure; worth one look at the rendered panel before committing to it.
2. **Does the status ribbon survive review?** D8 adds a module the request did not ask for. If the Overview reads well enough on mobile at position three, the ribbon is redundant.
3. **`bridgeGap` presentation.** The "enough money, wrong pots" case is the most valuable thing the split exposes and there is no obvious home for it yet — a tone on the bridge figure, or its own line in *What it takes*. Decide against the rendered panel.
