import type { Metadata } from "next";
import { Term } from "@/components/Glossary";
import { LandingCta } from "@/components/LandingCta";
import { LandingFeatures } from "@/components/LandingFeatures";
import { LandingHeroPreview } from "@/components/LandingHeroPreview";
import { LaunchTrail } from "@/components/LaunchTrail";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Fireworks — Free US & UK FIRE & Early Retirement Planner",
  description:
    "Model your Financial Independence, Retire Early plan across 401(k), IRA, ISA, SIPP, Social Security, State Pension and property — with exact US & UK tax rules, Coast FIRE and Monte Carlo confidence.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "Fireworks",
      description:
        "FIRE planner: model drawdown across 401(k), Roth IRA, ISA, SIPP, Social Security, State Pension and property with the tax you'll actually pay.",
      inLanguage: "en",
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
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Model your Financial Independence, Retire Early plan across 401(k), IRA, ISA, SIPP, Social Security, State Pension and property — with exact tax rules, Coast FIRE and Monte Carlo confidence.",
      inLanguage: "en",
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Fireworks calculate early retirement tax?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Fireworks solves year-by-year tax brackets (US Federal & State or UK HMRC progressive bands), capital gains exemptions, standard deductions, and penalty-free retirement access ages to output your true net take-home spending.",
          },
        },
        {
          "@type": "Question",
          name: "Does Fireworks support both US and UK FIRE plans?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Fireworks includes dedicated country engines for both the United States (401k, Roth IRA, Taxable Brokerage, Social Security) and United Kingdom (SIPP, ISA, GIA, State Pension).",
          },
        },
        {
          "@type": "Question",
          name: "Is my financial data kept private?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, 100%. All plan calculations and data are stored locally on your device in your browser's local storage. No financial accounts or data are stored on external servers.",
          },
        },
      ],
    },
  ],
};

export default function Landing() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <LaunchTrail />
        <section className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="relative z-10 lg:col-span-7">
            <div className="absolute -left-20 top-20 -z-10 h-64 w-64 rounded-full bg-brand/10 blur-[80px]" />
            <div className="absolute -right-20 top-0 -z-10 h-64 w-64 rounded-full bg-accent/10 blur-[80px]" />

            <span className="landing-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-brand" />
              Free FIRE planner · US & UK tax-aware drawdown
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
            <p
              data-launch-quiet
              className="landing-rise mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [animation-delay:120ms] sm:text-lg"
            >
              <Term term="FIRE">FIRE</Term> — financial independence, retire early
              — is having enough invested that work becomes optional. Fireworks
              models drawdown across tax-free wrappers (Roth IRA, ISA), 401(k)s, pensions, taxable accounts, Social Security / State Pension, and property with the tax you&apos;ll actually pay.
            </p>
            <div data-launch-quiet className="landing-rise [animation-delay:180ms]">
              <LandingCta />
            </div>
          </div>

          <div className="relative z-10 lg:col-span-5">
            <LandingHeroPreview />
          </div>
        </section>

        <LandingFeatures />
      </div>
    </>
  );
}
