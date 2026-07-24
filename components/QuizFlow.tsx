"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ProgressBar,
  QuizField,
  QuizNumberInput,
  StepShell,
} from "@/components/quiz/QuizPrimitives";
import { formatCurrency } from "@/lib/format";
import { savePlanLocal } from "@/lib/plan-storage";
import {
  applyPersona,
  assembleQuizInputs,
  FIRE_PERSONAS,
  initialQuizState,
  type LifestyleId,
  PLSA_LIFESTYLES,
  type PersonaId,
  type QuizState,
} from "@/lib/quiz";

const TOTAL_STEPS = 3;

export function QuizFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<QuizState>(initialQuizState);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    savePlanLocal(assembleQuizInputs(state));
    router.push("/planner");
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:py-16">
      <div className="mb-8">
        <ProgressBar step={step + 1} total={TOTAL_STEPS} />
      </div>

      {step === 0 && (
        <StepPersona
          persona={state.persona}
          onPick={(id) => setState((s) => applyPersona(s, id))}
          onNext={next}
        />
      )}
      {step === 1 && (
        <StepLifestyle
          lifestyle={state.lifestyle}
          customIncome={state.customIncome}
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
          currentAge={state.currentAge}
          retirementAge={state.retirementAge}
          onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
          onFinish={finish}
          onBack={back}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Step 1 — persona                                                   //
// ------------------------------------------------------------------ //

function StepPersona({
  persona,
  onPick,
  onNext,
}: {
  persona: PersonaId;
  onPick: (id: PersonaId) => void;
  onNext: () => void;
}) {
  return (
    <StepShell
      heading="What's your FIRE goal?"
      helper="Pick the one that fits best — you can change everything later."
      onContinue={onNext}
      continueLabel="Continue"
    >
      <div className="grid gap-2.5">
        {FIRE_PERSONAS.map((p) => {
          const selected = persona === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              aria-pressed={selected}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-primary bg-brand/10"
                  : "border-border bg-surface-muted hover:border-muted-foreground/40"
              }`}
            >
              <span className="block text-sm font-semibold text-foreground">
                {p.label}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {p.tagline}
              </span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}

// ------------------------------------------------------------------ //
// Step 2 — lifestyle (PLSA)                                          //
// ------------------------------------------------------------------ //

function StepLifestyle({
  lifestyle,
  customIncome,
  onPickLifestyle,
  onCustomIncome,
  onNext,
  onBack,
}: {
  lifestyle: LifestyleId;
  customIncome: number;
  onPickLifestyle: (id: LifestyleId) => void;
  onCustomIncome: (amount: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <StepShell
      heading="What lifestyle are you aiming for?"
      helper="Take-home spending per year, in today's money. Benchmarks are the UK PLSA Retirement Living Standards (single, excluding housing)."
      onContinue={onNext}
      onBack={onBack}
    >
      <div className="grid gap-2.5">
        {PLSA_LIFESTYLES.map((l) => {
          const selected = lifestyle === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onPickLifestyle(l.id)}
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
                {formatCurrency(l.amount)}
              </span>
            </button>
          );
        })}
      </div>

      <QuizField
        label="Or set your own target"
        hint={
          lifestyle === "custom"
            ? `Using your custom ${formatCurrency(customIncome)}/yr.`
            : "Overrides the benchmark above."
        }
      >
        <QuizNumberInput
          value={customIncome}
          onChange={onCustomIncome}
          prefix="£"
          suffix="/ yr"
          step={1000}
        />
      </QuizField>
    </StepShell>
  );
}

// ------------------------------------------------------------------ //
// Step 3 — ages                                                      //
// ------------------------------------------------------------------ //

function StepAges({
  currentAge,
  retirementAge,
  onChange,
  onFinish,
  onBack,
}: {
  currentAge: number;
  retirementAge: number;
  onChange: (patch: Partial<QuizState>) => void;
  onFinish: () => void;
  onBack: () => void;
}) {
  return (
    <StepShell
      heading="Your age, and when you'd like to retire"
      helper="This sets the whole timeline. You'll land straight in the planner next."
      onContinue={onFinish}
      onBack={onBack}
      continueLabel="Open my planner"
      continueIcon={<ArrowRight className="size-4" />}
    >
      <div className="grid grid-cols-2 gap-4">
        <QuizField label="Current age">
          <QuizNumberInput
            value={currentAge}
            onChange={(v) => onChange({ currentAge: v })}
            suffix="yrs"
            min={18}
            autoFocus
          />
        </QuizField>
        <QuizField label="Retire at">
          <QuizNumberInput
            value={retirementAge}
            onChange={(v) => onChange({ retirementAge: v })}
            suffix="yrs"
            min={currentAge}
          />
        </QuizField>
      </div>
    </StepShell>
  );
}
