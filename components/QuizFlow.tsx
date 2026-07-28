"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Spark } from "@/components/Logo";
import { usePlan } from "@/components/PlanProvider";
import type { FireInputs } from "@/lib/fire-engine";
import { CountryPack } from "@/lib/countries/types";
import {
  MiniAssetChart,
  ProgressBar,
  QuizField,
  QuizNumberInput,
  StepShell,
  useCountUp,
} from "@/components/quiz/QuizPrimitives";
import { PlanImport } from "@/components/quiz/PlanImport";
import { Button } from "@/components/ui";
import { simulateFire } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";
import { useFormat } from "@/hooks/useFormat";
import {
  assembleQuizInputs,
  FIRE_STRATEGIES,
  initialQuizState,
  type LifestyleId,
  type QuizState,
  type StrategyId,
} from "@/lib/quiz";

import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

/** The four questions. The reveal that follows is a payoff, not a question. */
const TOTAL_QUESTIONS = 4;
const REVEAL_STEP = TOTAL_QUESTIONS; // index 4, shown after the last question

export function QuizFlow() {
  const router = useRouter();
  const { setInputs, activePack } = usePlan();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<QuizState>(initialQuizState);

  const next = () => {
    if (step === 0) {
      trackEvent(ANALYTICS_EVENTS.FORM_STARTED);
    }
    setStep((s) => Math.min(REVEAL_STEP, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    trackEvent(ANALYTICS_EVENTS.FORM_SUBMITTED);
    trackEvent(ANALYTICS_EVENTS.SUCCESSFUL_COMPLETION);
    setInputs(assembleQuizInputs(state, activePack));
    router.push("/planner");
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:py-16">
      {step < REVEAL_STEP && (
        <div className="mb-8">
          <ProgressBar step={step + 1} total={TOTAL_QUESTIONS} />
        </div>
      )}

      {step === 0 && (
        <StepStrategy
          key="strategy"
          strategy={state.strategy}
          retirementAge={state.retirementAge}
          activePack={activePack}
          onPick={(strategy) => setState((s) => ({ ...s, strategy }))}
          onNext={next}
        />
      )}
      {step === 1 && (
        <StepLifestyle
          key="lifestyle"
          lifestyle={state.lifestyle}
          customIncome={state.customIncome}
          activePack={activePack}
          onPickLifestyle={(lifestyle) => setState((s) => ({ ...s, lifestyle }))}
          onCustomIncome={(customIncome) =>
            setState((s) => ({ ...s, customIncome, lifestyle: "custom" }))
          }
          onNext={next}
          onBack={back}
        />
      )}
      {step === 2 && (
        <StepAges
          key="ages"
          state={state}
          activePack={activePack}
          onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 3 && (
        <StepSavings
          key="savings"
          savings={state.savings}
          activePack={activePack}
          onChange={(savings) =>
            setState((s) => ({ ...s, savings, savingsProvided: true, importedPlan: undefined }))
          }
          onImport={(plan) => {
            setState((s) => ({ ...s, importedPlan: plan, savingsProvided: true }));
            next();
          }}
          onSkip={() => {
            setState((s) => ({ ...s, savings: 0, savingsProvided: false, importedPlan: undefined }));
            next();
          }}
          onNext={next}
          onBack={back}
        />
      )}
      {step === REVEAL_STEP && (
        <StepReveal key="reveal" state={state} onFinish={finish} onBack={back} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Step 1 — spending target (PLSA)                                    //
// ------------------------------------------------------------------ //

function StepLifestyle({
  activePack,
  lifestyle,
  customIncome,
  onPickLifestyle,
  onCustomIncome,
  onNext,
  onBack,
}: {
  lifestyle: LifestyleId;
  customIncome: number;
  activePack: CountryPack;
  onPickLifestyle: (id: LifestyleId) => void;
  onCustomIncome: (amount: number) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  const { format } = useFormat();
  return (
    <StepShell
      heading="How much will you spend each year?"
      helper={`Take-home spending per year, in today's money. Benchmarks are the ${activePack.labels.lifestyleBenchmarkName} (single, excluding housing) — this one number drives your FIRE target.`}
      why="Your yearly spending is the biggest lever on your FIRE number — everything else in the plan sizes around it."
      onContinue={onNext}
      onBack={onBack}
    >
      <div className="grid gap-2.5">
        {activePack.lifestyleTiers.map((l) => {
          const selected = lifestyle === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onPickLifestyle(l.id as LifestyleId)}
              aria-pressed={selected}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-primary bg-brand/10"
                  : "border-border bg-surface-muted hover:border-muted-foreground/40"
              }`}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {l.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {l.blurb}
                </span>
              </span>
              <span className="shrink-0 font-display text-sm font-bold tabular text-foreground">
                {format(l.amount)}
              </span>
            </button>
          );
        })}
      </div>

      <QuizField
        label="Or set your own target"
        hint={
          lifestyle === "custom"
            ? `Using your custom ${format(customIncome)}/yr.`
            : "Leaner or richer than the bands above — your number wins."
        }
      >
        <QuizNumberInput
          value={customIncome}
          onChange={onCustomIncome}
          prefix={activePack.currency.symbol}
          suffix="/ yr"
          step={1000}
        />
      </QuizField>
    </StepShell>
  );
}

// ------------------------------------------------------------------ //
// Step 2 — ages                                                      //
// ------------------------------------------------------------------ //

function StepAges({
  activePack,
  state,
  onChange,
  onNext,
  onBack,
}: {
  state: QuizState;
  activePack: CountryPack;
  onChange: (patch: Partial<QuizState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <StepShell
      heading="Your age, and when you'd like to stop"
      helper="This sets the whole timeline — how long you're building, and how long the money has to last."
      why="Your ages fix the timeline: the years left to build the pot, and the years it then has to cover."
      onContinue={onNext}
      onBack={onBack}
    >
      <div className="grid grid-cols-2 gap-4">
        <QuizField label="Current age">
          <QuizNumberInput
            value={state.currentAge}
            onChange={(v) => onChange({ currentAge: v })}
            suffix="yrs"
            min={18}
            autoFocus
          />
        </QuizField>
        {state.strategy === "coast" && (
          <QuizField label="Stop adding at">
            <QuizNumberInput
              value={state.contributionsUntilAge ?? state.retirementAge}
              onChange={(v) => onChange({ contributionsUntilAge: v })}
              suffix="yrs"
              min={state.currentAge}
            />
          </QuizField>
        )}
        <QuizField label={state.strategy === "barista" ? "Go part-time at" : "Retire at"}>
          <QuizNumberInput
            value={state.retirementAge}
            onChange={(v) => onChange({ retirementAge: v })}
            suffix="yrs"
            min={state.currentAge}
          />
        </QuizField>
        {state.strategy === "barista" && (
          <>
            <QuizField label="Until age">
              <QuizNumberInput
                value={state.partTimeUntilAge ?? 67}
                onChange={(v) => onChange({ partTimeUntilAge: v })}
                suffix="yrs"
                min={state.retirementAge}
              />
            </QuizField>
            <QuizField label="Part-time income">
              <QuizNumberInput
                value={state.partTimeAnnualIncome}
                onChange={(v) => onChange({ partTimeAnnualIncome: v })}
                prefix={activePack.currency.symbol}
                step={1000}
              />
            </QuizField>
          </>
        )}
      </div>
    </StepShell>
  );
}

// ------------------------------------------------------------------ //
// Step 3 — strategy                                                  //
// ------------------------------------------------------------------ //

function StepStrategy({
  strategy,
  retirementAge,
  activePack,
  onPick,
  onNext,
  onBack,
}: {
  strategy: StrategyId;
  retirementAge: number;
  activePack: CountryPack;
  onPick: (id: StrategyId) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  return (
    <StepShell
      heading="How do you want to get there?"
      helper={`Three routes to age ${retirementAge}. You can change this — and everything else — in the planner.`}
      why={activePack.labels.strategyWhy}
      onContinue={onNext}
      onBack={onBack}
    >
      <div className="grid gap-2.5">
        {FIRE_STRATEGIES.map((s) => {
          const selected = strategy === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id)}
              aria-pressed={selected}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-primary bg-brand/10"
                  : "border-border bg-surface-muted hover:border-muted-foreground/40"
              }`}
            >
              <span className="block text-sm font-semibold text-foreground">
                {s.label}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {s.id === "barista" ? activePack.labels.baristaTagline : s.tagline}
              </span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}

// ------------------------------------------------------------------ //
// Step 4 — savings so far (optional)                                 //
// ------------------------------------------------------------------ //

function StepSavings({
  activePack,
  savings,
  onChange,
  onImport,
  onSkip,
  onNext,
  onBack,
}: {
  savings: number;
  activePack: CountryPack;
  onChange: (amount: number) => void;
  onImport: (plan: FireInputs) => void;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [importing, setImporting] = useState(false);

  if (importing) {
    return (
      <StepShell heading="Import your plan" onBack={() => setImporting(false)}>
        <PlanImport onImport={onImport} onCancel={() => setImporting(false)} />
      </StepShell>
    );
  }

  return (
    <StepShell
      heading="Paste or drop everything you've got"
      helper={activePack.labels.savingsHelper}
      why="Without a starting balance we can only project from your contributions — a rough figure is what makes the verdict actually about you."
      onContinue={onNext}
      onBack={onBack}
      continueLabel="See my number"
      continueIcon={<ArrowRight className="size-4" />}
    >
      <div className="mb-4 text-center">
        <button
          type="button"
          onClick={() => setImporting(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand/10 px-4 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"
        >
          <Sparkles className="size-4" />
          Import with AI
        </button>
      </div>

      <div className="relative my-6 flex items-center justify-center">
        <span className="absolute bg-background px-3 text-xs uppercase tracking-wide text-muted-foreground">
          Or single figure
        </span>
        <div className="h-px w-full bg-border" />
      </div>

      <QuizField
        label="Total saved so far"
        hint={activePack.labels.savingsHint}
      >
        <QuizNumberInput
          value={savings}
          onChange={onChange}
          prefix={activePack.currency.symbol}
          step={1000}
        />
      </QuizField>

      <button
        type="button"
        onClick={onSkip}
        className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline mt-4"
      >
        Skip for now
      </button>
    </StepShell>
  );
}

// ------------------------------------------------------------------ //
// The reveal — the one earned, celebratory beat                      //
// ------------------------------------------------------------------ //

function StepReveal({
  state,
  onFinish,
  onBack,
}: {
  state: QuizState;
  onFinish: () => void;
  onBack: () => void;
}) {
  const { activePack } = usePlan();
  const { format } = useFormat();
  const inputs = useMemo(() => assembleQuizInputs(state, activePack), [state, activePack]);
  const fire = useMemo(() => computeFireNumber(inputs), [inputs]);
  const plan = useMemo(() => simulateFire(inputs), [inputs]);

  // The FIRE number is nominal — the pot at retirement in that year's pounds.
  // The planner leads in *today's money* (deflated by inflation), so match it
  // here, or the reveal and the very next screen would show different figures.
  const infl = inputs.inflationRate ?? 0;
  const retireDefl =
    infl > 0 ? 1 / (1 + infl) ** (inputs.retirementAge - inputs.currentAge) : 1;
  const fireToday = fire.fireNumber * retireDefl;

  // The launch-trail-to-burst gesture is the *accumulation*, ending on the FI
  // moment — so the sparkline stops at retirement rather than running on into
  // the drawdown, where the "burst" would land on a depleted pot.
  const points = useMemo(
    () =>
      plan.timeline
        .filter((y) => y.age <= inputs.retirementAge)
        .map(
          (y) =>
            (y.pots.isa.start ?? 0) +
            (y.pots.gia.start ?? 0) +
            (y.pots.sipp.start ?? 0),
        ),
    [plan, inputs.retirementAge],
  );

  const shown = useCountUp(Math.round(fireToday));

  // One honest line. The FIRE number itself is always earned — it depends only
  // on the target and age — but whether you're *on track* to reach it depends
  // on real balances, so we only claim a verdict when the user gave savings.
  const verdict = !state.savingsProvided
    ? "This assumes you're starting from zero. Add what you've saved in the planner to see whether you're on track."
    : fire.onTrack
      ? "On your current contributions, you're on track to reach it."
      : "You're not there yet on your current contributions — the planner shows exactly what closes the gap.";

  return (
    <div className="quiz-step text-center">
      <p className="flex items-center justify-center gap-1.5 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <Spark size={14} className="text-brand" />
        Here&apos;s your number
      </p>

      <p className="mt-4 font-display text-4xl font-bold tabular tracking-tight sm:text-5xl">
        {format(shown)}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        the pot you&apos;d need by age {inputs.retirementAge} to draw{" "}
        {format(inputs.targetAnnualIncome)}/yr, in today&apos;s money.
      </p>

      <div className="mt-6">
        <MiniAssetChart points={points} />
      </div>

      <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-foreground">
        {verdict}
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          variant="brand"
          onClick={onFinish}
          className="flex-1"
        >
          Open my dashboard
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
