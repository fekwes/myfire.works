"use client";

import { useMemo } from "react";
import { usePlan } from "@/components/PlanProvider";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

/**
 * Returns `format` and `formatCompact` functions pre-bound to the active
 * region's locale and currency, so components don't need to thread the
 * pack through every call site.
 */
export function useFormat() {
  const { activePack } = usePlan();
  const { locale, code } = activePack.currency;

  return useMemo(() => {
    const opts = { locale, currency: code };
    return {
      format: (value: number) => formatCurrency(value, opts),
      formatCompact: (value: number) => formatCurrencyCompact(value, opts),
    };
  }, [locale, code]);
}
