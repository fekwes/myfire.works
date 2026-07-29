import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { AI_QUOTA_MESSAGE, isQuotaExhausted } from "@/lib/ai-errors";
import { extractPdfText, extractTextFromPdfBuffer } from "@/lib/pdf-parser";
import { parsePlanFromText, parseTextPlanFallback } from "@/lib/plan-import-fallback";
import { buildImportPlanFallbackPayload, mergePlanImportResults } from "@/lib/plan-import-router";
import { scoreExtractedPlan } from "@/lib/plan-import-confidence";
import { ASSET_CLASSES } from "@/lib/portfolio-import";
import { checkInOrder, clientIp, createRateLimiter } from "@/lib/rate-limit";

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
      },
    },
  },
  required: ["wrappers"],
};

const SYSTEM_INSTRUCTION = `You extract UK financial investment plan data from uploaded PDF statements (such as Vanguard UK 10-page portfolio valuation statements) or pasted statement text.

GUIDELINES FOR MULTI-PAGE UK BROKER STATEMENTS (Vanguard UK, Hargreaves Lansdown, AJ Bell, Fidelity):
1. Wrapper Totals vs Fund Breakdown:
   - Statements contain a top-level summary section titled "Portfolio Value by Product Wrapper" or "Portfolio Summary" (usually on Page 1 or 2).
   - ALWAYS use the summary section's total wrapper valuation amounts for wrapper balances rather than summing individual fund holdings.
2. UK Product Wrapper Mapping:
   - SIPP: Map "Vanguard Personal Pension", "Personal Pension", "SIPP", "Self-Invested Personal Pension", or pension wrapper lines to wrappers.sipp / sippBalance.
   - ISA: Map "Stocks & Shares ISA", "Vanguard Stocks & Shares ISA", "ISA", "Stocks and Shares ISA", or similar account labels to wrappers.isa / isaBalance.
   - GIA: Map "General Investment Account", "Personal Portfolio", "GIA", "Stocks/Shares", "Flexible Account", or "Bridge Fund" to wrappers.gia / giaBalance.
3. Messy Text and PDF Handling:
   - Handle free-text, line breaks, multi-column layouts, account references, headers, and small OCR noise.
   - If the statement is messy or partially parsed, extract whatever wrapper values and monthly contributions are clearly present rather than failing entirely.
   - Support mixed currency notation such as £337,856.14, 337,856.14, 337856.14, 337856.14 GBP, or similar.
4. Monthly Contribution / Savings Mapping:
   - If the statement mentions monthly contribution, regular investment, monthly savings, or similar, place the value in wrappers.monthlyContribution.

Only return data present in the document. Do not invent values or funds. If only some of the fields are clear, return the values you are confident about and leave the rest null.`;

export async function POST(request: Request) {
  const retryAfter = limited(request);

  let body: { text?: string; fileBase64?: string; file?: { data?: string; name?: string; mimeType?: string; extractedText?: string }; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const textInput = typeof body.text === "string" ? body.text.trim() : "";
  let fileBase64 = body.fileBase64 || (body.file && typeof body.file === "object" ? body.file.data : undefined);

  let fileExtractedText = "";
  if (body.file && typeof body.file === "object" && typeof body.file.extractedText === "string") {
    fileExtractedText = body.file.extractedText.trim();
  }

  if (fileBase64) {
    try {
      const pdfBuf = Buffer.from(fileBase64.replace(/^data:application\/pdf;base64,/, ""), "base64");
      const serverExtracted = extractTextFromPdfBuffer(pdfBuf);
      if (serverExtracted && serverExtracted.length > fileExtractedText.length) {
        fileExtractedText = serverExtracted;
      }
    } catch {
      // non-fatal fallback
    }
  }

  const combinedText = [textInput, fileExtractedText].filter(Boolean).join("\n\n");

  // 1. Fast Deterministic Extraction & Confidence Scoring
  const deterministicPlan = combinedText ? parseTextPlanFallback(combinedText) : {};
  const deterministicScore = scoreExtractedPlan(deterministicPlan);

  // High confidence fast path (>= 0.8)
  if (deterministicScore.confidence >= 0.8) {
    const fallbackResult = parsePlanFromText(combinedText);
    const payload = buildImportPlanFallbackPayload(fallbackResult, "deterministic");
    return NextResponse.json({
      plan: deterministicPlan,
      ...payload,
      confidence: deterministicScore.confidence,
      method: "deterministic",
    });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // Rate-limited or no API key -> Soft failover to deterministic extraction
  if (retryAfter !== null || !apiKey) {
    const fallbackResult = parsePlanFromText(combinedText);
    const payload = buildImportPlanFallbackPayload(fallbackResult, "fallback-text-parser");
    return NextResponse.json({
      plan: deterministicPlan,
      ...payload,
      confidence: deterministicScore.confidence,
      warningMessage: deterministicScore.warningMessage,
      method: "fallback",
    });
  }

  // 2. Gemini 2.0 Flash Routing
  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [];

    if (fileBase64) {
      contents.push({
        inlineData: {
          data: fileBase64.replace(/^data:application\/pdf;base64,/, ""),
          mimeType: body.mimeType || "application/pdf",
        },
      });
      contents.push("Extract all financial figures from this portfolio valuation document into SIPP, ISA, and GIA balances.");
    } else if (combinedText) {
      contents.push(`Extract financial plan data from this statement text:\n\n${combinedText}`);
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: PLAN_IMPORT_SCHEMA,
        temperature: 0,
      },
    });

    const parsedJson = JSON.parse(response.text ?? "{}");
    const aiWrappers = parsedJson.wrappers ?? {};
    const aiHoldings = parsedJson.holdings ?? [];

    const fallbackResult = parsePlanFromText(combinedText);
    const payload = mergePlanImportResults({
      fallbackResult,
      aiWrappers,
      aiHoldings,
      source: "gemini-2.0-flash",
      warning: null,
    });

    const llmPlan: Record<string, number | undefined> = {
      sippBalance: typeof aiWrappers.sipp === "number" && aiWrappers.sipp > 0 ? aiWrappers.sipp : undefined,
      isaBalance: typeof aiWrappers.isa === "number" && aiWrappers.isa > 0 ? aiWrappers.isa : undefined,
      giaBalance: typeof aiWrappers.gia === "number" && aiWrappers.gia > 0 ? aiWrappers.gia : undefined,
    };

    const mergedPlan = { ...deterministicPlan, ...llmPlan };
    const finalScore = scoreExtractedPlan(mergedPlan);

    return NextResponse.json({
      plan: mergedPlan,
      ...payload,
      confidence: finalScore.confidence,
      warningMessage: finalScore.warningMessage,
      method: "hybrid",
    });
  } catch (err) {
    console.warn("AI import failed, falling back to deterministic extraction:", err);
    if (isQuotaExhausted(err)) {
      const fallbackResult = parsePlanFromText(combinedText);
      const payload = buildImportPlanFallbackPayload(fallbackResult, "fallback-text-parser");
      return NextResponse.json({
        plan: deterministicPlan,
        ...payload,
        error: AI_QUOTA_MESSAGE,
        confidence: deterministicScore.confidence,
        warningMessage: deterministicScore.warningMessage,
      });
    }

    const fallbackResult = parsePlanFromText(combinedText);
    const payload = buildImportPlanFallbackPayload(fallbackResult, "fallback-text-parser");
    return NextResponse.json({
      plan: deterministicPlan,
      ...payload,
      confidence: deterministicScore.confidence,
      warningMessage: deterministicScore.warningMessage,
      method: "fallback",
    });
  }
}
