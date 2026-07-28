"use client";

import Link from "next/link";
import {
  Receipt,
  Route,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { useRegion } from "@/components/RegionProvider";

export function LandingFeatures() {
  const { region, details } = useRegion();

  const isUk = region === "uk";

  const FEATURES = [
    {
      Icon: Receipt,
      badge: isUk ? "UK Tax Engine 2026/27" : "US Federal Tax 2026",
      title: "The tax you'll actually pay",
      body: isUk
        ? "Generic 4% tools ignore tax drag. Fireworks models progressive UK income tax bands, personal allowance tapers above £100k, CGT above the £3,000 exemption, and the 25% SIPP tax-free allowance year by year."
        : "Generic 4% tools ignore tax drag. Fireworks models 2026 US Federal tax brackets, Standard Deduction ($15,000), Long-Term Capital Gains exemptions (0%/15%/20%), and tax-free Roth withdrawals year by year.",
    },
    {
      Icon: Route,
      badge: isUk ? "ISA & SIPP Bridge" : "Roth & 401(k) Bridge",
      title: "The liquidity bridge years",
      body: isUk
        ? "Watch your ISA and GIA carry living expenses from your retirement date until your SIPP unlocks at age 57 and State Pension starts at age 67 — closing multi-decade liquidity gaps safely."
        : "Watch your Roth IRA and Taxable Brokerage carry living expenses from retirement date until your 401(k)/IRA unlocks penalty-free at age 59½ and Social Security starts at age 67 — closing multi-decade liquidity gaps safely.",
    },
    {
      Icon: ShieldCheck,
      badge: "Monte Carlo Stress-Testing",
      title: "Sequence risk & market confidence",
      body: "Static 7% growth assumptions fail in real market drawdowns. Fireworks runs 2,000 randomized Monte Carlo market paths to measure exact plan survival rates against historical volatility.",
    },
    {
      Icon: Zap,
      badge: "Coast & Barista FIRE",
      title: "Coast FIRE & part-time transitions",
      body: "Find your Coast FIRE milestone — the exact pot where contributions can drop to zero — or model Barista FIRE with part-time income easing you into full retirement.",
    },
  ];

  const COMPARISON_ROWS = [
    {
      category: "Post-Retirement Taxation",
      generic: "Assumes 0% tax or static gross withdrawal rate",
      fireworks: isUk
        ? "Solves UK Income Tax, CGT exemptions, £100k taper & SIPP 25% tax-free lump sum year by year"
        : "Solves US Federal tax brackets, Standard Deduction, LTCG rates (0%/15%/20%) & tax-free Roth withdrawals year by year",
    },
    {
      category: isUk ? "Pension Access & Liquidity Gap" : "Retirement Accounts & Liquidity Gap",
      generic: "Treats total wealth as 100% accessible liquid cash from day one",
      fireworks: isUk
        ? "Sequences ISA/GIA bridge withdrawals until SIPP (age 57) and State Pension (age 67)"
        : "Sequences Taxable & Roth basis bridge withdrawals until 401(k)/IRA (age 59½) and Social Security (age 67)",
    },
    {
      category: "Sequence-of-Returns Risk",
      generic: "Assumes fixed nominal returns every single year (e.g. static 7%)",
      fireworks: "2,000 Monte Carlo stochastic market simulations with guardrail withdrawal strategies",
    },
    {
      category: "Privacy & Model Access",
      generic: "Requires email signup, account creation, credit card, or bank account linking",
      fireworks: "Free & Unlimited · No Registration Required · 100% Private Client-Side Model",
    },
    {
      category: "Advanced FIRE Strategies",
      generic: "Single static target pot number only",
      fireworks: "Coast FIRE milestones, Barista FIRE income offsets, & property downsizing logic",
    },
  ];

  return (
    <section className="mt-20 border-t border-border/60 pt-16 sm:mt-28 sm:pt-20">
      {/* Section Header */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-primary dark:text-brand shadow-xs">
          <Sparkles className="size-3 text-brand" />
          Engineered for {details.label} FIRE
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Most calculators stop at a pot size.{" "}
          <span className="text-muted-foreground font-normal">This one models reality.</span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          A single &ldquo;you need {details.currencySymbol}1.2M&rdquo; hides the decisions that matter — when
          your money unlocks, how tax impacts drawdowns, and whether your plan survives a market crash.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-surface/75 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_12px_32px_-8px_rgba(255,138,61,0.15)] dark:border-white/10 dark:bg-surface/40 dark:hover:border-brand/40 dark:hover:bg-surface/60"
          >
            {/* Soft gradient accent line on hover */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            
            <div>
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-brand/10 text-primary dark:text-brand transition-all duration-300 group-hover:scale-105 group-hover:border-primary/40 group-hover:bg-brand/20">
                  <f.Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="rounded-full border border-border/80 bg-surface-muted/60 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold text-muted-foreground dark:bg-surface-muted/30">
                  {f.badge}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold tracking-tight text-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Comparison Table */}
      <div className="mt-20">
        <div className="text-center sm:text-left max-w-xl">
          <h3 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Why tax-aware modeling matters ({details.flag} {details.id.toUpperCase()})
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Compare traditional FIRE calculators with the Fireworks tax-aware drawdown engine.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border/70 bg-surface/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-surface/40 dark:shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-border/70 bg-surface-muted/60 text-xs font-mono uppercase tracking-wider text-muted-foreground dark:bg-surface-muted/30">
                  <th className="py-4 px-6 font-semibold w-1/3">Capability</th>
                  <th className="py-4 px-6 font-semibold w-1/3 text-muted-foreground/80">
                    Generic FIRE Calculators
                  </th>
                  <th className="py-4 px-6 font-bold w-1/3 text-primary dark:text-brand bg-brand/10 dark:bg-brand/15 border-x border-brand/20">
                    Fireworks Engine ({details.id.toUpperCase()})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={row.category}
                    className={`transition-colors hover:bg-surface-muted/40 dark:hover:bg-surface-muted/20 ${
                      idx % 2 === 1 ? "bg-surface-muted/20 dark:bg-surface-muted/10" : ""
                    }`}
                  >
                    <td className="py-4 px-6 font-medium text-foreground">
                      {row.category}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-xs leading-relaxed">
                      <div className="flex items-start gap-2">
                        <XCircle className="size-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                        <span>{row.generic}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-foreground bg-brand/[0.04] dark:bg-brand/[0.08] border-x border-brand/15 text-xs leading-relaxed">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{row.fireworks}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sleek, Low-Profile Legal & Regulatory Disclaimer */}
      <div className="mt-16 sm:mt-20 border-t border-border/50 pt-8">
        <div className="rounded-2xl border border-border/50 bg-surface/40 p-5 sm:px-6 sm:py-5 backdrop-blur-md transition-all duration-300 hover:border-border/80 dark:bg-surface-muted/20 dark:border-white/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-muted/50 text-muted-foreground/80 dark:bg-surface-muted/40">
                <ShieldCheck className="size-4" strokeWidth={1.75} />
              </span>
              <p className="text-[0.725rem] leading-relaxed text-muted-foreground max-w-3xl">
                <strong className="font-semibold text-foreground/90">Educational Model Notice:</strong> Fireworks is an independent planning tool for exploring {details.id.toUpperCase()} FIRE scenarios. It does not provide regulated financial, investment, or tax advice. Calculations rely on {details.taxYearBadge} rules and client-side deterministic models — explore complete engine mechanics in our{" "}
                <Link
                  href="/methodology"
                  className="font-medium text-foreground underline decoration-border/80 underline-offset-2 hover:decoration-brand hover:text-primary transition-colors"
                >
                  Methodology
                </Link>
                . Your calculations stay 100% private in your local browser storage.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0 font-mono text-[0.68rem] text-muted-foreground self-end sm:self-center border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0 w-full sm:w-auto justify-end">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-border/70" aria-hidden="true">&bull;</span>
              <Link
                href="/disclaimer"
                className="inline-flex items-center gap-1 font-semibold text-foreground/90 hover:text-primary transition-colors"
              >
                <span>Disclaimer</span>
                <ArrowUpRight className="size-3 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
