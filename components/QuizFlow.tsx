"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  Chip,
  MiniAssetChart,
  ProgressBar,
  QuizField,
  QuizNumberInput,
  StepShell,
  useCountUp,
} from "@/components/quiz/QuizPrimitives";
import { simulateFire, type FireInputs } from "@/lib/fire-engine";
import { formatCurrency } from "@/lib/format";
import { savePlanLocal } from "@/lib/plan-storage";
import {
  assembleQuizInputs,
  QUIZ_INITIAL_STATE,
  type QuizState,
  TARGET_PRESETS,
} from "@/lib/quiz";
import { createClient } from "@/lib/supabase/client";

/** Input steps 1–5 (0-indexed 0–4) show the progress bar; reveal/sign-up don't. */
const INPUT_STEPS = 5;

export function QuizFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<QuizState>(QUIZ_INITIAL_STATE);

  const set = <K extends keyof FireInputs>(key: K, value: FireInputs[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  // Assemble the plan, and persist it once the reveal is reached so opening
  // the planner from either CTA finds it in localStorage.
  const inputs = useMemo(() => assembleQuizInputs(state), [state]);
  const reachedReveal = step >= 5;
  useEffect(() => {
    if (reachedReveal) savePlanLocal(inputs);
  }, [reachedReveal, inputs]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:py-16">
      {step < INPUT_STEPS && (
        <div className="mb-8">
          <ProgressBar step={step + 1} total={INPUT_STEPS} />
        </div>
      )}

      {step === 0 && <StepAboutYou state={state} set={set} onNext={next} />}
      {step === 1 && (
        <StepTarget state={state} set={set} onNext={next} onBack={back} />
      )}
      {step === 2 && (
        <StepSavings state={state} set={set} onNext={next} onBack={back} />
      )}
      {step === 3 && (
        <StepMonthly state={state} set={set} onNext={next} onBack={back} />
      )}
      {step === 4 && (
        <StepProperty state={state} set={set} onNext={next} onBack={back} />
      )}
      {step === 5 && (
        <StepReveal
          inputs={inputs}
          onSave={() => setStep(6)}
          onOpenPlanner={() => router.push("/planner")}
          onBack={back}
        />
      )}
      {step === 6 && (
        <StepSignUp
          inputs={inputs}
          onDone={() => router.push("/planner")}
          onBack={() => setStep(5)}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Input steps                                                        //
// ------------------------------------------------------------------ //

type StepProps = {
  state: QuizState;
  set: <K extends keyof FireInputs>(key: K, value: FireInputs[K]) => void;
  onNext: () => void;
  onBack?: () => void;
};

function StepAboutYou({ state, set, onNext }: StepProps) {
  return (
    <StepShell
      heading="First, the basics."
      helper="Your age and when you'd like to retire set the whole timeline."
      onContinue={onNext}
    >
      <div className="grid grid-cols-2 gap-4">
        <QuizField label="Current age">
          <QuizNumberInput
            value={state.currentAge ?? 35}
            onChange={(v) => set("currentAge", v)}
            suffix="yrs"
            min={18}
            autoFocus
          />
        </QuizField>
        <QuizField label="Retire at">
          <QuizNumberInput
            value={state.retirementAge ?? 55}
            onChange={(v) => set("retirementAge", v)}
            suffix="yrs"
            min={state.currentAge ?? 18}
          />
        </QuizField>
      </div>
    </StepShell>
  );
}

function StepTarget({ state, set, onNext, onBack }: StepProps) {
  const current = state.targetAnnualIncome ?? 40000;
  return (
    <StepShell
      heading="How much do you want to live on each year?"
      helper="Take-home income in today's money, after tax."
      onContinue={onNext}
      onBack={onBack}
    >
      <div className="flex flex-wrap gap-2.5">
        {TARGET_PRESETS.map((p) => (
          <Chip
            key={p.amount}
            selected={current === p.amount}
            onClick={() => set("targetAnnualIncome", p.amount)}
          >
            {p.label} {p.hint}
          </Chip>
        ))}
      </div>
      <QuizField label="Or a custom amount">
        <QuizNumberInput
          value={current}
          onChange={(v) => set("targetAnnualIncome", v)}
          prefix="£"
          suffix="/ yr"
          step={1000}
        />
      </QuizField>
    </StepShell>
  );
}

function StepSavings({ state, set, onNext, onBack }: StepProps) {
  return (
    <StepShell
      heading="What have you built up so far?"
      helper="Rough figures are fine — leave any at £0 if you don't have it yet."
      onContinue={onNext}
      onBack={onBack}
    >
      <QuizField label="ISA / cash savings">
        <QuizNumberInput
          value={state.isaBalance ?? 0}
          onChange={(v) => set("isaBalance", v)}
          prefix="£"
          autoFocus
        />
      </QuizField>
      <QuizField label="Pension (SIPP / workplace)">
        <QuizNumberInput
          value={state.sippBalance ?? 0}
          onChange={(v) => set("sippBalance", v)}
          prefix="£"
        />
      </QuizField>
      <QuizField label="Other investments (GIA)">
        <QuizNumberInput
          value={state.giaBalance ?? 0}
          onChange={(v) => set("giaBalance", v)}
          prefix="£"
        />
      </QuizField>
    </StepShell>
  );
}

function StepMonthly({ state, set, onNext, onBack }: StepProps) {
  return (
    <StepShell
      heading="And how much do you add each month?"
      helper="Regular contributions while you're still working."
      onContinue={onNext}
      onBack={onBack}
    >
      <QuizField label="Into your ISA">
        <QuizNumberInput
          value={state.isaMonthlyContribution ?? 0}
          onChange={(v) => set("isaMonthlyContribution", v)}
          prefix="£"
          suffix="/ mo"
          autoFocus
        />
      </QuizField>
      <QuizField label="Into your pension">
        <QuizNumberInput
          value={state.sippMonthlyContribution ?? 0}
          onChange={(v) => set("sippMonthlyContribution", v)}
          prefix="£"
          suffix="/ mo"
        />
      </QuizField>
    </StepShell>
  );
}

function StepProperty({ state, set, onNext, onBack }: StepProps) {
  const [mode, setMode] = useState<"ask" | "yes">(
    (state.homeValue ?? 0) > 0 || (state.rentalValue ?? 0) > 0 ? "yes" : "ask",
  );

  const skip = () => {
    set("homeValue", 0);
    set("rentalValue", 0);
    set("rentalMonthlyIncome", 0);
    onNext();
  };

  return (
    <StepShell
      heading="Own any property?"
      helper="Optional — you can always add this later in the planner."
      onContinue={mode === "yes" ? onNext : skip}
      onBack={onBack}
      continueLabel={mode === "yes" ? "Continue" : "Skip for now"}
    >
      <div className="flex flex-wrap gap-2.5">
        <Chip selected={mode === "yes"} onClick={() => setMode("yes")}>
          Yes, I do
        </Chip>
        <Chip selected={mode === "ask"} onClick={() => setMode("ask")}>
          No / skip
        </Chip>
      </div>

      {mode === "yes" && (
        <div className="space-y-5">
          <QuizField
            label="Home value"
            hint="The home you live in — counts toward net worth, not drawn for income."
          >
            <QuizNumberInput
              value={state.homeValue ?? 0}
              onChange={(v) => set("homeValue", v)}
              prefix="£"
            />
          </QuizField>
          <QuizField
            label="Rental value (optional)"
            hint="A buy-to-let, if you have one. Leave at £0 if not."
          >
            <QuizNumberInput
              value={state.rentalValue ?? 0}
              onChange={(v) => set("rentalValue", v)}
              prefix="£"
            />
          </QuizField>
          <QuizField label="Monthly rent received (optional)">
            <QuizNumberInput
              value={state.rentalMonthlyIncome ?? 0}
              onChange={(v) => set("rentalMonthlyIncome", v)}
              prefix="£"
              suffix="/ mo"
            />
          </QuizField>
        </div>
      )}
    </StepShell>
  );
}

// ------------------------------------------------------------------ //
// Reveal                                                             //
// ------------------------------------------------------------------ //

function StepReveal({
  inputs,
  onSave,
  onOpenPlanner,
  onBack,
}: {
  inputs: FireInputs;
  onSave: () => void;
  onOpenPlanner: () => void;
  onBack: () => void;
}) {
  const { configured } = useAuth();
  const plan = useMemo(() => simulateFire(inputs), [inputs]);

  const horizon = plan.inputs.lifeExpectancyAge;
  const firstShortfall = plan.timeline.find(
    (y) => y.shortfall && y.phase !== "accumulation",
  )?.age;
  const sustainable = plan.sustainableToLifeExpectancy;
  const lastsTo = firstShortfall ? firstShortfall - 1 : horizon;

  const income = useCountUp(plan.inputs.targetAnnualIncome);
  const points = plan.timeline.map(
    (y) => y.isaBalanceEnd + y.giaBalanceEnd + y.sippBalanceEnd,
  );

  return (
    <div className="quiz-step">
      <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" />
        Your plan
      </div>

      <span
        className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          sustainable ? "bg-brand/15 text-success" : "bg-danger/15 text-danger"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${
            sustainable ? "bg-success" : "bg-danger"
          }`}
        />
        {sustainable ? "On track" : "Shortfall"}
      </span>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {sustainable ? "You're on track 🎉" : `You'd run short at age ${firstShortfall}`}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {sustainable ? (
          <>
            Your pots fund{" "}
            <span className="font-semibold text-foreground tabular">
              {formatCurrency(income)}
            </span>{" "}
            a year, after tax, all the way to age {horizon}.
          </>
        ) : (
          <>
            Aiming for{" "}
            <span className="font-semibold text-foreground tabular">
              {formatCurrency(income)}
            </span>{" "}
            a year — raise contributions, trim the target, or retire a little
            later to close the gap.
          </>
        )}
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <MiniAssetChart points={points} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <RevealStat label="Retire at" value={`Age ${plan.inputs.retirementAge}`} />
        <RevealStat
          label="Plan lasts to"
          value={sustainable ? `Age ${horizon}+` : `Age ${lastsTo}`}
          tone={sustainable ? "success" : "danger"}
        />
        <RevealStat
          label="Tax-free pension"
          value={formatCurrency(plan.totalTaxFreePension)}
        />
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {/* Value first: get them into the tool. Saving is optional and secondary. */}
        <button
          type="button"
          onClick={onOpenPlanner}
          className="flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Open my planner
          <ArrowRight className="size-4" />
        </button>
        {configured && (
          <button
            type="button"
            onClick={onSave}
            className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Save it to an account first
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to the questions
        </button>
      </div>
    </div>
  );
}

function RevealStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const valueTone =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-3">
      <p className="font-mono text-[0.6rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-display text-sm font-bold tabular ${valueTone}`}>
        {value}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Sign-up                                                            //
// ------------------------------------------------------------------ //

function StepSignUp({
  inputs,
  onDone,
  onBack,
}: {
  inputs: FireInputs;
  onDone: () => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upsertPlan(userId: string) {
    const supabase = createClient();
    await supabase.from("portfolios").upsert(
      {
        user_id: userId,
        name: "My plan",
        inputs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,name" },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) throw error;
      if (data.session && data.user) {
        await upsertPlan(data.user.id);
        onDone();
      } else {
        // Email confirmation required — the plan is already in localStorage,
        // so send them to the planner where they can sign in and save later.
        setMessage(
          "Check your email to confirm your account. Your plan is saved on this device meanwhile.",
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // Already signed in — one tap to save to the account.
  if (user) {
    return (
      <div className="quiz-step">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Save this to your account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Signed in as {user.email}. Save this plan to track it later.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await upsertPlan(user.id);
              onDone();
            }}
            className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save & open the planner"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-step">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Create a free account to save this
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Keep your plan and track it over time. Takes a few seconds.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account & save"}
        </button>
      </form>

      {message && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onDone}
          className="text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Maybe later — just open the planner
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Back
        </button>
      </div>
    </div>
  );
}
