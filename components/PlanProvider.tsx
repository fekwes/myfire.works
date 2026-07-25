"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DEFAULT_FIRE_FORM_VALUES } from "@/components/FireForm";
import type { FireInputs } from "@/lib/fire-engine";
import { loadPlanLocal, savePlanLocal } from "@/lib/plan-storage";
import { PROFILES_TABLE } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/client";

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
  const { user, configured } = useAuth();

  // Read persisted state after mount to avoid an SSR/client hydration mismatch.
  // The one-time setState here is the intentional SSR-safe handoff path.
  useEffect(() => {
    const stored = loadPlanLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setInputsState(stored);
    setHasStoredPlan(stored !== null);
    setHydrated(true);
  }, []);

  // When a signed-in user has no local plan yet (e.g. a fresh browser), pull
  // their most recently saved plan from Supabase so logging in restores their
  // data. We never overwrite an existing local plan (that could be newer,
  // unsaved work — they can still load others from Your Finances).
  useEffect(() => {
    if (!hydrated || !configured || !user || hasStoredPlan) return;
    let active = true;
    (async () => {
      try {
        const { data } = await createClient()
          .from(PROFILES_TABLE)
          .select("inputs")
          .order("updated_at", { ascending: false })
          .limit(1);
        const saved = data?.[0]?.inputs as FireInputs | undefined;
        if (active && saved) {
          setInputsState(saved);
          setHasStoredPlan(true);
          savePlanLocal(saved);
        }
      } catch {
        // Table missing / offline — degrade silently.
      }
    })();
    return () => {
      active = false;
    };
  }, [hydrated, configured, user, hasStoredPlan]);

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
