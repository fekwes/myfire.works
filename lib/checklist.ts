import type { FireInputs } from "./fire-engine";
import { fundForGrowth } from "./vanguard-funds";

/**
 * The "Complete your plan" checklist: a handful of small steps that turn a
 * quiz-seeded plan into a real one. Steps auto-complete from the plan itself
 * (balances entered, a fund chosen, signed in) plus two lightweight engagement
 * flags for the actions that leave no trace in the data (running the Monte
 * Carlo, reviewing the withdrawal settings). The UI reveals the next step
 * rather than the whole list, so it reads as momentum, not a chore.
 */

export const CHECKLIST_FLAG_KEYS = {
  confidence: "onfire:flag:confidence-run",
  withdrawals: "onfire:flag:withdrawals-viewed",
} as const;

export type ChecklistFlagKey = keyof typeof CHECKLIST_FLAG_KEYS;

export interface ChecklistFlags {
  ranConfidence: boolean;
  viewedWithdrawals: boolean;
}

export interface ChecklistStep {
  id: string;
  label: string;
  hint: string;
  /** CTA text for the "next step" card (empty for the already-done seed step). */
  cta: string;
  /** Deep link for the CTA, if any. */
  href?: string;
  done: boolean;
}

export function buildChecklist(
  inputs: FireInputs,
  flags: ChecklistFlags,
  signedIn: boolean,
): ChecklistStep[] {
  const hasBalances =
    inputs.isaBalance > 0 ||
    inputs.sippBalance > 0 ||
    (inputs.giaBalance ?? 0) > 0;
  const hasFund =
    !!fundForGrowth(inputs.isaGrowth) ||
    !!fundForGrowth(inputs.sippGrowth) ||
    !!fundForGrowth(inputs.giaGrowth);

  return [
    {
      id: "created",
      label: "Plan created",
      hint: "You've got a starting plan — now make it yours.",
      cta: "",
      done: true,
    },
    // Order matters: the highest-value moves come first. Real balances make
    // the plan yours; saving keeps it; stress-testing proves it. "Choose your
    // funds" and the withdrawal style are refinements, so they follow — they
    // used to sit ahead of saving and stress-testing, which buried the steps
    // that actually matter.
    {
      id: "balances",
      label: "Add your real balances",
      hint: "From your ISA provider, pension portal or last statement — a rough figure is fine, you can refine it later.",
      cta: "Add your balances",
      href: "/finances#balances",
      done: hasBalances,
    },
    {
      id: "save",
      label: "Save your plan",
      hint: "Create a free account so your plan is waiting next time.",
      cta: "Save & sign up",
      href: "/account",
      done: signedIn,
    },
    {
      id: "confidence",
      label: "Stress-test your plan",
      hint: "Run 2,000 randomised market paths to see your odds of success.",
      cta: "Open the Confidence tab",
      // `?tab=` drives the tab (a fragment can't: this link is a same-page
      // navigation, and Next's router changes fragments without an event);
      // `#confidence` still scrolls the projection card into view.
      href: "/planner?tab=confidence#confidence",
      done: flags.ranConfidence,
    },
    {
      id: "funds",
      label: "Choose your funds",
      hint: "Pick your Vanguard funds for a fee-aware growth rate.",
      cta: "Pick your funds",
      href: "/finances#funds",
      done: hasFund,
    },
    {
      id: "withdrawals",
      label: "Set your withdrawal style",
      hint: "Choose how you take your pension and handle bad markets.",
      cta: "Review your withdrawals",
      href: "/finances#scenario",
      done: flags.viewedWithdrawals,
    },
  ];
}

export function checklistProgress(steps: ChecklistStep[]): {
  done: number;
  total: number;
  complete: boolean;
} {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, complete: done === steps.length };
}

/** The first incomplete step — the one the UI highlights next. */
export function nextChecklistStep(steps: ChecklistStep[]): ChecklistStep | null {
  return steps.find((s) => !s.done) ?? null;
}

// --- Engagement flags (client-only; safe no-ops during SSR) --------------- //

export function readChecklistFlags(): ChecklistFlags {
  const read = (k: string) => {
    try {
      return localStorage.getItem(k) === "1";
    } catch {
      return false;
    }
  };
  return {
    ranConfidence: read(CHECKLIST_FLAG_KEYS.confidence),
    viewedWithdrawals: read(CHECKLIST_FLAG_KEYS.withdrawals),
  };
}

/** Set an engagement flag and notify any mounted checklist to re-read. */
export function setChecklistFlag(key: ChecklistFlagKey): void {
  try {
    localStorage.setItem(CHECKLIST_FLAG_KEYS[key], "1");
    window.dispatchEvent(new Event("onfire:flags"));
  } catch {
    // no-op (SSR / storage disabled)
  }
}
