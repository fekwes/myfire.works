import type { Metadata } from "next";
import { Receipt, Route, ShieldCheck } from "lucide-react";
import { Term } from "@/components/Glossary";
import { LandingCta } from "@/components/LandingCta";
import { LandingHeroPreview } from "@/components/LandingHeroPreview";
import { LaunchPad, LaunchTrail } from "@/components/LaunchTrail";
import { siteUrl } from "@/lib/site-url";

// Self-referencing canonical. Vercel serves identical content on the production
// alias, the git-branch alias and every per-deploy URL; without this, search
// engines treat them as duplicates and split ranking signals. Resolves against
// `metadataBase`, so it follows NEXT_PUBLIC_SITE_URL automatically.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Structured data — a free finance web app. Makes the result eligible for
// richer search presentation. Kept in sync with the layout's description.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "Fireworks",
      description:
        "FIRE planner: model drawdown across ISA, GIA, SIPP, State Pension and property with the tax you'll actually pay.",
      inLanguage: "en-GB",
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "Fireworks — FIRE & Early Retirement Planner",
      url: `${siteUrl}/`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
      description:
        "Model your Financial Independence, Retire Early plan across ISA, GIA, SIPP, State Pension and property — with the tax you'll actually pay, Coast FIRE and Monte Carlo confidence.",
      inLanguage: "en-GB",
    },
  ],
};

const FEATURES = [
  {
    Icon: Receipt,
    title: "The tax you'll actually pay",
    body: "Income-tax bands, the personal-allowance taper, CGT above the £3,000 exemption and the 25% tax-free pension — solved year by year, not hand-waved.",
  },
  {
    Icon: Route,
    title: "The bridge years",
    body: "Watch your ISA and GIA carry you from the day you stop working to the age your SIPP unlocks — the gap most calculators quietly skip.",
  },
  {
    Icon: ShieldCheck,
    title: "Confidence, not a lucky guess",
    body: "Monte Carlo runs stress-test the plan against bad markets, so one good decade isn't mistaken for a safe one.",
  },
];


export default function Landing() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* `relative` so the measured launch trail can span the whole landing —
          lit at the foot of the page, arriving at the hero's preview card. */}
      <div className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <LaunchTrail />
      {/* Hero — asymmetric: copy left, a real computed plan preview right.
          A single ember "launch trail" draws in behind it on load. */}
      <section className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">

        <div className="relative z-10 lg:col-span-7">
          {/* Subtle hero ambient glow */}
          <div className="absolute -left-20 top-20 -z-10 h-64 w-64 rounded-full bg-brand/10 blur-[80px]" />
          <div className="absolute -right-20 top-0 -z-10 h-64 w-64 rounded-full bg-accent/10 blur-[80px]" />

          <span className="landing-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" />
            Free FIRE planner · tax-aware drawdown
          </span>
          <h1 className="landing-rise mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance [animation-delay:60ms] sm:text-[3.5rem]">
            Know your number. Know when.
            <br />
            Know{" "}
            <span className="relative whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-brand to-accent">
              it&apos;ll hold
              <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-brand/70 to-accent/70" />
            </span>
            .
          </h1>
          {/* The trail climbs past this column; `data-launch-quiet` tells it to
              dim across the prose and the CTA so nothing has to be read
              through it. */}
          <p
            data-launch-quiet
            className="landing-rise mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [animation-delay:120ms] sm:text-lg"
          >
            <Term term="FIRE">FIRE</Term> — financial independence, retire early
            — is having enough invested that work becomes optional. Fireworks
            models the whole drawdown (<Term>ISA</Term>, <Term>GIA</Term>,{" "}
            <Term>SIPP</Term>, State Pension and property) with the tax
            you&apos;ll actually pay. No spreadsheet, no hand-waving.
          </p>
          <div data-launch-quiet className="landing-rise [animation-delay:180ms]">
            <LandingCta />
          </div>
        </div>

        <div className="relative z-10 lg:col-span-5">
          <LandingHeroPreview />
        </div>
      </section>

      {/* Differentiators — editorial, not three identical cards. */}
      <section className="mt-24 grid grid-cols-1 gap-10 border-t border-border pt-14 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col lg:col-span-5">
          <h2 data-launch-quiet className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Most calculators stop at a pot size.
            <span className="text-muted-foreground"> This one keeps going.</span>
          </h2>
          <p data-launch-quiet className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            A single &ldquo;you need £1.2M&rdquo; hides everything that matters —
            when you can actually access the money, and what the taxman takes on
            the way out. Fireworks models the mechanics.
          </p>
          {/* Where the firework is lit, and what fills this column. `mt-12` drops the
              crate to a comfortable position below the copy. `lg` only: below that the
              trail doesn't exist, so neither should its origin. */}
          <span className="mt-12 hidden lg:flex w-full justify-center relative">
            <div className="absolute inset-0 -z-10 bg-brand/5 blur-3xl rounded-full scale-150" />
            <LaunchPad />
          </span>
        </div>

        <ul className="lg:col-span-7 flex flex-col gap-4">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="group flex gap-5 rounded-3xl border border-border/50 bg-surface-muted/30 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-muted/50 hover:shadow-xl hover:shadow-brand/5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-brand/5 text-primary transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-brand/15">
                <f.Icon className="size-[1.15rem]" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </>
  );
}
