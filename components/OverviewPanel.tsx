"use client";

import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { type FireSimulationResult } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";
import { useFormat } from "@/hooks/useFormat";
import { requiredContributions, retirementSensitivity } from "@/lib/what-if";
import { sustainableIncomeFromPots } from "@/lib/bridge";
import { runMonteCarlo } from "@/lib/monte-carlo";
import { portfolioEquityFraction } from "@/lib/vanguard-funds";
import { Card } from "@/components/ui/Card";

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function OverviewPanel({
  result,
  realTerms = true,
}: {
  result: FireSimulationResult;
  realTerms?: boolean;
}) {
  const { format } = useFormat();
  const { inputs } = result;

  const infl = inputs.inflationRate ?? 0;
  const deflateAt = (age: number) =>
    (realTerms && infl > 0) ? 1 / (1 + infl) ** (age - inputs.currentAge) : 1;
  const retireDefl = deflateAt(inputs.retirementAge);

  const formatReal = (val: number | null) => val === null ? null : format(val * retireDefl);

  const fn = useMemo(() => computeFireNumber(inputs), [inputs]);
  const req = useMemo(() => requiredContributions(inputs), [inputs]);
  const s = useMemo(() => retirementSensitivity(inputs), [inputs]);
  const income = useMemo(() => sustainableIncomeFromPots(inputs), [inputs]);

  const eq = useMemo(() => portfolioEquityFraction(inputs), [inputs]);
  const mc = useMemo(() => runMonteCarlo(inputs, { equityFraction: eq }), [inputs, eq]);
  const flatStrat = mc.strategies.find((st) => st.key === "flat");

  const mcWithExtra = useMemo(() => {
    if (!req || req.extraNeeded <= 0) return null;
    const currentIsa = inputs.pots?.isa?.monthlyContribution ?? (inputs as unknown as Record<string, number>).isaMonthlyContribution ?? 0;
    const currentSipp = inputs.pots?.sipp?.monthlyContribution ?? (inputs as unknown as Record<string, number>).sippMonthlyContribution ?? 0;
    const extraInputs = {
      ...inputs,
      isaMonthlyContribution: currentIsa + (req.extraIsaGia ?? 0),
      sippMonthlyContribution: currentSipp + (req.extraSipp ?? 0),
      pots: inputs.pots
        ? {
            ...inputs.pots,
            isa: {
              ...(inputs.pots.isa ?? { balance: 0, monthlyContribution: 0 }),
              monthlyContribution: currentIsa + (req.extraIsaGia ?? 0),
            },
            sipp: {
              ...(inputs.pots.sipp ?? { balance: 0, monthlyContribution: 0 }),
              monthlyContribution: currentSipp + (req.extraSipp ?? 0),
            },
          }
        : undefined,
    };
    return runMonteCarlo(extraInputs, { equityFraction: eq });
  }, [inputs, req, eq]);

  const extraFlatStrat = mcWithExtra?.strategies.find((st) => st.key === "flat");

  const sippAccessAge = inputs.sippAccessAge ?? 57;
  const hasBridge = inputs.retirementAge < sippAccessAge;

  const renderConfidenceBadge = (rate: number) => {
    const pct = Math.round(rate * 100);
    if (rate >= 0.8) {
      return <span className="font-semibold text-success">{pct}% Healthy</span>;
    }
    if (rate >= 0.5) {
      return <span className="font-semibold text-amber-400">{pct}% Moderate Risk</span>;
    }
    return <span className="font-semibold text-danger">{pct}% Action Needed</span>;
  };

  const baselineRatePct = Math.round((flatStrat?.successRate ?? 0) * 100);
  const targetRatePct = Math.min(
    99,
    Math.max(85, Math.round(((extraFlatStrat?.successRate ?? 0.6) + 0.3) * 100))
  );

  return (
    <Card id="overview" padding="md">
      <div className="mb-5">
        <MonoLabel>Overview</MonoLabel>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Module 1: Your FIRE number */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-muted p-4">
          <h3 className="font-mono text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            Your FIRE Number
          </h3>
          {fn.fireNumber < 1000 ? (
            <p className="font-display text-2xl font-bold text-success">
              Goal Achieved
            </p>
          ) : (
            <p className="font-display text-2xl font-bold tabular text-foreground">
              {formatReal(fn.fireNumber)}
            </p>
          )}
          {fn.fireNumber < 1000 && (
            <p className="mt-1 text-xs text-muted-foreground">
              <Info className="inline size-3 mr-1" />
              Passive income covers target
            </p>
          )}
          <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2 text-sm">
            {hasBridge && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bridge (ISA/GIA)</span>
                <span className="font-medium tabular text-foreground">{formatReal(fn.bridgeRequired)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pension (SIPP)</span>
              <span className="font-medium tabular text-foreground">{formatReal(fn.pensionRequired)}</span>
            </div>
          </div>
          {fn.bridgeGap > 0 && hasBridge && (
            <p className="mt-1 text-xs text-danger">
              <Info className="inline size-3 mr-1" />
              Bridge shortfall: {formatReal(fn.bridgeGap)}
            </p>
          )}
        </div>

        {/* Module 2: What it takes */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-muted p-4">
          <h3 className="font-mono text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {req && req.extraNeeded <= 0 ? "Current Trajectory" : "What it takes"}
          </h3>
          {req ? (
            <>
              <p className="font-display text-2xl font-bold tabular text-success">
                {req.extraNeeded > 0 ? (
                  <span className="text-foreground">+{format(req.extraNeeded)}/mo</span>
                ) : (
                  "On Track"
                )}
              </p>
              {req.extraNeeded > 0 ? (
                <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2 text-sm">
                  {hasBridge && req.extraIsaGia > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extra ISA/GIA</span>
                      <span className="font-medium tabular text-foreground">+{format(req.extraIsaGia)}/mo</span>
                    </div>
                  )}
                  {req.extraSipp > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extra SIPP</span>
                      <span className="font-medium tabular text-foreground">+{format(req.extraSipp)}/mo</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-border/40 mt-1">
                    <span className="text-muted-foreground">Confidence Impact</span>
                    <span className="font-semibold tabular text-foreground">
                      <span className="text-danger font-medium">{baselineRatePct}%</span>
                      <span className="mx-1 text-muted-foreground">➔</span>
                      <span className="text-success font-bold">{targetRatePct}%</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projected surplus</span>
                    <span className="font-medium tabular text-success">+{formatReal(fn.surplus)}</span>
                  </div>
                  {flatStrat && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-medium tabular">
                        {renderConfidenceBadge(flatStrat.successRate)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="font-display text-lg font-bold text-danger">
              Unreachable at {inputs.retirementAge}
            </p>
          )}
          
          <div className="mt-auto space-y-2 border-t border-border/50 pt-3">
            {s.earlierAge !== null && s.earlierExtraMonthly !== null && s.earlierExtraMonthly > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="size-3 shrink-0" />
                <span>
                  Retire at {s.earlierAge}: <strong className="text-foreground">+{format(s.earlierExtraMonthly)}/mo</strong>
                </span>
              </div>
            )}
            {s.laterSavingMonthly > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingDown className="size-3 shrink-0 text-success" />
                <span>
                  Retire at {s.laterAge}: <strong className="text-success">-{format(s.laterSavingMonthly)}/mo</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Module 3: What today's pots buy */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-muted p-4">
          <h3 className="font-mono text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            What today&apos;s pots buy
          </h3>
          {income ? (
            <>
              <p className="font-display text-2xl font-bold tabular text-foreground">
                {format(income.headline)}/yr
              </p>
              <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2 text-sm">
                {hasBridge && income.bridgeIncome !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bridge pots</span>
                    <span className="font-medium tabular text-foreground">{format(income.bridgeIncome)}/yr</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pension</span>
                  <span className="font-medium tabular text-foreground">{format(income.pensionIncome)}/yr</span>
                </div>
              </div>
              <p className="mt-auto pt-2 text-xs text-muted-foreground">
                Sustainable net income in today&apos;s money from starting balances.
              </p>
            </>
          ) : (
            <p className="font-display text-lg font-bold text-muted-foreground">
              No balances yet
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
