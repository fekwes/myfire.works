"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import type { FireInputs } from "@/lib/fire-engine";

export const DEFAULT_FIRE_FORM_VALUES: FireInputs = {
  currentAge: 35,
  retirementAge: 50,
  targetAnnualIncome: 40000,
  isaBalance: 50000,
  isaMonthlyContribution: 1000,
  sippBalance: 80000,
  sippMonthlyContribution: 500,
};

interface FireFormProps {
  value: FireInputs;
  onChange: (inputs: FireInputs) => void;
}

function Tooltip({ text }: { text: string }) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        className="text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
      >
        <Info className="size-3.5" />
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface p-2.5 text-xs leading-relaxed text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function Field({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-background transition-colors hover:border-muted-foreground/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
      {prefix && (
        <span className="pl-3 text-sm text-muted-foreground">{prefix}</span>
      )}
      <input
        type="number"
        inputMode="decimal"
        value={Number.isNaN(value) ? "" : value}
        min={min}
        step={step}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="tabular w-full min-w-0 bg-transparent px-3 py-2 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="pr-3 text-sm whitespace-nowrap text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function FireForm({ value, onChange }: FireFormProps) {
  const set = <K extends keyof FireInputs>(key: K, next: FireInputs[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 items-end gap-4">
        <Field label="Current age">
          <NumberInput
            value={value.currentAge}
            onChange={(v) => set("currentAge", v)}
            suffix="yrs"
            min={18}
          />
        </Field>
        <Field
          label="Target retirement age"
          tooltip="The age you plan to stop working. Before your SIPP unlocks at 58, your ISA/GIA bridges your income."
        >
          <NumberInput
            value={value.retirementAge}
            onChange={(v) => set("retirementAge", v)}
            suffix="yrs"
            min={value.currentAge}
          />
        </Field>
      </div>

      <Field
        label="Target net annual income"
        tooltip="The take-home income you want in retirement, after tax. The engine works out how much to draw from each pot to hit this."
      >
        <NumberInput
          value={value.targetAnnualIncome}
          onChange={(v) => set("targetAnnualIncome", v)}
          prefix="£"
          suffix="/ yr"
          step={500}
        />
      </Field>

      <div className="rounded-xl border border-border bg-surface-muted p-4">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-data-2" />
          <h3 className="text-sm font-semibold text-foreground">
            ISA / GIA — the Bridge
          </h3>
          <Tooltip text="Accessible any time, tax-free. This funds you from retirement until your SIPP unlocks at 58 — the 'bridge' phase." />
        </div>
        <div className="mt-3 grid grid-cols-2 items-end gap-4">
          <Field label="Current balance">
            <NumberInput
              value={value.isaBalance}
              onChange={(v) => set("isaBalance", v)}
              prefix="£"
            />
          </Field>
          <Field label="Monthly contribution">
            <NumberInput
              value={value.isaMonthlyContribution}
              onChange={(v) => set("isaMonthlyContribution", v)}
              prefix="£"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted p-4">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-data-1" />
          <h3 className="text-sm font-semibold text-foreground">
            SIPP — the Pension
          </h3>
          <Tooltip text="Locked until age 58. 25% can be taken tax-free, the rest is taxed as income when drawn — and topped up by your State Pension from 67." />
        </div>
        <div className="mt-3 grid grid-cols-2 items-end gap-4">
          <Field label="Current balance">
            <NumberInput
              value={value.sippBalance}
              onChange={(v) => set("sippBalance", v)}
              prefix="£"
            />
          </Field>
          <Field label="Monthly contribution">
            <NumberInput
              value={value.sippMonthlyContribution}
              onChange={(v) => set("sippMonthlyContribution", v)}
              prefix="£"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
