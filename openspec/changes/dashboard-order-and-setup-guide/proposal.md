## Why

The dashboard opens with a verdict the user cannot act on, and buries the controls that change it. The reading order is Setup guide → Overview verdict → Quick levers → What-if → Projection, so someone who disagrees with "There's a shortfall" scrolls past three cards to reach a number they can move.

The Overview is also thin on the answers this audience wants. It gives one FIRE number and one "on course for" figure, and never says *how much more per month*, never splits the target into the **bridge** (ISA/GIA, spent between retiring and pension access) and the **pension** (SIPP, from `sippAccessAge`), and never inverts the question — "what income would today's pots actually buy?" The engine already models all three: `FirePhase` has had a first-class `bridge` phase since the beginning, and the `fire-engine` spec pins the boundary behaviour these figures depend on.

**What degrades if this is not done:** the setup guide is broken now, not hypothetically. Two of its six steps cannot be completed by doing what they say, so for most users it never reaches "all done" and the progress bar is a permanent reproach:

- **"Set your withdrawal style"** ticks only from `setChecklistFlag("withdrawals")` inside `PensionStrategyToggle`'s `onChange` (`components/FireForm.tsx`). Reviewing the page does nothing. A user who wants the default (`gradual`) must switch to lump-sum and back — mutating their plan — to tick a box.
- **"Save your plan"** requires `signedIn`, but `AuthProvider` also exposes `configured`. Where Supabase is not configured the step is unreachable and the guide is permanently stuck, which contradicts the project rule that every optional service degrades gracefully.

It is also mis-scoped: it is hidden while `provisional` (`netWorth === 0`), which is exactly when its highest-value step — "Add your real balances" — applies, so the card only appears *after* its most important step is already done. "Plan created" is hardcoded `done: true`, so progress opens at 1/6 for doing nothing, and dismissal is one-way forever.

## What Changes

**Dashboard module order** — Quick levers → Projection → Overview, as requested. A one-line status ribbon stays pinned at the top so the verdict is not lost below the fold.

**Overview gains three answers**, each split bridge vs pension:
- *What it takes* — extra monthly contribution needed to make the plan sustainable at the current retirement age, split into ISA/GIA and SIPP. Absorbs the retire-a-year-earlier/later trade-off.
- *Your FIRE number* — total, plus how much must sit in the bridge pots and how much in the pension, as a decomposition that adds up.
- *What today's pots buy* — the sustainable net annual income current balances support with no further contributions, split into the bridge years and the pension years.

**`WhatIfCard` is removed as a standalone card.** Its content is the best trade-off on the page but does not earn a card for two numbers, and it overlaps the new *What it takes* block. `lib/what-if.ts` is kept and its outputs move into the Overview.

**Setup guide is retargeted, not deleted.** Three steps, each derived from plan data: balances, funds, and — only when auth is configured — saving. It renders **while provisional**, unmounts once every step is genuinely done, and dismisses for the session with a way back. The two engagement steps go: they measured engagement dressed as setup.

**BREAKING — the checklist engagement-flag API is removed**, along with its two call sites. This needs care, because `openspec/config.yaml` lists `onfire:flag:*` and the `onfire:flags` event among identifiers that "must never be renamed", pinned by `lib/identifiers.test.ts`. That guard exists to stop a *rename* silently orphaning data that already exists. These two keys hold a boolean meaning "this browser once clicked Run" — removing the feature orphans nothing a user would miss, and a guard over an identifier no code reads guards nothing. The two pins are therefore removed with the feature, deliberately, and the keys are recorded as retired rather than quietly forgotten. `onfire:plan` and `portfolios` — the pins that do protect user data — are untouched.

**AI strategy tips run once automatically** on a non-provisional, non-shared plan, then cache against a signature of the inputs so re-renders, tab switches and navigation do not refire. Manual regeneration stays.

