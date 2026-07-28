"use client";

import Link from "next/link";
import { ArrowRight, Check, Receipt, Route, ShieldCheck, Sparkles, X } from "lucide-react";
import { usePlan } from "@/components/PlanProvider";

export function LandingFeatures() {
  const { activeRegion } = usePlan();
  const isUs = activeRegion === "us";

  const features = [
    {
      Icon: Receipt,
      tag: "Yearly Tax Solver",
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      title: "Exact Net Take-Home",
      body: isUs
        ? "Solves year-by-year federal & state tax brackets so you know your true spendable cashflow."
        : "Solves year-by-year HMRC tax bands and CGT exemptions so you know your true spendable cashflow.",
    },
    {
      Icon: Route,
      tag: "Access Age Bridge",
      badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-400",
      title: "Penalty-Free Unlock",
      body: isUs
        ? "Funds early retirement via Roth IRA and brokerage until your 401(k) unlocks penalty-free at age 59½."
        : "Funds early retirement via ISA and GIA until your SIPP unlocks penalty-free at statutory age 57.",
    },
    {
      Icon: ShieldCheck,
      tag: "Sequence Risk",
      badgeColor: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
      title: "2,000 Market Runs",
      body: "Stress-tests your portfolio against market crashes so one bad decade won't break your plan.",
    },
    {
      Icon: Sparkles,
      tag: "Statutory Offsets",
      badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      title: isUs ? "Social Security & Part-Time" : "State Pension & Part-Time",
      body: isUs
        ? "Layers Social Security benefits and part-time earnings to lower your required pot size."
        : "Layers triple-lock State Pension income and part-time earnings to lower your required pot size.",
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
        <div className="flex flex-col justify-between lg:col-span-5">
          <div>
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-brand font-semibold mb-2 block">
              Why Standard Rules Fail
            </span>
            <h2 data-launch-quiet className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Most calculators stop at a pot size.
              <span className="text-muted-foreground"> This one models the journey.</span>
            </h2>
            <p data-launch-quiet className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Static 4% calculators ignore taxes and access ages. Fireworks models exact drawdown mechanics so your plan actually holds.
            </p>
          </div>

          {/* Visual Model Advantage Graphic */}
          <div className="mt-6 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-surface/80 to-surface-muted/50 p-5 backdrop-blur-xl shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.65rem] font-bold uppercase tracking-wider text-brand">
                Model Advantage
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[0.65rem] text-emerald-400 font-semibold">
                Tax-Aware Engine
              </span>
            </div>
            
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand to-accent">
                {isUs ? "+$140,000+" : "+£110,000+"}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {isUs ? "in tax savings & bridge optimization" : "in ISA & pension tax savings"}
              </span>
            </div>

            {/* Visual Mini Comparison Bars */}
            <div className="mt-4 space-y-2.5">
              <div>
                <div className="flex justify-between text-[0.68rem] text-muted-foreground mb-1 font-mono">
                  <span>Static 4% Calculator</span>
                  <span className="text-danger/80 font-semibold">Ran out at age 74 ⚠️</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full w-[65%] rounded-full bg-danger/60" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[0.68rem] text-foreground mb-1 font-mono font-medium">
                  <span>Fireworks Tax Engine</span>
                  <span className="text-success font-semibold">Sustainable to Age 95+ ✓</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full w-[95%] rounded-full bg-gradient-to-r from-brand via-primary to-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <ul className="lg:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <li
              key={f.title}
              className="group flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-surface-muted/30 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:bg-surface-muted/60 hover:shadow-xl hover:shadow-brand/5"
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
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
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

      {/* Sleek, Non-Intrusive Statutory Legal Disclaimer Notice */}
      <footer className="border-t border-border/40 pt-6 text-xs text-muted-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl leading-relaxed">
            <strong className="font-semibold text-foreground">Statutory Disclosure:</strong>{" "}
            Fireworks is an educational simulation tool, not a regulated financial adviser, broker-dealer, or fiduciary under US (SEC/FINRA) or UK (FCA) standards; all market projections, stochastic distributions, and tax estimates are hypothetical, illustrative, and non-guaranteed. Outputs do not constitute personalized investment, legal, or tax advice—please consult a licensed professional before making financial decisions.
          </p>
          <div className="flex shrink-0 items-center gap-4 font-medium">
            <Link
              href="/disclaimer"
              className="inline-flex items-center gap-1 text-foreground hover:text-brand transition-colors underline decoration-border underline-offset-4"
            >
              <span>Disclaimer</span>
              <ArrowRight className="size-3" />
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors underline decoration-border underline-offset-4"
            >
              <span>Privacy policy</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
