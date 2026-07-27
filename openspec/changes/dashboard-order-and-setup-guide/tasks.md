## 1. Bisection cost baseline (land first, on its own)

- [ ] 1.1 Measure and record the current keystroke-to-paint cost of typing in Quick levers on a representative plan (non-zero balances, property, holdings), so D5's mitigations can be judged against a number rather than a feeling.
- [ ] 1.2 In `lib/fire-number.ts` and `lib/what-if.ts`, cut the fixed bisection loops (44 and 40 iterations) to 26 with an early exit at `hi - lo < 1`.
- [ ] 1.3 Run `npm test` with the existing `fire-number.test.ts` / `what-if.test.ts` expectations **unchanged** — any drift here is a real precision regression, not a test to update.
- [ ] 1.4 Re-measure 1.1 and record the delta. Commit alone.

## 2. Bridge / pension engine solves

- [ ] 2.1 Add `lib/bridge.ts` with a `bridgeYears(inputs)` helper returning the `[retirementAge, sippAccessAge)` span, clamped to zero when `retirementAge >= sippAccessAge`.
- [ ] 2.2 Implement the stage-1 bridge-leg bisection: run from `retirementAge` with contributions zeroed, SIPP at 0, target pre-inflated via `inflatedTargetAt`, ISA:GIA split in the plan's current ratio; return the smallest pot with no `shortfall` year before `sippAccessAge`.
- [ ] 2.3 Implement the stage-2 pension-leg bisection: bridge pot fixed at the 2.2 answer, bisect SIPP for `sustainableToLifeExpectancy` across the full run.
- [ ] 2.4 Rework `computeFireNumber` so `fireNumber = bridgeRequired + pensionRequired`, and add `bridgeRequired`, `pensionRequired` and `bridgeGap` to `FireNumberResult`. Keep `surplus` and `onTrack` comparing `projectedAtRetirement` against the new total.
- [ ] 2.5 Implement `sustainableIncomeFromPots(inputs)` in `lib/bridge.ts` — the two independent level-income bisections of D2 (bridge leg and pension leg), plus their minimum as the headline.
- [ ] 2.6 Export `minMonthlyForSustainable` from `lib/what-if.ts` and add `requiredContributions(inputs)` returning total, extra-above-current, and the extra's ISA/GIA and SIPP split, directing the extra to the bridge pots first while `bridgeGap > 0`.
- [ ] 2.7 Handle the zero-length-bridge case in every function above: bridge figures are zero or absent, the whole requirement lands on the pension.
- [ ] 2.8 Handle the unreachable case in `requiredContributions`: return `null` for the amount rather than `Infinity`.

## 3. Engine tests

- [ ] 3.1 Test that `bridgeRequired + pensionRequired === fireNumber` to within rounding, across a spread of plans, and that neither component is negative.
- [ ] 3.2 Test the bridge feasibility contract directly: at `bridgeRequired` the ISA/GIA pots survive to `sippAccessAge`; just below it they do not.
- [ ] 3.3 Test that the new two-stage `fireNumber` is less than or equal to the old fixed-proportion answer across that same spread — the direction argued in D1, asserted rather than assumed. Investigate any plan that fails as a bridge-leg bug.
- [ ] 3.4 Test `sustainableIncomeFromPots`: the headline is the minimum of the two legs; a plan whose sustainable income meets its target is also `sustainableToLifeExpectancy`.
- [ ] 3.5 Test `requiredContributions`: zero extra when already on track; a finite split when a shortfall is closable; `null` when it is not; bridge-first direction when `bridgeGap > 0`.
- [ ] 3.6 Test zero-length-bridge behaviour (`retirementAge >= sippAccessAge`) across all three new solves.
- [ ] 3.7 Parameterise `sippAccessAge` and `statePensionAge` across the new tests and assert the figures move with them — no test may hardcode 57 or 67, because the concurrent onboarding change makes both age-derived (design D6b).

## 4. Setup guide rewrite

- [ ] 4.1 Reduce `buildChecklist` to the three data-derived steps and change its signature to `(inputs, signedIn, authConfigured)`; drop the always-done "Plan created" step and omit "Save your plan" entirely when `authConfigured` is false.
- [ ] 4.2 Delete `CHECKLIST_FLAG_KEYS`, `CHECKLIST_FLAGS_EVENT`, `ChecklistFlagKey`, `ChecklistFlags`, `readChecklistFlags` and `setChecklistFlag` from `lib/checklist.ts`.
- [ ] 4.2b Remove the two now-dangling pins from `lib/identifiers.test.ts` and record the retired keys in its doc comment; leave the `PLAN_STORAGE_KEY` and `PROFILES_TABLE` pins untouched (design D6).
- [ ] 4.3 Remove the `setChecklistFlag` call site in `components/ConfidencePanel.tsx`.
- [ ] 4.4 Remove the `setChecklistFlag` call site in `components/FireForm.tsx` — the line that made "Set your withdrawal style" untickable by reviewing.
- [ ] 4.5 Rewrite `PlanChecklist` against the new API: pass `configured` from `useAuth()`, render whenever a step is outstanding (including while provisional), and return `null` once every step is done.
- [ ] 4.6 Move dismissal to `sessionStorage` and add a compact "Show setup guide" control on the dashboard for the dismissed state.
- [ ] 4.7 Rewrite `lib/checklist.test.ts`: zero complete on a fresh quiz plan; balances and funds complete from plan data; save step absent when auth is unconfigured and the guide still reaches completion; completion survives cleared local storage.

