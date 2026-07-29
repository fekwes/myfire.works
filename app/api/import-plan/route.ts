import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { checkInOrder, clientIp, createRateLimiter } from "@/lib/rate-limit";
import { ASSET_CLASSES } from "@/lib/portfolio-import";
import { generateContentWithFallback } from "@/lib/ai-runner";
import { parseTextPlanFallback } from "@/lib/plan-import-fallback";

import { extractTextFromPdfBuffer } from "@/lib/pdf-parser";

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

const SYSTEM_INSTRUCTION = `You are a universal UK financial statement data extractor. Extract account wrapper balances, monthly contributions, and holdings from any UK bank or investment broker statement (PDF, screenshot, spreadsheet, or text paste).

Map extracted totals accurately:
- SIPP / Pension (SIPP, Personal Pension, Workplace Pension, Vanguard Personal Pension, NPR, Group Pension, Stakeholder Pension, Drawdown Account, Executive Pension, 401k, IRA) -> sippBalance
- ISA (Stocks & Shares ISA, Stocks/Shares ISA, S&S ISA, ISA, Flexible ISA, Cash ISA, Lifetime ISA, LISA, Junior ISA, JISA) -> isaBalance
- GIA / Taxable / Cash Savings (Personal Portfolio, General Investment Account, GIA, Non-ISA Savings, Non-ISA Since 2025, Fund & Share Account, Dealing Account, Trading Account, Investment Account, Unwrapped Account, Brokerage, Current Account, Cash Savings Pot) -> giaBalance
- Primary Residence / Home Property -> homeValue
- Rental Property Value & Monthly Rent -> rentalValue, rentalMonthlyIncome
- Part-time / Side Hustle Annual Income -> partTimeAnnualIncome
- Target Annual Income, Current Age, Target Retirement Age if present.

PIE CHARTS & PERCENTAGE BREAKDOWNS:
If the document includes a Product Wrapper Allocation pie chart or table listing percentage splits (e.g. Personal Pension 48.18%, ISA 23.77%, Non-ISA Savings 18.13%, Non-ISA Since 2025 9.92%) and a Total Portfolio Value (e.g. £701,293.56), multiply the total portfolio value by each wrapper percentage to calculate the exact balances for sippBalance, isaBalance, and giaBalance!

Inspect valuation summary tables, portfolio breakdown pie charts, and account summaries.
Do NOT extract 8-digit account numbers, sort codes, policy numbers, or ISIN codes as monetary values.
Only output explicit numerical facts. Output the JSON matching the schema.`;

function detectMimeType(data: string, fileName?: string, defaultMime?: string): string {
  if (defaultMime && defaultMime !== "application/octet-stream") {
    return defaultMime;
  }
  if (fileName) {
    if (/\.pdf$/i.test(fileName)) return "application/pdf";
    if (/\.png$/i.test(fileName)) return "image/png";
    if (/\.(jpe?g)$/i.test(fileName)) return "image/jpeg";
    if (/\.webp$/i.test(fileName)) return "image/webp";
  }
  if (data.startsWith("JVBER")) return "application/pdf";
  if (data.startsWith("iVBORw0KGgo")) return "image/png";
  if (data.startsWith("/9j/")) return "image/jpeg";
  if (data.startsWith("UklGR")) return "image/webp";
  return defaultMime || "application/pdf";
}

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

  let fileExtractedText =
    body.file && typeof body.file === "object" && typeof body.file.extractedText === "string"
      ? body.file.extractedText.trim()
      : "";

  let inferredMimeType = "application/pdf";

  if (body.file && typeof body.file === "object" && typeof body.file.data === "string") {
    inferredMimeType = detectMimeType(body.file.data, body.file.name, body.file.mimeType);

    // Attempt server-side PDF stream text extraction whenever binary data is provided
    try {
      const pdfBuffer = Buffer.from(body.file.data, "base64");
      const serverExtracted = extractTextFromPdfBuffer(pdfBuffer);
      if (serverExtracted && serverExtracted.length > fileExtractedText.length) {
        fileExtractedText = serverExtracted;
      }
    } catch {
      // non-fatal
    }
  }

  const combinedText = [textInput, fileExtractedText].filter(Boolean).join("\n\n");

  if (retryAfter !== null || !apiKey) {
    const fallbackPlan = combinedText ? parseTextPlanFallback(combinedText) : {};
    return NextResponse.json({ plan: fallbackPlan });
  }

  // Build a proper parts array for the Gemini SDK.
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  if (combinedText) {
    // Truncate text if very large rather than failing the import
    const truncatedText = combinedText.length > 30000 ? combinedText.slice(0, 30000) : combinedText;
    parts.push({ text: `Document text content:\n${truncatedText}` });
  }

  if (body.file && typeof body.file === "object" && typeof body.file.data === "string") {
    if (body.file.data.length <= 10 * 1024 * 1024 * 1.4) {
      parts.push({
        inlineData: {
          data: body.file.data,
          mimeType: inferredMimeType,
        },
      });
      parts.unshift({
        text: "Extract all financial figures from this portfolio valuation document into SIPP, ISA, and GIA balances.",
      });
    }
  }

  if (parts.length === 0) {
    return NextResponse.json({ plan: {} });
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

    const cleanedText = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    let parsedPlan: Record<string, unknown> = {};
    try {
      parsedPlan = JSON.parse(cleanedText);
    } catch {
      const match = cleanedText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedPlan = JSON.parse(match[0]);
      }
    }

    // Convert stringified numbers e.g. "337856.14" to Numbers
    for (const [key, val] of Object.entries(parsedPlan)) {
      if (typeof val === "string") {
        const num = parseFloat(val.replace(/[,£$]/g, ""));
        if (!isNaN(num)) {
          parsedPlan[key] = num;
        }
      }
    }

    // Merge rule-based extraction fallback for any missing fields if combinedText exists
    if (combinedText) {
      const fallbackPlan = parseTextPlanFallback(combinedText);
      parsedPlan = { ...fallbackPlan, ...parsedPlan };
    }

    return NextResponse.json({ plan: parsedPlan });
  } catch (err) {
    console.warn("AI import failed, attempting rule-based fallback:", err);
    const fallbackPlan = combinedText ? parseTextPlanFallback(combinedText) : {};
    return NextResponse.json({ plan: fallbackPlan });
  }
}
