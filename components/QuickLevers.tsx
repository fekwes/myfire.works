"use client";

import Link from "next/link";
import { Field, NumberInput } from "@/components/FireForm";
import { usePlan } from "@/components/PlanProvider";
import { Card } from "@/components/ui";
import type { FireInputs } from "@/lib/fire-engine";

/**
 * The handful of inputs people tweak most while watching the result. The full
 * detail (balances, property, growth, scenario) lives in Your Finances; this
 * keeps the Planner iterative without dragging the whole form onto it.
 */
export function QuickLevers() {
  const { inputs, setInputs } = usePlan();
  const set = <K extends keyof FireInputs>(key: K, value: FireInputs[K]) =>
    setInputs({ ...inputs, [key]: value });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Quick levers
        </h3>
        <Link
          href="/finances"
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Edit all your finances →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Field label="Current age">
          <NumberInput
            value={inputs.currentAge}
            onChange={(v) => set("currentAge", v)}
            suffix="yrs"
            min={18}
          />
        </Field>
        <Field label="Retire at">
          <NumberInput
            value={inputs.retirementAge}
            onChange={(v) => set("retirementAge", v)}
            suffix="yrs"
            min={inputs.currentAge}
          />
        </Field>
        <Field label="Target income">
          <NumberInput
            value={inputs.targetAnnualIncome}
            onChange={(v) => set("targetAnnualIncome", v)}
            prefix="£"
            step={500}
          />
        </Field>
        <Field label="ISA / mo">
          <NumberInput
            value={inputs.isaMonthlyContribution}
            onChange={(v) => set("isaMonthlyContribution", v)}
            prefix="£"
          />
        </Field>
        <Field label="Pension / mo">
          <NumberInput
            value={inputs.sippMonthlyContribution}
            onChange={(v) => set("sippMonthlyContribution", v)}
            prefix="£"
          />
        </Field>
      </div>
    </Card>
  );
}