**Note on quota:** `/api/analyze` is capped at 5/min and 40/day per IP with a 500/day global backstop, against a Gemini key with no billing. Moving from click-to-fetch to load-to-fetch multiplies calls by every dashboard visit that never pressed the button. The caching, the provisional/shared suppression and a `NEXT_PUBLIC_AI_TIPS_AUTORUN` kill switch are load-bearing parts of this change, not polish.

## Non-goals

- **No engine change.** Every new figure is a solver over `simulateFire` as it stands. The `fire-engine` spec is not modified.
- **No change to `DEFAULT_ASSUMPTIONS`.** Estimating `sippAccessAge` and `statePensionAge` from the user's age belongs to the concurrent `revamp-onboarding-and-plan-defaults` change. This change must therefore read those ages from the resolved inputs and never assume 57 or 67 — including in its tests.
- **No change to the money-frame toggle's labels.** Relabelling "Future £" (the user finds the framing unclear) belongs to the same concurrent change. This change consumes the toggle's state and adds no new wording to it.
- **No onboarding or quiz work**, and nothing that seeds balances. If the concurrent change lands its natural-language plan import, fewer users arrive provisional and the guide's balances step is simply pre-completed — no coordination needed beyond staying out of the quiz.
- **No Web Worker.** Named as the escape hatch for the added solver cost, not built here.
- **No generalisation to non-UK wrappers.** The split is written in ISA/GIA/SIPP terms and will be re-expressed as wrapper roles in the multi-country Phase 0 refactor.

## Capabilities

### New Capabilities
- `dashboard-layout`: module order on `/planner`, the status ribbon, behaviour in provisional and shared read-only states, and print output.
- `fire-targets`: the bridge-vs-pension decomposition — required monthly contributions, the FIRE number split, and the sustainable drawdown today's pots support.
- `plan-setup-guide`: which setup steps exist, how each completes, when the guide shows and hides, and how dismissal behaves.
- `ai-strategy-tips`: when tips fetch automatically, how results are cached and invalidated, and how unconfigured and quota-exhausted states suppress further calls.

### Modified Capabilities

None. `fire-engine` is depended on but not changed: `fire-targets` builds on the phase boundaries and the "SIPP is locked before its access age → `shortfall: true`" behaviour that spec already pins, and adds no requirement to the engine itself.

## Impact

**Components** — `FireDashboard.tsx` (reorder, ribbon, Overview extraction), new `Overview.tsx`, `PlanChecklist.tsx` (rewrite), `AiInsights.tsx` (auto-run + cache), `WhatIfCard.tsx` (deleted), `FireForm.tsx` and `ConfidencePanel.tsx` (drop `setChecklistFlag`).

**Lib** — `lib/checklist.ts` (flag API removed), `lib/what-if.ts` (`minMonthlyForSustainable` exported, `requiredContributions` added), new `lib/bridge.ts`, `lib/fire-number.ts` (gains the split; `fireNumber` is redefined as the sum of its two legs).

**Performance — the main technical risk.** `computeFireNumber` already runs ~50 `simulateFire` calls and `retirementSensitivity` two more bisections, all synchronously on every `QuickLevers` keystroke (`NumberInput` commits per keystroke). Three new bisections roughly double that, on a module now promoted to the top of the page. Handled by `useDeferredValue` plus a cut to the wastefully high fixed iteration counts; measured before and after.

**Tests** — `lib/checklist.test.ts` rewritten; `lib/identifiers.test.ts` loses two pins with the feature they guarded; new `lib/bridge.test.ts`; `lib/fire-number.test.ts` and `lib/what-if.test.ts` extended.

**Docs** — `app/methodology/page.tsx` and `docs/ARCHITECTURE.md` move together for the redefined FIRE number, per the project rule. `docs/HANDOFF-FIREWORKS.md` marks the two flag keys retired. `docs/DESIGN.md` gets the new order and `.no-print` inventory.

**Concurrency** — `revamp-onboarding-and-plan-defaults` is in flight in the same repo. Overlap is confined to `FireDashboard.tsx`; the Non-goals above are what keeps the two apart.
