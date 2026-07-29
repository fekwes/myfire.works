import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { AI_QUOTA_MESSAGE, isQuotaExhausted } from "@/lib/ai-errors";
import { extractPdfText } from "@/lib/pdf-parser";
import { parsePlanFromText } from "@/lib/plan-import-fallback";
import { buildImportPlanFallbackPayload, mergePlanImportResults } from "@/lib/plan-import-router";
import { ASSET_CLASSES } from "@/lib/portfolio-import";
import { checkInOrder, clientIp, createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

const perMinute = createRateLimiter({ windowMs: 60_000, max: 5 });
const perDay = createRateLimiter({ windowMs: 86_400_000, max: 40 });
const globalPerDay = createRateLimiter({ windowMs: 86_400_000, max: 500 });

function limited(request: Request): number | null {
  const ip = clientIp(request);
  const result = checkInOrder([
    () => perMinute.check(ip),
    () => perDay.check(ip),
    () => globalPerDay.check("global"),
  ]);
  return result.allowed ? null : Math.ceil(result.retryAfterMs / 1000);
}

const PLAN_IMPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    wrappers: {
      type: Type.OBJECT,
      properties: {
        sipp: { type: Type.NUMBER },
        isa: { type: Type.NUMBER },
        gia: { type: Type.NUMBER },
        emergencyFund: { type: Type.NUMBER },
        monthlyContribution: { type: Type.NUMBER },
      },
    },
    holdings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          assetClass: { type: Type.STRING, enum: [...ASSET_CLASSES] },
          ocf: { type: Type.NUMBER },
          weight: { type: Type.NUMBER },
        },
        required: ["label", "assetClass", "ocf", "weight"],
        propertyOrdering: ["label", "assetClass", "ocf", "weight"],
      },
    },
  },
  required: ["wrappers", "holdings"],
};

const SYSTEM_INSTRUCTION = `You extract UK financial investment plan data from uploaded PDF statements (such as Vanguard UK 10-page portfolio valuation statements) or pasted statement text.

GUIDELINES FOR MULTI-PAGE UK BROKER STATEMENTS (Vanguard UK, Hargreaves Lansdown, AJ Bell, Fidelity):
1. Wrapper Totals vs Fund Breakdown:
   - Statements contain a top-level summary section titled "Portfolio Value by Product Wrapper" or "Portfolio Summary" (usually on Page 1 or 2).
   - ALWAYS use the summary section's total wrapper valuation amounts for wrapper balances rather than summing individual fund holdings.
2. UK Product Wrapper Mapping:
   - SIPP: Map "Vanguard Personal Pension", "Personal Pension", "SIPP", "Self-Invested Personal Pension", or pension wrapper lines to wrappers.sipp.
   - ISA: Map "Stocks & Shares ISA", "Vanguard Stocks & Shares ISA", "ISA", "Stocks and Shares ISA", or similar account labels to wrappers.isa.
   - GIA: Map "General Investment Account", "Personal Portfolio", "GIA", "Stocks/Shares", "Flexible Account", or "Bridge Fund" to wrappers.gia.
3. Messy Text and PDF Handling:
   - Handle free-text, line breaks, multi-column layouts, account references, headers, and small OCR noise.
   - If the statement is messy or partially parsed, extract whatever wrapper values and monthly contributions are clearly present rather than failing entirely.
   - Support mixed currency notation such as £337,856.14, 337,856.14, 337856.14, 337856.14 GBP, or similar.
   - When figures are ambiguous, prefer the summary wrapper total over any per-fund line item.
4. Monthly Contribution / Savings Mapping:
   - If the statement mentions monthly contribution, regular investment, monthly savings, or similar, place the value in wrappers.monthlyContribution.
5. Fund Classification:
   - For distinct fund holdings, classify assetClass into: global-equity, us-equity, multi-asset-100, multi-asset-80, multi-asset-60, global-bonds, cash.
   - ocf: decimal fraction (0.002 = 0.2%).
   - weight: share of total portfolio (sums to ~1).

Only return data present in the document. Do not invent values or funds. If only some of the fields are clear, return the values you are confident about and leave the rest null.`;

export async function POST(request: Request) {
  const retryAfter = limited(request);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "You've hit the import limit — please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: { text?: string; fileBase64?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, fileBase64, mimeType = "application/pdf" } = body;

  if (!text && !fileBase64) {
    return NextResponse.json(
      { error: "Please upload a PDF file or paste your statement text." },
      { status: 400 },
    );
  }

  const extractedText = text || (fileBase64 ? extractPdfText(fileBase64) : "");

  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback if no Gemini API key is configured
  if (!apiKey) {
    if (extractedText) {
      const fallbackResult = parsePlanFromText(extractedText);
      const payload = buildImportPlanFallbackPayload(fallbackResult, "fallback-pdf-text-parser");
      return NextResponse.json(payload);
    }
    return NextResponse.json(
      { error: "AI import isn't enabled on this server and text fallback unavailable for raw PDF." },
      { status: 530 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const fallbackResult = extractedText ? parsePlanFromText(extractedText) : parsePlanFromText("");

  if (fallbackResult.confidenceScore >= 0.8 && (fallbackResult.wrappers.sipp || fallbackResult.wrappers.isa || fallbackResult.wrappers.gia || fallbackResult.holdings.length > 0)) {
    return NextResponse.json(buildImportPlanFallbackPayload(fallbackResult, "fallback-text-parser"));
  }

  try {
    const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [];

    if (fileBase64) {
      contents.push({
        inlineData: {
          data: fileBase64.replace(/^data:application\/pdf;base64,/, ""),
          mimeType,
        },
      });
      contents.push("Extract the wrapper balances and fund holdings from this multi-page financial statement PDF.");
    } else if (text) {
      contents.push(`Extract financial plan data from this statement text:\n\n${text}`);
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: PLAN_IMPORT_SCHEMA,
        temperature: 0.1,
      },
    });

    const parsedJson = JSON.parse(response.text ?? "{}");
    const aiWrappers = parsedJson.wrappers ?? {};
    const aiHoldings = parsedJson.holdings;

    const payload = mergePlanImportResults({
      fallbackResult,
      aiWrappers,
      aiHoldings,
      source: "gemini-2.0-flash",
      warning: null,
    });

    if (payload.wrappers.sipp === null && payload.wrappers.isa === null && payload.wrappers.gia === null && payload.holdings.length === 0) {
      payload.warning = "We caught some figures, but please verify these fields.";
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("import-plan: Gemini request failed", error);

    // Soft-fail to PDF/text stream fallback parser if text can be extracted
    if (extractedText) {
      const fallbackResult = parsePlanFromText(extractedText);
      const payload = buildImportPlanFallbackPayload(fallbackResult, "fallback-text-parser");
      return NextResponse.json(payload);
    }

    if (isQuotaExhausted(error)) {
      return NextResponse.json({ error: AI_QUOTA_MESSAGE }, { status: 429 });
    }

    return NextResponse.json(
      { error: "Document processing failed. Please try pasting text or uploading another file." },
      { status: 502 },
    );
  }
}
