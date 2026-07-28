import Link from "next/link";
import {
  Receipt,
  Route,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowUpRight,
  Lock,
  Scale,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    Icon: Receipt,
    badge: "UK Tax Engine 2026/27",
    title: "The tax you'll actually pay",
    body: "Generic calculators model gross withdrawals. Fireworks solves progressive UK income-tax bands, personal allowance tapers above £100k, CGT above the £3,000 exemption, and the 25% SIPP tax-free allowance year by year.",
  },
  {
    Icon: Route,
    badge: "Bridge Gap Planner",
    title: "The ISA-to-SIPP bridge years",
    body: "Watch your ISA and GIA carry your living expenses from your retirement date until your SIPP unlocks at age 57 and State Pension starts at age 67 — closing the multi-decade liquidity gap.",
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
    generic: "Assumes 0% tax or static withdrawal rate",
    fireworks: "Solves UK Income Tax, CGT exemptions & SIPP 25% tax-free lump sum year by year",
  },
  {
    category: "Pension Access & Liquidity Gap",
    generic: "Treats total wealth as 100% accessible from day one",
    fireworks: "Sequences ISA/GIA bridge withdrawals until SIPP (age 57) and State Pension (age 67)",
  },
  {
    category: "Sequence-of-Returns Risk",
    generic: "Assumes fixed nominal returns every single year",
    fireworks: "2,000 Monte Carlo stochastic market simulations with guardrail withdrawal strategies",
  },
  {
    category: "Privacy & Security",
    generic: "Requires email signup, account creation, or bank linking",
    fireworks: "100% client-side in your browser — zero financial data sent to any server",
  },
  {
    category: "Advanced FIRE Strategies",
    generic: "Single static target number only",
    fireworks: "Coast FIRE milestones, Barista FIRE income offsets, & property downsizing logic",
  },
];

export function LandingFeatures() {
  return (
    <section className="mt-20 border-t border-border pt-16 sm:mt-28 sm:pt-20">
      {/* Section Header */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
          <Sparkles className="size-3 text-brand" />
          Engineered for UK FIRE
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Most calculators stop at a pot size.
          <span className="text-muted-foreground"> This one models reality.</span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          A single &ldquo;you need £1.2M&rdquo; hides the decisions that matter — when
          your money unlocks, how tax impacts drawdowns, and whether your plan survives a market crash.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:border-border/80 hover:shadow-[var(--shadow-md)]"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-brand/10 text-primary">
                  <f.Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 font-mono text-[0.65rem] font-medium text-muted-foreground">
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

      {/* Interactive/Visual Comparison Table */}
      <div className="mt-20">
        <div className="text-center sm:text-left">
          <h3 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Why tax-aware modeling matters
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Compare traditional FIRE calculators with the Fireworks tax-aware drawdown engine.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  <th className="py-4 px-6 font-semibold w-1/3">Capability</th>
                  <th className="py-4 px-6 font-semibold w-1/3 text-muted-foreground/80">
                    Generic FIRE Calculators
                  </th>
                  <th className="py-4 px-6 font-semibold w-1/3 text-foreground bg-brand/5">
                    Fireworks FIRE Engine
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={row.category}
                    className={idx % 2 === 1 ? "bg-surface-muted/30" : ""}
                  >
                    <td className="py-4 px-6 font-medium text-foreground">
                      {row.category}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-xs leading-relaxed">
                      <div className="flex items-start gap-2">
                        <XCircle className="size-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                        <span>{row.generic}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-foreground bg-brand/5 text-xs leading-relaxed">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-brand shrink-0 mt-0.5" />
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

      {/* Landing Page Disclaimer & Trust Box */}
      <div className="mt-16 rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 backdrop-blur-sm shadow-[var(--shadow-sm)]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-brand/10 text-brand">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display text-base font-bold tracking-tight text-foreground">
                  Transparent, Open-Source & Tax-Aware Modeling
                </h4>
                <span className="rounded-full bg-success/15 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold text-success">
                  100% Private
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground max-w-3xl">
                Fireworks is an independent planning tool for exploring UK FIRE scenarios. It does not provide regulated financial, investment, or tax advice. Calculations rely on 2026/27 UK tax legislation and transparent mathematical assumptions — explore complete engine mechanics in our{" "}
                <Link
                  href="/methodology"
                  className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                >
                  Methodology
                </Link>
                . Your numbers stay 100% private in your browser — read our{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                >
                  Privacy Policy
                </Link>
                . For legal terms and regulatory disclosures, view our{" "}
                <Link
                  href="/disclaimer"
                  className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground inline-flex items-center gap-0.5"
                >
                  Disclaimer <ArrowUpRight className="size-3 inline" />
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 pt-4 font-mono text-[0.7rem] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Lock className="size-3 text-brand" />
            Zero Server Data Collection
          </span>
          <span className="flex items-center gap-1.5">
            <Scale className="size-3 text-brand" />
            2026/27 UK Tax Legislation
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3 text-brand" />
            Educational & Scenario Use
          </span>
        </div>
      </div>
    </section>
  );
}
