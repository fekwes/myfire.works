import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Fireworks stores, what it doesn't, and where your figures go. Plain English.",
  alternates: { canonical: "/privacy" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
        Privacy
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Your numbers stay yours.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Fireworks is a planning tool, not a data business. Here&apos;s exactly
        what
        happens to what you type — in plain English.
      </p>

      <Section title="Your plan lives in your browser">
        <p>
          Everything you enter is saved locally on your device (in your
          browser&apos;s storage). It never leaves your device unless you choose
          one of the actions below. Clear your browser data and it&apos;s gone.
        </p>
      </Section>

      <Section title="If you create an account">
        <p>
          Signing up (optional) stores your email address and any plans you
          explicitly save, so you can reload them later. That&apos;s handled by
          Supabase, our authentication and database provider. You can change your
          password or delete your saved data at any time from{" "}
          <Link
            href="/account"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Account
          </Link>
          .
        </p>
      </Section>

      <Section title="AI strategy tips">
        <p>
          When you press <span className="text-foreground">Get tips</span>, a
          summary of your plan&apos;s figures (ages, balances, contributions, the
          projected outcome) is sent to Google&apos;s Gemini to generate the
          suggestions. No name, email, or account identifier is included. If you
          never press it, nothing is sent.
        </p>
      </Section>

      <Section title="Share links">
        <p>
          A share link encodes your plan&apos;s figures directly in the URL.
          Anyone you send it to can see those figures (read-only) — so only share
          it with people you&apos;re happy to show. Nothing is stored on a server
          to create one.
        </p>
      </Section>

      <Section title="No trackers, no ads">
        <p>
          There are no advertising trackers or third-party marketing cookies. If
          privacy-friendly, cookieless usage analytics are ever added, they
          won&apos;t identify you.
        </p>
      </Section>

      <Section title="Not financial advice">
        <p>
          Fireworks is an educational tool with simplified assumptions — see the{" "}
          <Link
            href="/methodology"
            className="text-foreground underline-offset-2 hover:underline"
          >
            methodology
          </Link>
          . It doesn&apos;t provide regulated financial advice.
        </p>
      </Section>
    </div>
  );
}
