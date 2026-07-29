"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { FeeDragCard } from "@/components/FeeDragCard";
import {
  FINANCE_SECTIONS,
  type FinanceSectionId,
  FinancesNav,
} from "@/components/FinancesNav";
import { FireForm } from "@/components/FireForm";
import { usePlan } from "@/components/PlanProvider";
import { SavedPlans } from "@/components/SavedPlans";
import { ButtonLink, Card, Button } from "@/components/ui";
import { Sparkles } from "lucide-react";
import { PlanImport } from "@/components/quiz/PlanImport";

const SECTION_IDS = FINANCE_SECTIONS.map((s) => s.id) as readonly string[];
const isSectionId = (v: string): v is FinanceSectionId =>
  SECTION_IDS.includes(v);

/**
 * Your Finances — the full detail behind the plan: balances, contributions,
 * property, growth rates, inflation and the statutory scenario, plus saved
 * snapshots. Edits flow straight to the Planner through the shared plan state.
 */
export function FinancesPanel() {
  const { inputs, setInputs } = usePlan();
  const { configured, user } = useAuth();
  const [active, setActive] = useState<FinanceSectionId>("basics");

  // Deep-link support: the dashboard checklist links to /finances#balances,
  // #funds, #scenario, etc. Select the matching tab on load and whenever the
  // hash changes (e.g. a checklist link clicked while already here).
  useEffect(() => {
    const syncFromHash = () => {
      const id = window.location.hash.replace("#", "");
      if (id && isSectionId(id)) setActive(id);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const selectSection = (id: FinanceSectionId) => {
    setActive(id);
    // Reflect the tab in the URL without scrolling the page.
    window.history.replaceState(null, "", `#${id}`);
  };

  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Edit plan
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Everything behind your plan. Change anything here and your{" "}
              <Link
                href="/planner"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                dashboard
              </Link>{" "}
              updates instantly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setImporting(!importing);
                setImportSuccessMsg(null);
              }}
              className="gap-2 text-brand"
            >
              <Sparkles className="size-4" />
              Import with AI
            </Button>
            <ButtonLink href="/planner">View dashboard →</ButtonLink>
          </div>
        </div>
      </Card>

      {importSuccessMsg && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success font-medium flex items-center justify-between">
          <span>✨ {importSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setImportSuccessMsg(null)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {importing && (
        <Card padding="lg" className="border-brand/30 bg-brand/5 shadow-sm">
          <PlanImport
            onImport={(plan) => {
              // Merge imported figures directly with existing inputs and update the finances form
              setInputs({
                ...inputs,
                ...plan,
                pots: plan.pots ?? inputs.pots,
              });
              setImporting(false);
              setImportSuccessMsg(
                "Your plan was imported with AI! Asset balances and contributions have been updated directly in your finances below."
              );
            }}
            onCancel={() => setImporting(false)}
          />
        </Card>
      )}

      {/* Before sign-in this is just a one-line nudge (SavedPlans renders the
          dashed prompt itself); the full Profiles card only appears once signed
          in, when there's actually something to manage. */}
      {configured &&
        (user ? (
          <Card>
            <h2 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Profiles
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Keep as many versions of your plan as you like — &ldquo;retire at
              55&rdquo;, &ldquo;with the rental&rdquo;, a leaner target — and load
              any of them back.
            </p>
            <div className="mt-4">
              <SavedPlans inputs={inputs} onLoad={setInputs} />
            </div>
          </Card>
        ) : (
          <SavedPlans inputs={inputs} onLoad={setInputs} />
        ))}

      {/* Rail alongside the form on large screens; a chip row above it below. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <FinancesNav active={active} onSelect={selectSection} />
        <div className="min-w-0 space-y-5">
          <Card padding="lg">
            <FireForm
              value={inputs}
              onChange={setInputs}
              activeSection={active}
            />
          </Card>
          <FeeDragCard />
        </div>
      </div>
    </div>
  );
}
