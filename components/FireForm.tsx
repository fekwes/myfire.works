"use client";

import { ChevronDown, Info } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import {
  DEFAULT_ASSUMPTIONS,
  type FireInputs,
  type PensionStrategy,
} from "@/lib/fire-engine";

export const DEFAULT_FIRE_FORM_VALUES: FireInputs = {
  currentAge: 35,
  retirementAge: 50,
  targetAnnualIncome: 40000,
  isaBalance: 50000,
  isaMonthlyContribution: 1000,
  isaGrowth: 0.05,
  giaBalance: 0,
  giaMonthlyContribution: 0,
  giaGrowth: 0.05,
  rentalValue: 0,
  rentalGrowth: 0.03,
  rentalMonthlyIncome: 0,
  rentalSaleAge: 0,
  homeValue: 0,
  homeGrowth: 0.03,
  downsizeAge: 0,
  downsizeReleaseFraction: 0,
  sippBalance: 80000,
  sippMonthlyContribution: 500,
  sippGrowth: 0.05,
  statePensionAnnual: DEFAULT_ASSUMPTIONS.statePensionAnnual,
  statePensionAge: DEFAULT_ASSUMPTIONS.statePensionAge,
  sippAccessAge: DEFAULT_ASSUMPTIONS.sippAccessAge,
  pensionStrategy: DEFAULT_ASSUMPTIONS.pensionStrategy,
  lifeExpectancyAge: DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
};

interface FireFormProps {
  value: FireInputs;
  onChange: (inputs: FireInputs) => void;
}

