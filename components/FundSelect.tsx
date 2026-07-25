"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import {
  ASSET_CLASS_LABEL,
  VANGUARD_FUNDS,
  fundForGrowth,
  netGrowth,
} from "@/lib/vanguard-funds";

const pct = (f: number) => `${(f * 100).toFixed(2)}%`;

/**
 * Pick a Vanguard UK fund for a wrapper. Selecting one sets that wrapper's
 * growth to the fund's net-of-fees return; the matching preset is re-selected
 * from the current growth on reload. "Custom" keeps whatever growth is set.
 */
export function FundSelect({
  growth,
  onPick,
}: {
  growth: number | undefined;
  onPick: (netGrowth: number) => void;
}) {
  const id = useId();
  const selected = fundForGrowth(growth);

  return (
    <div>
      <div className="relative">
        <select
          id={id}
          value={selected?.id ?? "custom"}
          onChange={(e) => {
            const fund = VANGUARD_FUNDS.find((f) => f.id === e.target.value);
            if (fund) onPick(netGrowth(fund));
          }}
          className="w-full appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-9 text-sm text-foreground outline-none transition-colors hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <option value="custom">Custom growth rate</option>
          {VANGUARD_FUNDS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {selected && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {ASSET_CLASS_LABEL[selected.assetClass]} · {selected.blurb} Net{" "}
          <span className="font-medium text-foreground tabular">
            {pct(netGrowth(selected))}
          </span>{" "}
          after its {pct(selected.ocf)} OCF and the 0.15% platform fee.
        </p>
      )}
    </div>
  );
}