## 5. Overview panel

- [ ] 5.1 Extract the north-star card out of `FireDashboard` into an `Overview` component, carrying over the verdict, money-frame toggle, FIRE number block and stat tiles unchanged, and drop the now-duplicated provisional "add your balances" link that the setup guide covers.
- [ ] 5.2 Add the *What it takes* block: extra monthly needed with its ISA/GIA and SIPP split, the unreachable case, and the two `retirementSensitivity` lines folded in.
- [ ] 5.3 Extend the FIRE number block with its bridge and pension components, and give `bridgeGap > 0` a visible treatment (decide the form against the rendered panel — design Open Question 3).
- [ ] 5.4 Add the *What today's pots buy* block: headline sustainable income plus the bridge and pension legs; suppress rather than show £0 when every balance is zero.
- [ ] 5.5 Apply the money-frame toggle to every new future-dated figure and verify the bridge and pension components still sum to the displayed total in both frames.
- [ ] 5.6 Check the whole Overview reads at a glance at mobile width — this is an acceptance condition of 5.1–5.5, not a follow-up.

## 6. Dashboard reorder

- [ ] 6.1 Delete `components/WhatIfCard.tsx` and its import, keeping `lib/what-if.ts`.
- [ ] 6.2 Reorder `FireDashboard` to: status ribbon → setup guide → Quick levers → Projection → Overview → disclaimer.
- [ ] 6.3 Add the one-line status ribbon with its verdict tones and an anchor to the Overview; mark it `no-print`.
- [ ] 6.4 Confirm the read-only `?p=` path still omits Quick levers, the setup guide and plan actions, and that the "Make it mine" banner still sits above everything.
- [ ] 6.5 Confirm the `?tab=` / `#confidence` deep-link still opens the Confidence tab and scrolls the Projection card into view now that it has moved up the page.

## 7. Performance

- [ ] 7.1 Route the derived-figure computations through `useDeferredValue` on the plan inputs, leaving `QuickLevers` and the charts on the live value.
- [ ] 7.2 Give each solve its own `useMemo` keyed on the deferred inputs, so chart-tab switches and money-frame toggles re-solve nothing.
- [ ] 7.3 Re-measure keystroke-to-paint against the 1.1/1.4 baseline. If it has not held, stop and scope the Web Worker escape hatch rather than shipping a janky first module.

## 8. AI tips auto-run

- [ ] 8.1 Extract the `/api/analyze` payload construction in `AiInsights` into a function returning both the payload and a stable signature hash of it.
- [ ] 8.2 Add a `sessionStorage` cache under `fireworks:ai-tips:<signature>`, read before any request.
- [ ] 8.3 Auto-run on mount for a cache miss, only when the plan is non-provisional, not shared, and unedited since load; guard concurrent calls with an in-flight ref so a StrictMode double-mount produces one request.
- [ ] 8.4 On an input change, mark cached tips stale and show a refresh control — never auto-fire for an edited plan.
- [ ] 8.5 Add module-level session suppression for 503 (not configured) and quota-exhausted responses, using `lib/ai-errors.ts` to classify rather than string-matching; keep transient failures manually retryable.
- [ ] 8.6 Add the `NEXT_PUBLIC_AI_TIPS_AUTORUN` gate, defaulting to on, and document it in `.env.local.example`.
- [ ] 8.7 Verify in the browser that a fresh dashboard load issues exactly one `/api/analyze` request, and that a tab switch, money-frame toggle and navigate-away-and-back issue none.

## 9. Docs and verification

- [ ] 9.1 Document the two-stage FIRE number, the bridge/pension definitions and the drawdown baseline on `/methodology` — this ships in the same commit as the redefinition, not after it.
- [ ] 9.2 Update `docs/ARCHITECTURE.md` with the bridge/pension solves and their monotonicity assumptions.
- [ ] 9.3 Update `docs/HANDOFF-FIREWORKS.md`: mark the two checklist flag keys and `onfire:flags` as retired (leave the rows, do not delete them), and note the new `sessionStorage` keys.
- [ ] 9.4 Update `docs/DESIGN.md` with the new dashboard order and the revised `.no-print` inventory.
- [ ] 9.5 Update `docs/README.md`'s index if any document's status changes.
- [ ] 9.6 Quality gate: `npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build`; then verify the dashboard in the browser in both themes and at 375px, across provisional, complete, shared `?p=` and signed-out states, and print-preview one plan.
