import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { AI_QUOTA_MESSAGE, isQuotaExhausted } from "@/lib/ai-errors";
import { formatCurrency } from "@/lib/format";
import { checkInOrder, clientIp, createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

// The AI tips call is the one paid, abusable endpoint. Limit it per client IP
// (a short burst window + a daily cap) plus a global daily backstop so a single
// instance can't run away with the AI provider's quota. In-memory per instance —
// swap for a shared store (Upstash/KV) behind the same interface in production.
const perMinute = createRateLimiter({ windowMs: 60_000, max: 5 });
const perDay = createRateLimiter({ windowMs: 86_400_000, max: 40 });
const globalPerDay = createRateLimiter({ windowMs: 86_400_000, max: 500 });

function limited(request: Request): number | null {
  const ip = clientIp(request);
  // Narrowest first, and short-circuiting: an already-blocked caller must not
  // spend the global daily budget on its way to a 429. See `checkInOrder`.
  const result = checkInOrder([
    () => perMinute.check(ip),
    () => perDay.check(ip),
    () => globalPerDay.check("global"),
  ]);
  return result.allowed ? null : Math.ceil(result.retryAfterMs / 1000);
}

/** Reject obviously malformed/oversized bodies before doing any paid work. */
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
  // Rate-limit first — protect the endpoint from volume regardless of config.
  const retryAfter = limited(request);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "You've hit the AI tips limit — please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Not configured is a deliberate deployment state, not a fault — and the
    // name of the missing secret is nobody's business but the operator's.
    return NextResponse.json(
      { error: "AI tips aren't enabled on this server." },
      { status: 503 },
    );
  }

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
    const response = await ai.models.generateContent({
      // "latest" tracks the current Flash model so it won't retire underneath us.
      model: "gemini-flash-latest",
      contents: `Based on this simulation, give exactly 3 tailored strategy tips. If UK: cover SIPP tax-relief vs ISA-bridge, GIA CGT allowance, and closing the gap. If US: cover 401(k)/Traditional IRA vs Roth vs Brokerage tax optimization, and closing the gap. Reference current tax bands.\n\n${summary}`,
      config: {
        systemInstruction:
          "You are a financial planning assistant specializing in FIRE (Financial Independence, Retire Early) strategy. Give tailored, concrete tips referencing current tax rules for the requested country (e.g. ISA/SIPP/UK bands vs 401k/Roth/US Federal bands). Keep tips educational, not regulated financial advice.",
        responseMimeType: "application/json",
        responseSchema: TIPS_SCHEMA,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json(
        { error: "No response generated." },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(text) as AnalyzeResponse;
    return NextResponse.json(parsed);
  } catch (error) {
    // The upstream message can carry quota details, project identifiers and
    // model internals. It goes to the server log, never to the browser.
    console.error("analyze: Gemini request failed", error);
    // A spent daily quota is a limit, not an outage — say so, or "try again"
    // just fails again. Its own status so the client can tell them apart.
    if (isQuotaExhausted(error)) {
      return NextResponse.json({ error: AI_QUOTA_MESSAGE }, { status: 429 });
    }
    return NextResponse.json(
      { error: "The tips service is unavailable right now — please try again." },
      { status: 502 },
    );
  }
}
