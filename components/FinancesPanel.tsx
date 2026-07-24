"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { FireForm } from "@/components/FireForm";
import { usePlan } from "@/components/PlanProvider";
import { SavedPlans } from "@/components/SavedPlans";
import { ButtonLink, Card } from "@/components/ui";

/**
 * Your Finances — the full detail behind the plan: balances, contributions,
 * property, growth rates, inflation and the statutory scenario, plus saved
 * snapshots. Edits flow straight to the Planner through the shared plan state.
 */
export function FinancesPanel() {
  const { inputs, setInputs } = usePlan();
  const { configured } = useAuth();

  return (
    <div className="space-y-5">
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Your finances
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Everything behind your plan. Change anything here and your{" "}
              <Link
                href="/planner"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                planner
              </Link>{" "}
              updates instantly.
            </p>
          </div>
          <ButtonLink href="/planner">View your plan →</ButtonLink>
        </div>
      </Card>

      {configured && (
        <Card>
          <h2 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Saved plans
          </h2>
          <div className="mt-4">
            <SavedPlans inputs={inputs} onLoad={setInputs} />
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Your details
        </h2>
        <div className="mt-5">
          <FireForm value={inputs} onChange={setInputs} />
        </div>
      </Card>
    </div>
  );
}
