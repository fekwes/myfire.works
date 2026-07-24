"use client";

import { Info } from "lucide-react";
import { useMemo } from "react";
import { usePlan } from "@/components/PlanProvider";
import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { estimateFeeDrag, fundForGrowth } from "@/lib/vanguard-funds";

/**
 * Fee-drag readout: the estimated £ your funds' OCFs and the Vanguard platform
 * fee cost you by retirement, shown only once at least one wrapper is on a
 * named preset (so the OCFs are known).
 */
export function FeeDragCard() {
  const { inputs } = usePlan();
  const usingPresets =
    !!fundForGrowth(inputs.isaGrowth) ||
    !!fundForGrowth(inputs.sippGrowth) ||
    !!fundForGrowth(inputs.giaGrowth);
  const drag = useMemo(() => estimateFeeDrag(inputs), [inputs]);

  if (!usingPresets || drag < 1) return null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-primary">
          <Info className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Fees cost you about{" "}
            <span className="tabular text-danger">{formatCurrency(drag)}</span>{" "}
            by age {inputs.retirementAge}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            That&apos;s the growth your pot forgoes to fund OCFs plus Vanguard&apos;s
            0.15% platform fee (capped at £375/yr). Cheaper trackers keep more of
            it — compare the funds above.
          </p>
        </div>
      </div>
    </Card>
  );
}
