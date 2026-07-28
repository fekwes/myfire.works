"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DEFAULT_FIRE_FORM_VALUES } from "@/components/FireForm";
import type { FireInputs } from "@/lib/fire-engine";
import { loadPlanLocal, savePlanLocal, getActiveRegionLocal, setActiveRegionLocal } from "@/lib/plan-storage";
import { decidePlanSync, FIRST_PROFILE_NAME } from "@/lib/plan-sync";
import {
  describeProfileError,
  parseProfileRows,
  PROFILES_TABLE,
} from "@/lib/profiles";
import { createClient } from "@/lib/supabase/client";
import { CountryPack } from "@/lib/countries/types";
import { getPack } from "@/lib/countries";

interface PlanState {
  activeRegion: "uk" | "us";
  setActiveRegion: (region: "uk" | "us") => void;
  activePack: CountryPack;
  /** The single active plan, shared across the Planner and Your Finances tabs. */
  inputs: FireInputs;
  /** Update the active plan (and persist it to localStorage). */
  setInputs: (inputs: FireInputs) => void;
  /** True once the stored plan (if any) has been read after mount. */
  hydrated: boolean;
  /** Whether a plan was found in storage on load (vs. a fresh default). */
  hasStoredPlan: boolean;
  /**
   * Set when a signed-in user's saved plan could not be read back. Distinct
   * from "they have no saved plan": showing someone the blank defaults after a
   * failed read looks exactly like their data being thrown away, so whoever
   * renders the plan must be able to say what actually happened.
   */
  restoreError: string | null;
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
  const [activeRegion, setActiveRegionState] = useState<"uk" | "us">("uk");
  const [inputs, setInputsState] = useState<FireInputs>(DEFAULT_FIRE_FORM_VALUES);
  const [hydrated, setHydrated] = useState(false);
  const [hasStoredPlan, setHasStoredPlan] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  /** The user id we've already reconciled against, so the sync runs once. */
  const syncedForUser = useRef<string | null>(null);
  const { user, configured } = useAuth();

  // Read persisted state after mount to avoid an SSR/client hydration mismatch.
  // The one-time setState here is the intentional SSR-safe handoff path.
  useEffect(() => {
    const region = getActiveRegionLocal();
    if (region !== "uk") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveRegionState(region);
    }
    const stored = loadPlanLocal(region);
    if (stored) {
      setInputsState(stored);
    }
    setHasStoredPlan(stored !== null);
    setHydrated(true);
  }, []);

  // Reconcile the local plan with the account, once, whenever a session
  // appears. `decidePlanSync` holds the policy and the reasoning; this effect
  // is just the I/O around it.
  //
  // Two things it must not do. It must not treat a failed read as "you have no
  // saved plans" — that shows someone the blank defaults and reads as their
  // data being gone — so `restoreError` is surfaced. And it must not feed a
  // row's `jsonb` straight to the engine: `parseProfileRows` runs it through
  // the same validator as localStorage and share links, because a blob written
  // by an older build is untrusted input like any other.
  useEffect(() => {
    if (!hydrated || !configured || !user) return;
    // Once per session, not once per render — an adopt writes a row, and a
    // re-run would either duplicate work or trip the (user_id, name) unique
    // constraint and report a name clash the user never caused.
    if (syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;

    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .select("id, name, inputs, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      // Filter the data down to the active region since Supabase JSONB queries are tricky,
      // and we expect the number of profiles per user to be small.
      const regionData = data?.filter(row => {
        const inputsObj = row.inputs as Record<string, unknown>;
        const country = typeof inputsObj?.country === "string" ? inputsObj.country : "uk";
        return country === activeRegion;
      }) ?? [];
      if (!active) return;
      if (error) {
        setRestoreError(
          describeProfileError(error, "read") ?? "Couldn't load your saved plans.",
        );
        // Let a later session retry rather than leaving this account unsynced.
        syncedForUser.current = null;
        return;
      }

      const action = decidePlanSync({
        hasLocalPlan: hasStoredPlan,
        saved: parseProfileRows(regionData).profiles,
      });

      if (action.kind === "restore") {
        setInputsState(action.inputs);
        setHasStoredPlan(true);
        savePlanLocal(activeRegion, action.inputs);
        return;
      }

      if (action.kind === "adopt-local") {
        const { error: saveError } = await supabase.from(PROFILES_TABLE).insert({
          user_id: user.id,
          name: FIRST_PROFILE_NAME,
          inputs: { ...inputs, country: activeRegion },
          updated_at: new Date().toISOString(),
        });
        if (active && saveError) {
          setRestoreError(
            `${
              describeProfileError(saveError) ?? "Couldn't save your plan."
            } It's still on this device — try Save on the Edit plan screen.`,
          );
        }
      }
    })();
    return () => {
      active = false;
    };
    // `inputs` is deliberately not a dependency: this reads the plan as it
    // stands when a session appears, and must not re-run on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, configured, user, hasStoredPlan, activeRegion]);

  const setInputs = (next: FireInputs) => {
    setInputsState(next);
    setHasStoredPlan(true);
    savePlanLocal(activeRegion, next);
  };
  
  const setActiveRegion = (region: "uk" | "us") => {
    if (region === activeRegion) return;
    setActiveRegionState(region);
    setActiveRegionLocal(region);
    syncedForUser.current = null; // Re-sync when switching regions
    
    // Load the local plan for the new region
    const stored = loadPlanLocal(region);
    if (stored) {
      setInputsState(stored);
      setHasStoredPlan(true);
    } else {
      setInputsState({ ...DEFAULT_FIRE_FORM_VALUES, country: region });
      setHasStoredPlan(false);
    }
  };

  const activePack = getPack(activeRegion);

  return (
    <PlanContext.Provider
      value={{ activeRegion, setActiveRegion, activePack, inputs, setInputs, hydrated, hasStoredPlan, restoreError }}
    >
      {children}
    </PlanContext.Provider>
  );
}
