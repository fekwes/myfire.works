"use client";

import { Info } from "lucide-react";
import { useMemo } from "react";
import { usePlan } from "@/components/PlanProvider";
import { Card } from "@/components/ui";
import { useFormat } from "@/hooks/useFormat";
import { estimateFeeDrag } from "@/lib/vanguard-funds";

/**
 * Fee-drag readout: the estimated £ your funds' OCFs and the platform fee cost
 * you by retirement, shown only once at least one wrapper has a defined
 * portfolio (so the OCFs are known).
 */
export function FeeDragCard() {
  const { inputs } = usePlan();
  const hasPortfolio = inputs.pots
    ? Object.values(inputs.pots).some((p) => (p.holdings?.length ?? 0) > 0)
    : ((inputs.isaHoldings ?? [])?.length ?? 0) > 0 ||
      ((inputs.sippHoldings ?? [])?.length ?? 0) > 0 ||
      ((inputs.giaHoldings ?? [])?.length ?? 0) > 0;
  const { format } = useFormat();
  const drag = useMemo(() => estimateFeeDrag(inputs), [inputs]);

  if (!hasPortfolio || drag < 1) return null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-primary">
          <Info className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Fees cost you about{" "}
            <span className="tabular text-danger">{format(drag)}</span>{" "}
            by age {inputs.retirementAge}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            That&apos;s the growth your pot forgoes to fund OCFs plus Vanguard&apos;s
            0.15% platform fee (capped at {format(375)}/yr). Cheaper trackers keep more of
            it — compare the funds above.
          </p>
        </div>
      </div>
    </Card>
  );
}
