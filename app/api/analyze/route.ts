import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { formatCurrency } from "@/lib/format";
import { checkInOrder, clientIp, createRateLimiter } from "@/lib/rate-limit";
import { generateContentWithFallback } from "@/lib/ai-runner";
import { generateDeterministicTips } from "@/lib/deterministic-tips";

export const runtime = "nodejs";

// The AI tips call is limited per client IP (short burst window + daily cap)
// plus a global daily backstop.
const perMinute = createRateLimiter({ windowMs: 60_000, max: 10 });
const perDay = createRateLimiter({ windowMs: 86_400_000, max: 50 });
const globalPerDay = createRateLimiter({ windowMs: 86_400_000, max: 1000 });

function limited(request: Request): number | null {
  const ip = clientIp(request);
  const result = checkInOrder([
    () => perMinute.check(ip),
    () => perDay.check(ip),
    () => globalPerDay.check("global"),
  ]);
  return result.allowed ? null : Math.ceil(result.retryAfterMs / 1000);
}

/** Reject obviously malformed/oversized bodies before doing work. */
function isValidBody(body: unknown): body is AnalyzeRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.currentAge === "number" &&
    typeof b.retirementAge === "number" &&
    typeof b.targetAnnualIncome === "number"
  );
}

interface AnalyzeRequest {
  currentAge: number;
  retirementAge: number;
  targetAnnualIncome: number;
  isaBalance: number;
  isaMonthlyContribution: number;
  giaBalance: number;
  sippBalance: number;
  sippMonthlyContribution: number;
  propertyValue: number;
  fireNumber: number;
  projectedAtRetirement: number;
  sippAccessAge: number;
  statePensionAge: number;
  taxFreeLumpSum: number;
  sustainableToLifeExpectancy: boolean;
  isaDepletedAge: number | null;
  sippDepletedAge: number | null;
}

interface AnalyzeResponse {
  tips: { title: string; detail: string }[];
  isFallback?: boolean;
}

// Gemini structured-output schema (uses the SDK's Type enum).
const TIPS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tips: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "3",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
        },
        required: ["title", "detail"],
        propertyOrdering: ["title", "detail"],
      },
    },
  },
  required: ["tips"],
};

export async function POST(request: Request) {
  // Cap the request size before parsing, then validate the shape.
  const raw = await request.text();
  if (raw.length > 4000) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }
  let body: AnalyzeRequest;
  try {
    const parsed = JSON.parse(raw);
    if (!isValidBody(parsed)) throw new Error("invalid");
    body = parsed;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  // Check rate limit. If limited or no API key, return rule-based tips immediately
  // for smooth UX with zero dead-ends.
  const retryAfter = limited(request);
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (retryAfter !== null || !apiKey) {
    return NextResponse.json({
      tips: generateDeterministicTips(body),
      isFallback: true,
    });
  }

  const summary = `
UK FIRE simulation summary:
- Current age: ${body.currentAge}, target retirement age: ${body.retirementAge}
- Target net annual income: ${formatCurrency(body.targetAnnualIncome)}
- ISA balance: ${formatCurrency(body.isaBalance)} (adding ${formatCurrency(body.isaMonthlyContribution)}/mo)
- GIA (taxable) balance: ${formatCurrency(body.giaBalance)}
- SIPP balance: ${formatCurrency(body.sippBalance)} (adding ${formatCurrency(body.sippMonthlyContribution)}/mo)
- Property value: ${formatCurrency(body.propertyValue)}
- FIRE number (pot needed at retirement): ${formatCurrency(body.fireNumber)}; on course for ${formatCurrency(body.projectedAtRetirement)}
- SIPP accessible from age ${body.sippAccessAge}; State Pension from age ${body.statePensionAge}
- Tax-free lump sum available at SIPP access: ${formatCurrency(body.taxFreeLumpSum)}
- Plan sustainable to age 95: ${body.sustainableToLifeExpectancy ? "yes" : "no"}
- ISA depleted at age: ${body.isaDepletedAge ?? "never"}
- SIPP depleted at age: ${body.sippDepletedAge ?? "never"}
`.trim();

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await generateContentWithFallback(
      ai,
      {
        contents: `Based on this simulation, give exactly 3 tailored strategy tips. If UK: cover SIPP tax-relief vs ISA-bridge, GIA CGT allowance, and closing the gap. If US: cover 401(k)/Traditional IRA vs Roth vs Brokerage tax optimization, and closing the gap. Reference current tax bands.\n\n${summary}`,
        config: {
          systemInstruction:
            "You are a financial planning assistant specializing in FIRE (Financial Independence, Retire Early) strategy. Give tailored, concrete tips referencing current tax rules for the requested country (e.g. ISA/SIPP/UK bands vs 401k/Roth/US Federal bands). Keep tips educational, not regulated financial advice.",
          responseMimeType: "application/json",
          responseSchema: TIPS_SCHEMA,
          temperature: 0.7,
        },
      },
      "gemini-2.0-flash",
    );

    const text = response.text;
    if (!text) {
      return NextResponse.json({
        tips: generateDeterministicTips(body),
        isFallback: true,
      });
    }

    const parsed = JSON.parse(text) as AnalyzeResponse;
    return NextResponse.json({ tips: parsed.tips, isFallback: false });
  } catch (error) {
    console.warn("analyze: Gemini API unavailable, returning rule-based tips fallback", error);
    // Seamless fallback to deterministic tips so the user never sees a broken UI or 429 error
    return NextResponse.json({
      tips: generateDeterministicTips(body),
      isFallback: true,
    });
  }
}
