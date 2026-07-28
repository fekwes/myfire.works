import type { Metadata } from "next";
import Link from "next/link";
import {
  Lock,
  Database,
  UserCheck,
  Sparkles,
  Share2,
  ShieldOff,
  Trash2,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Plain-English explanation of how Fireworks protects your data: local-first browser storage, optional Supabase cloud backup, self-serve data deletion, zero-tracking guarantee, and Gemini AI data isolation.",
  alternates: { canonical: "/privacy" },
};

function PrivacySection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-surface/40 p-6 backdrop-blur-sm transition-colors hover:border-border">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-brand/10 text-brand">
          <Icon className="size-4" />
        </span>
        <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-brand font-semibold">
        <Lock className="size-3.5" />
        <span>Privacy & Data Governance</span>
      </div>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Your numbers stay yours.
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Fireworks is built as a privacy-first modeling tool, not a data business. Here is a clear, transparent breakdown of how your financial data is handled, stored, and protected.
      </p>

      {/* Summary Highlight Box */}
      <div className="mt-6 rounded-2xl border border-brand/30 bg-brand/10 p-5 text-foreground text-xs sm:text-sm leading-relaxed">
        <strong className="font-semibold block text-brand mb-1 text-sm">
          Core Privacy Guarantee
        </strong>
        By default, your financial numbers never leave your web browser. We do not sell your data, we do not deploy advertising trackers, and optional AI features run with strict zero-PII data isolation guarantees.
      </div>

      <div className="mt-8 space-y-6">
        {/* Section 1 */}
        <PrivacySection title="1. Local-First Browser Storage" icon={Database}>
          <p>
            Everything you enter into the Fireworks planner—including ages, salary, asset pot balances (ISA/GIA/SIPP, 401k/IRA), contribution schedules, and spending targets—is saved locally on your device in your browser&apos;s client storage (<code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs font-mono text-foreground">localStorage</code> and <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs font-mono text-foreground">indexedDB</code>).
          </p>
          <p>
            Your numbers do not transmit to our servers by default. Clearing your web browser cache or local application data completely purges all plan figures from your device.
          </p>
        </PrivacySection>

        {/* Section 2 */}
        <PrivacySection title="2. Optional Account Sync & Complete Data Deletion" icon={UserCheck}>
          <p>
            Creating an account is entirely optional. If you choose to sign up so you can access your financial plans across multiple devices, authentication and cloud data storage are securely powered by <span className="text-foreground font-medium">Supabase</span> (using encrypted connections and database Row-Level Security).
          </p>
          <p>
            You retain 100% ownership of your stored data. You can inspect, modify, or permanently delete individual saved plans or delete your entire account at any time from your{" "}
            <Link
              href="/account"
              className="text-foreground underline-offset-2 hover:underline font-medium"
            >
              Account Management
            </Link>{" "}
            page. Triggering an account deletion immediately and permanently purges all associated credentials and plan records from our cloud databases.
          </p>
        </PrivacySection>

        {/* Section 3 */}
        <PrivacySection title="3. Third-Party AI Data Isolation (Google Gemini)" icon={Sparkles}>
          <p>
            Fireworks offers two optional AI-assisted tools powered by Google Gemini API:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
            <li>
              <strong className="text-foreground">Get Tips:</strong> When explicitly clicked, sends a summarized, anonymous snapshot of your plan figures (ages, pot balances, spending target, and projected Coast age) to generate retirement optimization suggestions.
            </li>
            <li>
              <strong className="text-foreground">Import with AI:</strong> When you paste raw portfolio text or upload a CSV file, the raw text is sent to extract asset classes and fund allocations.
            </li>
          </ul>
          <p>
            <strong className="text-foreground font-medium">Data Boundary Guarantees:</strong> Neither request includes your name, email address, IP address, account token, or any personally identifiable information (PII). Requests are processed via server-side API endpoints transiently in-flight. Under Google Cloud Enterprise privacy commitments, data is not stored permanently or used to train Google AI foundation models.
          </p>
        </PrivacySection>

        {/* Section 4 */}
        <PrivacySection title="4. Share Links & URL Encoding" icon={Share2}>
          <p>
            Generating a share link creates a URL that encodes your plan&apos;s parameters directly into the URL hash fragment.
          </p>
          <p>
            Share links do not store your data on a central database server to function. Anyone who opens the link can view a read-only preview of the encoded figures—so only share generated links with trusted individuals or financial advisors.
          </p>
        </PrivacySection>

        {/* Section 5 */}
        <PrivacySection title="5. Zero-Tracking Guarantee & No Ad Networks" icon={ShieldOff}>
          <p>
            Fireworks is committed to zero commercial data monetization:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
            <li>We do NOT use cross-site tracking scripts, Google Ads, Meta Pixels, or third-party marketing cookies.</li>
            <li>We NEVER sell, license, or trade user data or financial profiles to data brokers or advertisers.</li>
            <li>Any performance monitoring (e.g. Vercel Speed Insights) measures aggregated technical asset load times and does not track personal browsing activity or financial inputs.</li>
          </ul>
        </PrivacySection>

        {/* Section 6 */}
        <PrivacySection title="6. Your Statutory Data Rights (GDPR / UK DPA / CCPA)" icon={ShieldCheck}>
          <p>
            Under applicable data protection laws (including the UK General Data Protection Regulation / Data Protection Act 2018, EU GDPR, and California CCPA/CPRA), you have statutory rights regarding your personal data:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
            <li><strong className="text-foreground">Right of Access & Portability:</strong> View and export your local or cloud-saved plan data at any time.</li>
            <li><strong className="text-foreground">Right to Erasure:</strong> Delete local storage in your browser or purge your cloud account from <Link href="/account" className="text-foreground underline hover:underline">/account</Link>.</li>
            <li><strong className="text-foreground">Right to Object & Restrict:</strong> Refrain from using optional cloud backup or AI features at your sole discretion.</li>
          </ul>
        </PrivacySection>

        {/* Section 7 */}
        <PrivacySection title="7. Contact & Data Privacy Inquiries" icon={Trash2}>
          <p>
            If you have questions, feedback, or data privacy requests regarding Fireworks, you can contact the project maintainers directly:
          </p>
          <p className="font-mono text-xs text-foreground bg-surface-muted p-3 rounded-lg border border-border/60">
            Email: <a href="mailto:1mpersecond@gmail.com" className="underline hover:text-brand">1mpersecond@gmail.com</a><br />
            GitHub Repository: <a href="https://github.com/fekwes/myfire.works" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">github.com/fekwes/myfire.works</a>
          </p>
        </PrivacySection>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
        <p>Review our legal disclaimers or calculation engine methodology:</p>
        <div className="flex items-center gap-4">
          <Link
            href="/disclaimer"
            className="text-foreground underline-offset-2 hover:underline font-medium"
          >
            Legal Disclaimer
          </Link>
          <Link
            href="/methodology"
            className="text-foreground underline-offset-2 hover:underline font-medium"
          >
            Math Methodology
          </Link>
        </div>
      </div>
    </div>
  );
}
