import type { FireInputs } from "./fire-engine";
import type { PackLabels } from "./countries/types";

export interface ChecklistStep {
  id: string;
  label: string;
  hint: string;
  cta: string;
  href?: string;
  done: boolean;
}

export function buildChecklist(
  inputs: FireInputs,
  signedIn: boolean,
  authConfigured: boolean,
  labels?: PackLabels,
): ChecklistStep[] {
  const hasBalances =
    (inputs.pots?.isa?.balance ?? inputs.isaBalance ?? 0) > 0 ||
    (inputs.pots?.sipp?.balance ?? inputs.sippBalance ?? 0) > 0 ||
    ((inputs.pots?.gia?.balance ?? inputs.giaBalance ?? 0) ?? 0) > 0;
  const hasFund =
    ((inputs.pots?.isa?.holdings ?? inputs.isaHoldings ?? [])?.length ?? 0) > 0 ||
    ((inputs.pots?.sipp?.holdings ?? inputs.sippHoldings ?? [])?.length ?? 0) > 0 ||
    ((inputs.pots?.gia?.holdings ?? inputs.giaHoldings ?? [])?.length ?? 0) > 0;

  const steps: ChecklistStep[] = [
    {
      id: "balances",
      label: "Add your real balances",
      hint: labels?.checklistSavingsHint ?? "From your ISA provider, pension portal or last statement — a rough figure is fine, you can refine it later.",
      cta: "Add your balances",
      href: "/finances#balances",
      done: hasBalances,
    },
    {
      id: "funds",
      label: "Choose your funds",
      hint: "Define a portfolio per pot for a fee-aware growth rate.",
      cta: "Pick your funds",
      href: "/finances#balances",
      done: hasFund,
    },
  ];

  if (authConfigured) {
    steps.push({
      id: "save",
      label: "Save your plan",
      hint: "Create a free account so your plan is waiting next time.",
      cta: "Save & sign up",
      href: "/account",
      done: signedIn,
    });
  }

  return steps;
}

export function checklistProgress(steps: ChecklistStep[]): {
  done: number;
  total: number;
  complete: boolean;
} {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, complete: done === steps.length };
}

export function nextChecklistStep(steps: ChecklistStep[]): ChecklistStep | null {
  return steps.find((s) => !s.done) ?? null;
}
