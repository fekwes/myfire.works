"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DropPasteInput, type ImportPlanData } from "@/components/DropPasteInput";
import { FeeDragCard } from "@/components/FeeDragCard";
import {
  FINANCE_SECTIONS,
  type FinanceSectionId,
  FinancesNav,
} from "@/components/FinancesNav";
import { FireForm } from "@/components/FireForm";
import { usePlan } from "@/components/PlanProvider";
import { SavedPlans } from "@/components/SavedPlans";
import { ButtonLink, Card } from "@/components/ui";

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
  const [showImport, setShowImport] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});

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

  const applyImportedPlan = (data: ImportPlanData) => {
    const nextInputs = {
      ...inputs,
      isaBalance:
        data.wrappers.isa !== null && data.wrappers.isa > 0
          ? data.wrappers.isa
          : inputs.isaBalance,
      sippBalance:
        data.wrappers.sipp !== null && data.wrappers.sipp > 0
          ? data.wrappers.sipp
          : inputs.sippBalance,
      giaBalance:
        data.wrappers.gia !== null && data.wrappers.gia > 0
          ? data.wrappers.gia
          : inputs.giaBalance,
      isaMonthlyContribution:
        data.wrappers.monthlyContribution !== null && data.wrappers.monthlyContribution > 0
          ? data.wrappers.monthlyContribution
          : inputs.isaMonthlyContribution,
      sippMonthlyContribution:
        data.wrappers.monthlyContribution !== null && data.wrappers.monthlyContribution > 0
          ? data.wrappers.monthlyContribution
          : inputs.sippMonthlyContribution,
      giaMonthlyContribution:
        data.wrappers.monthlyContribution !== null && data.wrappers.monthlyContribution > 0
          ? data.wrappers.monthlyContribution
          : inputs.giaMonthlyContribution ?? 0,
    };

    setInputs(nextInputs);
    setHighlightedFields({
      isaBalance: data.wrappers.isa !== null && data.wrappers.isa > 0,
      isaMonthlyContribution:
        data.wrappers.monthlyContribution !== null && data.wrappers.monthlyContribution > 0,
      sippBalance: data.wrappers.sipp !== null && data.wrappers.sipp > 0,
      sippMonthlyContribution:
        data.wrappers.monthlyContribution !== null && data.wrappers.monthlyContribution > 0,
      giaBalance: data.wrappers.gia !== null && data.wrappers.gia > 0,
    });
    setImportNotice(data.warning ?? null);
    setShowImport(false);
  };

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
          <ButtonLink href="/planner">View dashboard →</ButtonLink>
        </div>
      </Card>

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
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Import balances
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Paste a Vanguard-style statement or a free-text valuation to pre-fill the review fields.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImport((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Sparkles className="size-3.5" />
                {showImport ? "Hide importer" : "Import statement"}
              </button>
            </div>
            {showImport && (
              <div className="mb-4 rounded-lg border border-border bg-surface-muted p-3">
                <DropPasteInput onPlanImported={applyImportedPlan} onClose={() => setShowImport(false)} />
              </div>
            )}
            {importNotice && (
              <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                {importNotice}
              </div>
            )}
            <FireForm
              value={inputs}
              onChange={setInputs}
              activeSection={active}
              highlightedFields={highlightedFields}
            />
          </Card>
          <FeeDragCard />
        </div>
      </div>
    </div>
  );
}
