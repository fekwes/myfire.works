import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { checkInOrder, clientIp, createRateLimiter } from "@/lib/rate-limit";
import { ASSET_CLASSES } from "@/lib/portfolio-import";
import { generateContentWithFallback } from "@/lib/ai-runner";
import { parseTextPlanFallback } from "@/lib/plan-import-fallback";

export const runtime = "nodejs";

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

const HOLDING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    assetClass: { type: Type.STRING, enum: [...ASSET_CLASSES] },
    ocf: { type: Type.NUMBER },
    weight: { type: Type.NUMBER },
  },
  required: ["label", "assetClass", "ocf", "weight"],
};

const PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    currentAge: { type: Type.NUMBER },
    retirementAge: { type: Type.NUMBER },
    targetAnnualIncome: { type: Type.NUMBER },
    isaBalance: { type: Type.NUMBER },
    isaMonthlyContribution: { type: Type.NUMBER },
    isaHoldings: { type: Type.ARRAY, items: HOLDING_SCHEMA },
    sippBalance: { type: Type.NUMBER },
    sippMonthlyContribution: { type: Type.NUMBER },
    sippHoldings: { type: Type.ARRAY, items: HOLDING_SCHEMA },
    giaBalance: { type: Type.NUMBER },
    giaMonthlyContribution: { type: Type.NUMBER },
    giaHoldings: { type: Type.ARRAY, items: HOLDING_SCHEMA },
    homeValue: { type: Type.NUMBER },
    rentalValue: { type: Type.NUMBER },
    rentalMonthlyIncome: { type: Type.NUMBER },
    partTimeAnnualIncome: { type: Type.NUMBER },
    sippAccessAge: { type: Type.NUMBER },
    statePensionAge: { type: Type.NUMBER },
  },
};

const SYSTEM_INSTRUCTION = `You are a financial data extractor. Extract the user's financial plan figures from the provided text, spreadsheet cells, statement PDF, or screenshot.
Identify current age, target retirement age, target annual income, balances, monthly contributions, and holdings for each wrapper: ISA, SIPP (pension), and GIA (General Investment Account), plus home value, rental property details, and part-time income.
Only extract facts explicitly stated. Do not estimate, guess, or invent numbers not present.
If a holding list is provided for a wrapper, classify each holding (assetClass, ocf, weight).
Output the extracted JSON matching the schema.`;

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const textInput = typeof body.text === "string" ? body.text.trim() : "";
  const retryAfter = limited(request);
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (retryAfter !== null || !apiKey) {
    if (textInput) {
      const fallbackPlan = parseTextPlanFallback(textInput);
      if (Object.keys(fallbackPlan).length > 0) {
        return NextResponse.json({ plan: fallbackPlan });
      }
    }
    return NextResponse.json(
      { error: "Couldn't extract plan from the input — check the format and try again." },
      { status: 422 },
    );
  }

  // Build a proper parts array for the Gemini SDK.
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  if (textInput) {
    if (textInput.length > 20000) {
      return NextResponse.json({ error: "Text is too long." }, { status: 413 });
    }
    parts.push({ text: textInput });
  }

  if (body.file && typeof body.file === "object" && typeof body.file.data === "string") {
    if (body.file.data.length > 5 * 1024 * 1024 * 1.4) {
      return NextResponse.json({ error: "File is too large." }, { status: 413 });
    }
    parts.push({
      inlineData: {
        data: body.file.data,
        mimeType: body.file.mimeType ?? "application/pdf",
      },
    });
    if (parts.length === 1) {
      parts.unshift({ text: "Extract the financial plan figures from this document." });
    }
  }

  if (parts.length === 0) {
    return NextResponse.json({ error: "No content provided." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await generateContentWithFallback(
      ai,
      {
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: PLAN_SCHEMA,
          temperature: 0,
        },
      },
      "gemini-2.0-flash",
    );

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    return NextResponse.json({ plan: JSON.parse(text) });
  } catch (err) {
    console.warn("AI import failed, attempting rule-based fallback:", err);
    if (textInput) {
      const fallbackPlan = parseTextPlanFallback(textInput);
      if (Object.keys(fallbackPlan).length > 0) {
        return NextResponse.json({ plan: fallbackPlan });
      }
    }
    return NextResponse.json(
      { error: "Couldn't extract plan from the input — check the format and try again." },
      { status: 422 },
    );
  }
}
