import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { AI_QUOTA_MESSAGE, isQuotaExhausted } from "@/lib/ai-errors";
import { checkInOrder, clientIp, createRateLimiter } from "@/lib/rate-limit";
import { ASSET_CLASSES } from "@/lib/portfolio-import";
import { generateContentWithFallback } from "@/lib/ai-runner";

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
  },
};

const SYSTEM_INSTRUCTION = `You are a financial data extractor. Extract the user's financial plan figures from the provided text, spreadsheet cells, statement PDF, or screenshot.
Identify balances, monthly contributions, and holdings for each wrapper: ISA, SIPP (pension), and GIA (General Investment Account), plus home value and rental property details.
Only extract facts explicitly stated. Do not estimate, guess, or invent numbers not present.
If a holding list is provided for a wrapper, classify each holding (assetClass, ocf, weight).
Never set a growth rate, inflation rate, return, or age. Just output the extracted JSON matching the schema.`;

export async function POST(request: Request) {
  const retryAfter = limited(request);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "AI import is busy — please enter your figures instead." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI import isn't enabled on this server." },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  // Build a proper parts array for the Gemini SDK.
  // The SDK's `contents` field accepts a string (single text turn) OR an array
  // of Content objects with role + parts. When mixing text and inline files we
  // must use the parts form.
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  if (body.text) {
    const trimmed = String(body.text).trim();
    if (trimmed.length < 3) {
      return NextResponse.json({ error: "Please paste your statement or figures first." }, { status: 400 });
    }
    if (trimmed.length > 20000) {
      return NextResponse.json({ error: "Text is too long." }, { status: 413 });
    }
    parts.push({ text: trimmed });
  }

  if (body.file) {
    // 5MB max base64
    if (body.file.data.length > 5 * 1024 * 1024 * 1.4) {
      return NextResponse.json({ error: "File is too large." }, { status: 413 });
    }
    parts.push({
      inlineData: {
        data: body.file.data,
        mimeType: body.file.mimeType,
      },
    });
    // Add a text prompt alongside the file so the model knows what to do
    if (parts.length === 1) {
      parts.unshift({ text: "Extract the financial plan figures from this document." });
    }
  }

  if (parts.length === 0) {
    return NextResponse.json({ error: "No content provided." }, { status: 400 });
  }

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
    if (isQuotaExhausted(err)) {
      return NextResponse.json({ error: AI_QUOTA_MESSAGE }, { status: 429 });
    }
    // Surface enough to diagnose without leaking secrets.
    const status = (err as { status?: number } | null)?.status;
    const code = (err as { code?: string } | null)?.code;
    const brief =
      err instanceof Error
        ? err.message.slice(0, 200)
        : typeof err === "string"
          ? err.slice(0, 200)
          : JSON.stringify(err).slice(0, 200);
    console.error("AI import failed:", brief, err);
    return NextResponse.json(
      { error: `AI import error${status ? ` (${status})` : ""}${code ? ` [${code}]` : ""}: ${brief}` },
      { status: 500 },
    );
  }
}
