import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldAlert,
  FileText,
  HelpCircle,
  ExternalLink,
  Scale,
  Cpu,
  Building2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Legal & Financial Disclaimer",
  description:
    "Comprehensive legal disclosures, financial non-advice declarations, simulation limitations, indemnification terms, and SEC/FINRA and FCA regulatory status for Fireworks modeling software.",
  alternates: { canonical: "/disclaimer" },
};

function DisclaimerSection({
  id,
  title,
  icon: Icon,
  children,
}: {
  id?: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-border/60 bg-surface/40 p-6 backdrop-blur-sm transition-colors hover:border-border"
    >
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

export default function DisclaimerPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-brand font-semibold">
        <ShieldAlert className="size-3.5" />
        <span>Legal & Compliance Disclosures</span>
      </div>

      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Legal & Financial Disclaimer
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Last updated: July 2026. Please read these disclosures and legal terms carefully before using the Fireworks Financial Independence & Early Retirement (FIRE) modeling software.
      </p>

      {/* Summary Callout Box */}
      <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200 text-xs sm:text-sm leading-relaxed">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Summary: Educational Modeling Tool Only</span>
        </div>
        <p className="mb-2">
          Fireworks is an algorithmic simulation tool built exclusively to model tax-aware retirement drawdown strategies across US and UK financial structures.
        </p>
        <p>
          <strong className="text-amber-100 font-semibold">Fireworks does NOT provide regulated financial, investment, tax, or legal advice.</strong> All calculations and projections are hypothetical, simplified estimates subject to market volatility and statutory changes. Always consult a licensed financial advisor, CPA, or tax professional before making real-world financial decisions.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {/* Section 1 */}
        <DisclaimerSection
          id="educational-purpose"
          title="1. Educational & Modeling Purpose Only (Not Regulated Advice)"
          icon={FileText}
        >
          <p>
            Fireworks (the &ldquo;Service&rdquo;) is designed strictly as an educational software tool and mathematical modeling framework to assist users in exploring potential financial independence, Coast FIRE, and early retirement drawdown scenarios.
          </p>
          <p>
            Nothing contained within the Service—including output charts, year-by-year cash flow projections, Monte Carlo probability scores, Coast FIRE metrics, tax estimates, or AI-generated tips—constitutes personalized financial, investment, tax, accounting, or legal advice.
          </p>
          <p>
            Fireworks is not an investment advisor, broker-dealer, certified financial planner, tax firm, or fiduciary. The Service does not provide recommendations to buy, hold, or sell securities, execute specific pension transfers, or adopt any specific drawdown strategy.
          </p>
        </DisclaimerSection>

        {/* Section 2 */}
        <DisclaimerSection
          id="no-fiduciary"
          title="2. No Adviser-Client or Fiduciary Relationship"
          icon={UserCheck}
        >
          <p>
            Your access to or use of Fireworks—including opening the application, entering financial data, saving plans, creating share URLs, or triggering AI assistant features—does not create an adviser-client, fiduciary, agency, or professional service relationship between you and Fireworks, its operators, or its developers.
          </p>
          <p>
            Fireworks owes no fiduciary duty of care to any user. The software does not assess individual suitability, investor risk tolerance, personal debt obligations, estate planning needs, or total tax liabilities beyond the simplified inputs provided.
          </p>
        </DisclaimerSection>

        {/* Section 3 */}
        <DisclaimerSection
          id="simulation-limitations"
          title="3. Simulation & Projection Limitations"
          icon={HelpCircle}
        >
          <p>
            All mathematical calculations, projections, and simulation outcomes generated by Fireworks are hypothetical in nature and do not represent guaranteed or actual investment results:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
            <li>
              <strong className="text-foreground">Deterministic Models vs Real Markets:</strong> Deterministic projections assume constant annual return rates, whereas real market returns fluctuate unpredictably year to year.
            </li>
            <li>
              <strong className="text-foreground">Tax Band Assumptions (US & UK):</strong> Tax calculations reflect stylized assumptions based on 2026/27 tax legislation (e.g., US Federal Income Tax brackets, Standard Deduction, state tax rates, and UK HMRC Income Tax bands, Personal Allowance, and Capital Gains Tax allowances). Statutory tax rates, access ages (US 59½ 401(k)/IRA vs UK 57 NMPA), and allowances are subject to legislative change.
            </li>
            <li>
              <strong className="text-foreground">Inflation & Cost Fluctuations:</strong> Modeled inflation rates are global estimates. Personal healthcare, housing costs, and individual spending needs may diverge substantially from model assumptions.
            </li>
            <li>
              <strong className="text-foreground">Historic Returns & Monte Carlo Distributions:</strong> Monte Carlo probability analysis uses randomized sampling based on historical asset class return distributions. Backtested statistics and stochastic trials do not predict future market performance or guarantee plan survival.
            </li>
          </ul>
        </DisclaimerSection>

        {/* Section 4 */}
        <DisclaimerSection
          id="user-responsibility"
          title="4. User Responsibility & Duty to Verify"
          icon={ExternalLink}
        >
          <p>
            You acknowledge and agree that you carry sole responsibility for verifying the correctness, suitability, and accuracy of any figures, inputs, assumptions, and formulas used within Fireworks.
          </p>
          <p>
            Before making any binding financial decisions, reallocating investment assets, altering retirement timing, or executing pension withdrawals, you must consult with a qualified, licensed professional—such as a Certified Financial Planner (CFP®), Chartered Financial Planner, Certified Public Accountant (CPA), or FCA/SEC registered financial advisor.
          </p>
        </DisclaimerSection>

        {/* Section 5 */}
        <DisclaimerSection
          id="limitation-indemnification"
          title="5. Limitation of Liability & Indemnification"
          icon={Scale}
        >
          <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
            Disclaimer of Warranties
          </p>
          <p>
            THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, TIMELINESS, OR NON-INFRINGEMENT.
          </p>
          <p className="font-semibold text-foreground text-xs uppercase tracking-wider mt-3">
            Limitation of Liability
          </p>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL FIREWORKS, ITS DEVELOPERS, OPERATORS, OR AFFILIATES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE, SAVINGS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p className="font-semibold text-foreground text-xs uppercase tracking-wider mt-3">
            Indemnification Clause
          </p>
          <p>
            You agree to defend, indemnify, and hold harmless Fireworks, its developers, contributors, and operators from and against any third-party claims, actions, demands, liabilities, damages, losses, costs, or expenses (including legal fees) arising out of or related to your reliance on software outputs, misuse of the Service, or violation of these terms.
          </p>
        </DisclaimerSection>

        {/* Section 6 */}
        <DisclaimerSection
          id="ai-privacy"
          title="6. Third-Party AI Data Boundaries (Google Gemini)"
          icon={Cpu}
        >
          <p>
            Fireworks incorporates optional AI-assisted features (such as &ldquo;Get tips&rdquo; and &ldquo;Import with AI&rdquo;) powered by the Google Gemini API.
          </p>
          <p>
            Data sent to Gemini API endpoints is strictly limited to anonymous numerical metrics or user-pasted fund strings. No personally identifiable information (PII)—such as your name, email address, IP address, or account identifier—is transmitted.
          </p>
          <p>
            Requests are processed transiently in-flight and are not retained or utilized by Google to train foundation models under Google Cloud Enterprise privacy commitments. AI-generated insights are automated suggestions and must be independently verified.
          </p>
        </DisclaimerSection>

        {/* Section 7 */}
        <DisclaimerSection
          id="regulatory-disclosures"
          title="7. Regulatory Disclosures (US SEC/FINRA & UK FCA Context)"
          icon={Building2}
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-semibold text-foreground text-sm">
                United States Regulatory Context (SEC & FINRA)
              </h3>
              <p className="mt-1 text-xs sm:text-sm">
                Fireworks is not registered as an Investment Adviser under the US Investment Advisers Act of 1940 or applicable state securities laws. Fireworks is not a broker-dealer and is not registered with the US Securities and Exchange Commission (SEC) or the Financial Industry Regulatory Authority (FINRA). Software tools and financial calculators provided by Fireworks do not constitute personalized investment recommendations or solicitation of securities transactions.
              </p>
            </div>
            <div className="border-t border-border/40 pt-3">
              <h3 className="font-display font-semibold text-foreground text-sm">
                United Kingdom Regulatory Context (FCA & FSMA)
              </h3>
              <p className="mt-1 text-xs sm:text-sm">
                Fireworks is not authorized or regulated by the UK Financial Conduct Authority (FCA) under the Financial Services and Markets Act 2000 (FSMA). Fireworks does not carry out regulated financial activities within the meaning of the Financial Services and Markets Act 2000 (Regulated Activities) Order 2001. The Service operates as an un-regulated financial modeling tool for self-directed personal educational use.
              </p>
            </div>
          </div>
        </DisclaimerSection>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
        <p>Questions regarding our legal disclosures or calculation methodology?</p>
        <div className="flex items-center gap-4">
          <Link
            href="/methodology"
            className="text-foreground underline-offset-2 hover:underline font-medium"
          >
            Tax & Math Methodology
          </Link>
          <Link
            href="/privacy"
            className="text-foreground underline-offset-2 hover:underline font-medium"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
