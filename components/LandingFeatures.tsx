"use client";

import Link from "next/link";
import { ArrowRight, Check, Receipt, Route, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";
import { usePlan } from "@/components/PlanProvider";

export function LandingFeatures() {
  const { activeRegion } = usePlan();
  const isUs = activeRegion === "us";

  const features = [
    {
      Icon: Receipt,
      tag: "Yearly Tax Solver",
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      title: "The tax you'll actually pay",
      body: isUs
        ? "Federal & state tax brackets (10%–37%), standard deductions ($15k/$30k), Long-Term Capital Gains, and NIIT (3.8%) — computed year by year."
        : "HMRC tax bands (20%/40%/45%), personal allowance taper, CGT exemptions, and tax-free pension lump sums — computed year by year.",
    },
    {
      Icon: Route,
      tag: "Access Age Bridge",
      badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-400",
      title: "The bridge years",
      body: isUs
        ? "Model how your Roth IRA and Taxable Brokerage fund early retirement until your 401(k) unlocks penalty-free at age 59½."
        : "Model how your ISA and GIA fund early retirement until your SIPP unlocks penalty-free at statutory age 57.",
    },
    {
      Icon: ShieldCheck,
      tag: "Sequence Risk",
      badgeColor: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
      title: "Monte Carlo stress testing",
      body: "2,000 randomized market simulations test your portfolio against sequence-of-returns risk, ensuring one poor decade won't break your plan.",
    },
    {
      Icon: Sparkles,
      tag: "Statutory Offsets",
      badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      title: isUs ? "Social Security & Barista FIRE" : "State Pension & Barista FIRE",
      body: isUs
        ? "Seamlessly layer Social Security benefits starting at age 67, or add part-time work earnings to reduce portfolio drawdown."
        : "Seamlessly layer triple-lock State Pension income starting at age 67, or add part-time work earnings to reduce portfolio drawdown.",
    },
  ];

  const comparison = [
    {
      feature: "Year-by-year progressive tax solver",
      fireworks: true,
      standard: false,
      note: "Computes net take-home spending, not gross pot guesses",
    },
    {
      feature: isUs ? "401(k) & IRA 59½ penalty-free bridge" : "SIPP age 57 unlock bridge",
      fireworks: true,
      standard: false,
      note: "Models exact statutory penalty-free access ages",
    },
    {
      feature: isUs ? "Social Security benefit offset" : "State Pension triple-lock offset",
      fireworks: true,
      standard: false,
      note: "Reduces pot drawdown once statutory benefits start",
    },
    {
      feature: "Downsizing & real estate sale proceeds",
      fireworks: true,
      standard: false,
      note: "Primary residence exemption & capital gains tax",
    },
    {
      feature: "Monte Carlo sequence-of-returns testing",
      fireworks: true,
      standard: false,
      note: "2,000 market simulations with guardrail rules",
    },
    {
      feature: "Free & Private Client-Side Engine",
      fireworks: true,
      standard: false,
      note: "No paywalls, zero accounts required, local browser storage only",
    },
  ];

  return (
    <div className="mt-20 space-y-24">
      {/* Editorial features grid */}
      <section className="grid grid-cols-1 gap-10 border-t border-border/80 pt-14 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col lg:col-span-5">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-brand font-semibold mb-2">
            Why Standard Rules Fail
          </span>
          <h2 data-launch-quiet className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Most calculators stop at a pot size.
            <span className="text-muted-foreground"> This one models the journey.</span>
          </h2>
          <p data-launch-quiet className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Static 4% calculators assume constant returns and ignore taxes. Fireworks models the exact statutory drawdown mechanics so you know your plan will hold.
          </p>
        </div>

        <ul className="lg:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <li
              key={f.title}
              className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface-muted/30 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:bg-surface-muted/60 hover:shadow-xl hover:shadow-brand/5"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-brand/5 text-primary transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-brand/15">
                  <f.Icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wider ${f.badgeColor}`}>
                  {f.tag}
                </span>
              </div>
              <div>
                <h3 className="font-display text-base font-bold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Comparison table — CRO high-converting feature grid */}
      <section className="rounded-3xl border border-border/60 bg-surface/60 p-6 sm:p-8 backdrop-blur-xl">
        <div className="text-center">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-brand font-semibold">
            Feature Comparison
          </span>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Fireworks vs. Standard 4% Rule Calculators
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Static calculators assume fixed withdrawal rates and ignore real tax brackets. Here is how Fireworks solves the actual mechanics.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 pr-4 font-semibold text-foreground">Feature</th>
                <th className="pb-3 px-4 font-semibold text-brand text-center">Fireworks</th>
                <th className="pb-3 px-4 font-semibold text-muted-foreground text-center">Basic 4% Calculators</th>
                <th className="pb-3 pl-4 font-semibold text-muted-foreground hidden md:table-cell">Why It Matters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {comparison.map((row) => (
                <tr key={row.feature} className="transition-colors hover:bg-surface-muted/40">
                  <td className="py-3.5 pr-4 font-medium text-foreground">{row.feature}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-success/15 text-success mx-auto">
                      <Check className="size-3.5" />
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-danger/10 text-danger/70 mx-auto">
                      <X className="size-3.5" />
                    </span>
                  </td>
                  <td className="py-3.5 pl-4 text-xs text-muted-foreground hidden md:table-cell">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Legal & Compliance Disclaimer Box */}
      <section className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface/50 dark:bg-surface-muted/30 p-6 sm:p-7 backdrop-blur-xl shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary/15">
            <ShieldAlert className="size-5" strokeWidth={1.75} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground sm:text-sm">
                Financial & Legal Disclaimer
              </h3>
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground hidden sm:inline-block">
                Educational Tool
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Fireworks is an educational financial modeling tool designed solely for planning and estimation. It does not provide personalized investment, tax, legal, or financial advice. Projections rely on user inputs, historical assumptions, and simplified statutory rules ({isUs ? "US IRS Tax Code & Social Security rules" : "UK HMRC Tax Rules & State Pension triple-lock"}), which are subject to legislative change. Monte Carlo simulations present probabilistic outcomes, not guaranteed future results. Always consult a licensed Certified Financial Planner (CFP) or tax advisor before making financial decisions.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 border-t border-border/40 text-xs font-medium">
              <Link
                href="/disclaimer"
                className="group/link inline-flex items-center gap-1.5 text-primary decoration-primary/30 underline-offset-4 hover:underline hover:text-primary/90 transition-colors"
              >
                <span>Read full disclaimer</span>
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5" />
              </Link>
              <span className="text-border/80" aria-hidden="true">•</span>
              <Link
                href="/privacy"
                className="inline-flex items-center gap-1.5 text-muted-foreground decoration-border/60 underline-offset-4 hover:text-foreground hover:underline transition-colors"
              >
                <span>Privacy policy</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
