"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_FIRE_FORM_VALUES } from "@/components/FireForm";
import type { FireInputs } from "@/lib/fire-engine";
import { loadPlanLocal, savePlanLocal } from "@/lib/plan-storage";

interface PlanState {
  /** The single active plan, shared across the Planner and Your Finances tabs. */
  inputs: FireInputs;
  /** Update the active plan (and persist it to localStorage). */
  setInputs: (inputs: FireInputs) => void;
  /** True once the stored plan (if any) has been read after mount. */
  hydrated: boolean;
  /** Whether a plan was found in storage on load (vs. a fresh default). */
  hasStoredPlan: boolean;
}

const PlanContext = createContext<PlanState | null>(null);

export function usePlan(): PlanState {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within a PlanProvider");
  return ctx;
}

/**
 * Holds the one active plan for the whole app so the Planner (analysis) and
 * Your Finances (inputs) tabs edit the same data. Backed by
 * localStorage["onfire:plan"] — the same key the onboarding quiz writes, so a
 * fresh sign-up flows straight through.
 */
export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [inputs, setInputsState] = useState<FireInputs>(
    DEFAULT_FIRE_FORM_VALUES,
  );
  const [hydrated, setHydrated] = useState(false);
  const [hasStoredPlan, setHasStoredPlan] = useState(false);

  // Read persisted state after mount to avoid an SSR/client hydration mismatch.
  // The one-time setState here is the intentional SSR-safe handoff path.
  useEffect(() => {
    const stored = loadPlanLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setInputsState(stored);
    setHasStoredPlan(stored !== null);
    setHydrated(true);
  }, []);

  const setInputs = (next: FireInputs) => {
    setInputsState(next);
    setHasStoredPlan(true);
    savePlanLocal(next);
  };

  return (
    <PlanContext.Provider value={{ inputs, setInputs, hydrated, hasStoredPlan }}>
      {children}
    </PlanContext.Provider>
  );
}
