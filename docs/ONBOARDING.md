# Onboarding quiz + landing page — design spec (Stage 6)

> **Status: Archive.** This was the brief. It was built, and then changed twice
> (PR #8 and PR #9), so it no longer describes the app: the quiz asks four
> questions before the reveal, the personas were cut down to
> `standard | coast | barista`, and the landing "skip to the planner" was
> removed. **The app and `lib/quiz.ts` are the truth.** Kept for the reasoning
> behind the flow — do not update it. See [`README.md`](./README.md) for the
> documentation index.

## Goal

Turn a cold visitor into someone with a real, saved FIRE plan in ~2 minutes,
by asking only the questions the engine truly needs — in a friendly,
one-thing-at-a-time flow that ends with a satisfying results reveal and an
optional sign-up to save.

## Principles

- **Value before credentials.** Show the plan result *before* asking anyone to
  create an account. The sign-up is the last step, framed as "save this", not a
  gate.
- **Minimum viable questions.** Ask the ~6 inputs that materially change the
  projection; silently default everything else (statutory ages, growth, pension
  strategy, life expectancy). The full planner exposes the rest.
- **One decision per screen**, big type, a progress bar, presets/chips over
  free typing wherever possible, encouraging microcopy, smooth transitions.
- **Mobile-first** — most quizzes are taken on a phone.
- **Reuses the engine live** — the reveal calls `simulateFire`, so it's the
  real number, not a mock.

## Information architecture (routing change)

The app moves to a landing-first structure (as agreed):

| Route | Today | After Stage 6 |
|---|---|---|
| `/` | the planner | **Landing page** (hero + "Build my plan" CTA → `/start`) |
| `/start` | — | **The quiz** (this doc) |
| `/planner` | — | the current dashboard (move `app/page.tsx`'s `<FireDashboard/>` here) |
| `/methodology` | docs | unchanged |

- Header nav becomes **Planner · Methodology** (logo → landing `/`).
- The landing hero can reuse the old marketing hero copy we removed from the
  planner (the eyebrow + big display heading + subhead), plus a prominent
  primary CTA to the quiz and a secondary "skip to the planner" link.

## The quiz — screen by screen (`/start`)

A progress bar sits at the top for steps 1–5. Each step: a large question
heading, one helper line, the input(s), and Back / Continue. `QuizState` is a
`Partial<FireInputs>` built up across steps.

**Step 1 — About you**
- "First, the basics." → *Current age* (number) and *When do you want to
  retire?* (number). Two related fields on one screen.

**Step 2 — Your target lifestyle**
- "How much do you want to live on each year?" *(take-home, today's money)*
- Preset chips: **Modest ~£25k · Comfortable ~£40k · Luxury ~£60k** + a custom
  amount. Selecting a chip fills the number; custom stays editable.

**Step 3 — What you've saved**
- "What have you built up so far?" Three amounts with plain-English labels and
  "leave at £0 if none":
  - **ISA / cash savings** → `isaBalance`
  - **Pension (SIPP / workplace)** → `sippBalance`
  - **Other investments (GIA)** → `giaBalance`

**Step 4 — What you save each month**
- "And how much do you add each month?"
  - Into ISA → `isaMonthlyContribution`
  - Into pension → `sippMonthlyContribution`

**Step 5 — Property (optional, skippable)**
- "Own any property?" → a Yes / Skip choice.
  - If yes: *Home value* (`homeValue`) and, optionally, *Rental value* +
    *Monthly rent* (`rentalValue`, `rentalMonthlyIncome`).
- Clearly skippable — "You can add this later in the planner."

**Step 6 — Results reveal (the payoff)**
- Compute `simulateFire(quizState + defaults)` and animate the verdict:
  - Big line: **"You're on track 🎉"** or **"You'd run short at age N"**.
  - 2–3 headline stats (retire at, plan lasts to, tax-free pension) and a small
    sparkline/mini asset chart.
- Two CTAs: **"Save my plan"** (→ step 7) and **"Open the full planner"**
  (→ `/planner`, skipping sign-up).

**Step 7 — Save your plan (sign-up)**
- "Create a free account to save this and track it." Inline email + password
  (reuse the Supabase flow from `AuthButton`). On success, write the plan to the
  `portfolios` table with a default name ("My plan").
- A "Maybe later" link goes straight to `/planner`.

### Silent defaults (not asked)
`sippAccessAge 57`, `statePensionAge 67`, `statePensionAnnual 12547.6`,
`pensionStrategy "gradual"`, per-pot growth `5%` (property `3%`), sale/downsize
ages `0`, `lifeExpectancyAge 95`. All editable later in the planner.

## Hand-off from quiz → planner (state)

- On finish (save or skip), persist the assembled `FireInputs` to
  `localStorage["onfire:plan"]`.
- `FireDashboard` initial state reads `localStorage["onfire:plan"]` if present,
  else `DEFAULT_FIRE_FORM_VALUES`. (Guard for SSR: read in a `useEffect` or a
  lazy initialiser that checks `typeof window`.)
- If the user signed up, also upsert the plan to Supabase so it appears under
  "Saved plans".

## Visual / interaction design

- Same "Ink & Lime" system: ink surfaces, Bricolage display headings, mono
  micro-labels, lime accents. The quiz card is centered, `max-w-md`, generous
  padding.
- Progress bar in lime; step transitions slide/fade (respect
  `prefers-reduced-motion`).
- Big tap targets; number inputs with the same styling as the planner; preset
  chips are pill buttons that toggle.
- Reveal step: count-up animation on the headline number; the verdict pill
  (green/red) mirrors the planner.

## Components to build

- `app/page.tsx` → **Landing** (new). Move current planner to `app/planner/page.tsx`.
- `app/start/page.tsx` → renders `<QuizFlow/>`.
- `components/QuizFlow.tsx` → step state machine, progress bar, transitions.
- `components/quiz/StepAboutYou.tsx`, `StepTarget.tsx`, `StepSavings.tsx`,
  `StepMonthly.tsx`, `StepProperty.tsx`, `StepReveal.tsx`, `StepSignUp.tsx`
  (or one file with step components — keep it simple).
- Small shared quiz primitives: `ProgressBar`, `Choice`/`Chip`, reuse the
  planner's number-input styling.
- `lib/plan-storage.ts` → `savePlanLocal(inputs)` / `loadPlanLocal()`.
- Update `components/Nav.tsx` (Planner/Methodology) and header logo → `/`.

## Testing

- `plan-storage` round-trip (save → load returns the same inputs).
- Quiz "assemble inputs" helper: given quiz answers, produces a valid
  `FireInputs` with the documented defaults (unit-test the mapping).
- Live: complete the quiz, verify the reveal matches `simulateFire`, and that
  landing on `/planner` shows the prefilled values.

## Deferred to the planner (not in the quiz)

Per-pot growth rates, GIA monthly contributions, rental sale age / growth, home
downsizing, pension-access strategy, statutory ages, life expectancy, Monte
Carlo. The quiz gets people to a meaningful plan fast; depth lives in the
planner.