function Tooltip({ text }: { text: string }) {
  const id = useId();
  return (
    <span className="group/tip relative inline-flex">
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
        className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 w-52 max-w-[calc(100vw-2.5rem)] rounded-lg border border-border bg-surface p-2.5 text-xs leading-relaxed text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
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
  className,
}: {
  label: string;
  tooltip?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
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
        min={Number.isFinite(min) ? min : undefined}
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

/** Percentage input: stores a fraction (0.05) but displays a percentage (5). */
function PercentInput({
  value,
  onChange,
  suffix = "% / yr",
}: {
  value: number;
  onChange: (fraction: number) => void;
  suffix?: string;
}) {
  return (
    <NumberInput
      value={Math.round(value * 1000) / 10}
      onChange={(v) => onChange((v || 0) / 100)}
      suffix={suffix}
      step={0.5}
    />
  );
}

function Block({
  title,
  dotClass,
  tooltip,
  children,
}: {
  title: string;
  dotClass?: string;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <div className="flex items-center gap-1.5">
        {dotClass && <span className={`size-2 rounded-full ${dotClass}`} />}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div className="mt-3 grid grid-cols-2 items-end gap-4">{children}</div>
    </div>
  );
}

export function FireForm({ value, onChange }: FireFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = <K extends keyof FireInputs>(key: K, next: FireInputs[K]) =>
    onChange({ ...value, [key]: next });

  const num = (v: number | undefined, fallback: number) =>
    v === undefined ? fallback : v;

  return (
    <div className="space-y-5">
      {/* Essentials */}
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
          label="Retirement age"
          tooltip="When you plan to stop working. Your ISA/GIA bridges income until your SIPP unlocks."
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
        tooltip="The take-home income you want in retirement, after tax."
      >
        <NumberInput
          value={value.targetAnnualIncome}
          onChange={(v) => set("targetAnnualIncome", v)}
          prefix="£"
          suffix="/ yr"
          step={500}
        />
      </Field>

      <Block
        title="ISA — tax-free bridge"
        dotClass="bg-data-2"
        tooltip="Accessible any time, completely tax-free. Drawn first."
      >
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
        <Field label="Expected growth" className="col-span-2">
          <PercentInput
            value={num(value.isaGrowth, 0.05)}
            onChange={(v) => set("isaGrowth", v)}
          />
        </Field>
      </Block>

      <Block
        title="SIPP — the pension"
        dotClass="bg-data-1"
        tooltip="Locked until your access age. Drawn as taxable income (25% is tax-free), topped up by your State Pension."
      >
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
        <Field label="Expected growth" className="col-span-2">
          <PercentInput
            value={num(value.sippGrowth, 0.05)}
            onChange={(v) => set("sippGrowth", v)}
          />
        </Field>
      </Block>

      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        aria-expanded={showAdvanced}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-surface-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-muted-foreground/40"
      >
        <span>
          {showAdvanced ? "Fewer options" : "More options"}
          <span className="ml-1.5 text-muted-foreground">
            GIA · property · lifestyle scenario
          </span>
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${
            showAdvanced ? "rotate-180" : ""
          }`}
        />
      </button>

      {showAdvanced && (
        <div className="space-y-5">
          <Block
            title="Other investments — GIA"
            dotClass="bg-data-3"
            tooltip="A General Investment Account: drawn after the ISA, with Capital Gains Tax on gains above the £3,000 exemption. (Property support is coming.)"
          >
            <Field label="Current balance">
              <NumberInput
                value={num(value.giaBalance, 0)}
                onChange={(v) => set("giaBalance", v)}
                prefix="£"
              />
            </Field>
            <Field label="Monthly contribution">
              <NumberInput
                value={num(value.giaMonthlyContribution, 0)}
                onChange={(v) => set("giaMonthlyContribution", v)}
                prefix="£"
              />
            </Field>
            <Field label="Expected growth" className="col-span-2">
              <PercentInput
                value={num(value.giaGrowth, 0.05)}
                onChange={(v) => set("giaGrowth", v)}
              />
            </Field>
          </Block>

          <Block
            title="Rental property"
            dotClass="bg-accent"
            tooltip="Rental income is taxed as income and offsets your target in retirement. Optionally sell it later — residential CGT applies and the net proceeds move into your GIA."
          >
            <Field label="Current value">
              <NumberInput
                value={num(value.rentalValue, 0)}
                onChange={(v) => set("rentalValue", v)}
                prefix="£"
              />
            </Field>
            <Field label="Monthly rent">
              <NumberInput
                value={num(value.rentalMonthlyIncome, 0)}
                onChange={(v) => set("rentalMonthlyIncome", v)}
                prefix="£"
              />
            </Field>
            <Field label="Expected growth">
              <PercentInput
                value={num(value.rentalGrowth, 0.03)}
                onChange={(v) => set("rentalGrowth", v)}
              />
            </Field>
            <Field
              label="Sell at age"
              tooltip="Leave at 0 to keep it. Otherwise it's sold at this age (residential CGT), proceeds go to your GIA, and the rent stops."
            >
              <NumberInput
                value={num(value.rentalSaleAge, 0)}
                onChange={(v) => set("rentalSaleAge", v)}
                suffix="0 = keep"
              />
            </Field>
          </Block>

          <Block
            title="Home you live in"
            tooltip="Counts as net worth and grows, but isn't drawn for income — unless you downsize, which releases tax-free cash (primary-residence relief) into your GIA."
          >
            <Field label="Current value">
              <NumberInput
                value={num(value.homeValue, 0)}
                onChange={(v) => set("homeValue", v)}
                prefix="£"
              />
            </Field>
            <Field label="Expected growth">
              <PercentInput
                value={num(value.homeGrowth, 0.03)}
                onChange={(v) => set("homeGrowth", v)}
              />
            </Field>
            <Field
              label="Downsize at age"
              tooltip="Leave at 0 for no downsizing. Otherwise release a share of the home's value as tax-free cash at this age."
            >
              <NumberInput
                value={num(value.downsizeAge, 0)}
                onChange={(v) => set("downsizeAge", v)}
                suffix="0 = never"
              />
            </Field>
            <Field label="Release">
              <PercentInput
                value={num(value.downsizeReleaseFraction, 0)}
                onChange={(v) => set("downsizeReleaseFraction", v)}
                suffix="%"
              />
            </Field>
          </Block>

          <div className="rounded-xl border border-border bg-surface-muted p-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Lifestyle scenario
              </h3>
              <Tooltip text="How you take your pension, the statutory ages, and how long the plan must last." />
            </div>

            <div className="mt-3 space-y-4">
              <Field
                label="Pension access"
                tooltip="Gradual (UFPLS): 25% of every withdrawal is tax-free — usually the most tax-efficient. Lump sum: take the 25% tax-free cash up front (it goes into your GIA)."
              >
                <PensionStrategyToggle
                  value={
                    value.pensionStrategy ?? DEFAULT_ASSUMPTIONS.pensionStrategy
                  }
                  onChange={(v) => set("pensionStrategy", v)}
                />
              </Field>

              <div className="grid grid-cols-2 items-end gap-4">
                <Field
                  label="SIPP access age"
                  tooltip="UK minimum pension age is 55 today, rising to 57 in April 2028 — the default here."
                >
                  <NumberInput
                    value={num(
                      value.sippAccessAge,
                      DEFAULT_ASSUMPTIONS.sippAccessAge,
                    )}
                    onChange={(v) => set("sippAccessAge", v)}
                    suffix="yrs"
                    min={value.retirementAge}
                  />
                </Field>
                <Field
                  label="Plan lasts to"
                  tooltip="The age the plan must fund. The projection runs every year up to here."
                >
                  <NumberInput
                    value={num(
                      value.lifeExpectancyAge,
                      DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
                    )}
                    onChange={(v) => set("lifeExpectancyAge", v)}
                    suffix="yrs"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 items-end gap-4">
                <Field
                  label="State Pension age"
                  tooltip="66 today, rising to 67 (2026–2028) then 68. Default is 67."
                >
                  <NumberInput
                    value={num(
                      value.statePensionAge,
                      DEFAULT_ASSUMPTIONS.statePensionAge,
                    )}
                    onChange={(v) => set("statePensionAge", v)}
                    suffix="yrs"
                  />
                </Field>
                <Field
                  label="State Pension"
                  tooltip="Full new State Pension for 2026/27 is £12,548/yr. Lower it if your National Insurance record is incomplete."
                >
                  <NumberInput
                    value={num(
                      value.statePensionAnnual,
                      DEFAULT_ASSUMPTIONS.statePensionAnnual,
                    )}
                    onChange={(v) => set("statePensionAnnual", v)}
                    prefix="£"
                    suffix="/ yr"
                    step={100}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PensionStrategyToggle({
  value,
  onChange,
}: {
  value: PensionStrategy;
  onChange: (v: PensionStrategy) => void;
}) {
  const opt = (v: PensionStrategy, label: string) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={value === v}
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
        value === v
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
      {opt("gradual", "Gradual (25% spread)")}
      {opt("lump-sum", "Lump sum")}
    </div>
  );
}
