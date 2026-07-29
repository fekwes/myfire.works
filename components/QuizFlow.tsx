"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Spark } from "@/components/Logo";
import { usePlan } from "@/components/PlanProvider";
import { CountryPack } from "@/lib/countries/types";
import {
  MiniAssetChart,
  ProgressBar,
  QuizField,
  QuizNumberInput,
  StepShell,
  useCountUp,
} from "@/components/quiz/QuizPrimitives";
import { PlanReview } from "@/components/quiz/PlanImport";
import { DropPasteInput, type ImportPayload } from "@/components/DropPasteInput";
import { sanitisePlanInput } from "@/lib/plan-storage";
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

/** Five total steps before the reveal screen. */
const TOTAL_QUESTIONS = 5;
const REVEAL_STEP = TOTAL_QUESTIONS; // index 5, shown after Step 5 (index 4)

export function QuizFlow() {
  const router = useRouter();
  const { setInputs, activePack } = usePlan();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<QuizState>(initialQuizState);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const next = () => {
    if (step === 0) {
      trackEvent(ANALYTICS_EVENTS.FORM_STARTED);
    }
    setStep((s) => Math.min(REVEAL_STEP, s + 1));
  };
  const back = () => {
    setStep((s) => {
      // If going back from reveal and importedPlan wasn't provided, jump back to Step 4 (index 3)
      if (s === REVEAL_STEP && !state.importedPlan) return 3;
      return Math.max(0, s - 1);
    });
  };

  const finish = () => {
    trackEvent(ANALYTICS_EVENTS.FORM_SUBMITTED);
    trackEvent(ANALYTICS_EVENTS.SUCCESSFUL_COMPLETION);
    setInputs(assembleQuizInputs(state, activePack));
    router.push("/planner");
  };

  const handlePayload = async (payload: ImportPayload) => {
    setImporting(true);
    setImportError(null);
    try {
      const body = payload.type === "text" ? { text: payload.text } : { file: payload };
      const res = await fetch("/api/import-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.plan) {
        throw new Error(data.error ?? "Import failed.");
      }

      const raw = data.plan;
      raw.currentAge = state.currentAge;
      raw.retirementAge = state.retirementAge;
      raw.targetAnnualIncome = state.customIncome;

      const safePlan = sanitisePlanInput(raw);
      if (!safePlan) throw new Error("Plan was unreadable.");

      setState((s) => ({ ...s, importedPlan: safePlan, savingsProvided: true }));
      setStep(4); // Advance to Step 5 (Review & Validate Financial Assets)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
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
        <StepShell
          key="import"
          heading="Import your plan with AI"
          helper="Paste a description of your savings, pensions, property, or drop statements (CSV, PDF, photos). You can mention specific funds (e.g. Vanguard FTSE Global All Cap, HSBC FTSE 250), balances, or contributions for the tool to factor it all."
          why="Listing your actual savings, pensions, and income sources allows the engine to accurately project your FIRE timeline."
          onBack={back}
        >
          <div className="space-y-4">
            <DropPasteInput
              busy={importing}
              onPayload={handlePayload}
              onError={setImportError}
              placeholder="e.g. I have £35k in Stocks & Shares ISA in Vanguard FTSE Global All Cap (adding £500/mo), £150k SIPP in HSBC FTSE 250 (adding £1,000/mo), £20k GIA, £450k home value, and £800/mo rental income..."
            />
            {importing && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse py-2">
                <Sparkles className="size-4 text-brand animate-spin" />
                Reading your plan with AI...
              </div>
            )}
            {importError && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger space-y-2">
                <p className="font-medium">{importError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      savingsProvided: true,
                      importedPlan: s.importedPlan ?? {},
                    }));
                    setStep(4);
                  }}
                  className="block font-semibold underline hover:text-foreground transition-colors"
                >
                  👉 Continue to enter your figures manually in Asset Review →
                </button>
              </div>
            )}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setState((s) => ({
                    ...s,
                    savingsProvided: true,
                    importedPlan: s.importedPlan ?? {},
                  }));
                  setStep(4);
                }}
                className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Skip AI & enter assets manually →
              </button>
            </div>
          </div>
        </StepShell>
      )}
      {step === 4 && (
        <StepShell
          key="review"
          heading="Review & Validate Financial Assets"
          helper="Check and adjust the figures extracted by AI before continuing."
          why="Validating your starting balances and monthly contributions ensures your timeline projection reflects your real situation."
          onBack={() => setStep(3)}
        >
          <PlanReview
            plan={{
              ...assembleQuizInputs(state, activePack),
              ...state.importedPlan,
            }}
            onChangePlan={(updated) =>
              setState((s) => ({ ...s, importedPlan: updated, savingsProvided: true }))
            }
            onAccept={() => setStep(REVEAL_STEP)}
            onBackToImport={() => setStep(3)}
            currencySymbol={activePack?.currency?.symbol ?? "£"}
          />
        </StepShell>
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

  const infl = inputs.inflationRate ?? 0;
  const retireDefl =
    infl > 0 ? 1 / (1 + infl) ** (inputs.retirementAge - inputs.currentAge) : 1;
  const fireToday = fire.fireNumber * retireDefl;

  const points = useMemo(
    () =>
      plan.timeline
        .filter((y) => y.age <= inputs.retirementAge)
        .map((y) =>
          Object.values(y.pots ?? {}).reduce((sum, p) => sum + (p?.start ?? 0), 0),
        ),
    [plan, inputs.retirementAge],
  );

  const shown = useCountUp(Math.round(fireToday));

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
