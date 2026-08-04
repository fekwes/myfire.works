import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/ai-runner";
import { isQuotaExhausted } from "@/lib/ai-errors";
import { extractTextFromPdfBuffer } from "@/lib/pdf-parser";
import {
  buildImportPlanFallbackPayload,
  mergePlanImportResults,
  routePlanImport,
} from "@/lib/plan-import-router";
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

type ImportRequestBody = {
  text?: string;
  fileBase64?: string;
  file?: { data?: string; name?: string; mimeType?: string; extractedText?: string };
  mimeType?: string;
};

const nullableNumber = { type: Type.NUMBER, nullable: true };

export const PLAN_IMPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    plan: {
      type: Type.OBJECT,
      properties: {
        isaBalance: nullableNumber,
        isaMonthlyContribution: nullableNumber,
        sippBalance: nullableNumber,
        sippMonthlyContribution: nullableNumber,
        giaBalance: nullableNumber,
        giaMonthlyContribution: nullableNumber,
      },
      required: [
        "isaBalance",
        "isaMonthlyContribution",
        "sippBalance",
        "sippMonthlyContribution",
        "giaBalance",
        "giaMonthlyContribution",
      ],
      propertyOrdering: [
        "isaBalance",
        "isaMonthlyContribution",
        "sippBalance",
        "sippMonthlyContribution",
        "giaBalance",
        "giaMonthlyContribution",
      ],
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
  required: ["plan", "holdings"],
};

export const SYSTEM_INSTRUCTION = `You extract factual UK investment-plan data from uploaded broker valuation statements (PDF) and pasted statement text.

Target fields:
- isaBalance and isaMonthlyContribution: Stocks & Shares ISA / Individual Savings Account / Vanguard "Stocks/Shares" section.
- sippBalance and sippMonthlyContribution: SIPP, Self-Invested Personal Pension, Personal Pension, including Vanguard "NPR" (Personal Pension) section.
- giaBalance and giaMonthlyContribution: General Investment Account, Personal Portfolio, flexible non-ISA account (e.g. Non-ISA Savings, Non-ISA Since 2025), taxable brokerage, or Bridge Fund.

UK Broker Mapping Rules (Vanguard UK, Hargreaves Lansdown, AJ Bell, Fidelity):
1. MANDATORY Synonym Mapping:
   - "NPR" or "Vanguard Personal Pension" = SIPP / Pension. Extract the section "Total £..." line (e.g. £337,856.14) into sippBalance.
   - "Personal Portfolio", "Non-ISA Savings", or "Non-ISA Since 2025" = GIA / Taxable Account. Extract the section "Total £..." line (e.g. £196,717.05) into giaBalance.
   - "Stocks/Shares" or "Stocks & Shares ISA" = ISA. Extract the section "Total £..." line (e.g. £166,720.37) into isaBalance.
2. Product Wrapper Allocation Breakdown / Pie Chart Rule:
   - If individual section table totals are missing or obscured, check for the "Product Wrapper Allocation" summary table or pie chart (e.g. Vanguard Personal Pension 48.18%, Non-ISA Savings 18.13%, Non-ISA Since 2025 9.92%, ISA 23.77%) and Total Portfolio Value.
   - Calculate wrapper balances as: wrapperBalance = Total Portfolio Value * Percentage Share. Performing this calculation is REQUIRED extraction, NOT guessing.
3. Summary Table Priority:
   - Always use the Product Wrapper Valuation from the Portfolio Summary table rather than summing individual underlying fund holding lines.
4. Account References vs Balances:
   - Ignore account reference codes (e.g., NPR numbers like VG0220641, PO Box addresses, policy numbers).
5. Monthly Contributions:
   - Extract an account's contribution when associated with a monthly, regular, recurring, per-month, /mo, or p/m figure.
6. Ambiguous Total Fallback:
   - If a overall portfolio total or list of holdings is present but specific account wrappers are unlabelled, assign the unlabelled balance to isaBalance (if <= £100,000) or giaBalance (if > £100,000) so the user's starting wealth is preserved for review.

Return only the requested JSON schema. Populate all fields supported by the document. Set unsupported fields to null.`;

function importApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY
  );
}

function parseModelResponse(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const retryAfter = limited(request);

  let body: ImportRequestBody;
  try {
    const rawBody = await request.json();
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    body = rawBody as ImportRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Sanitize and constrain input sizes to prevent memory/CPU exhaustion
  const MAX_TEXT_LENGTH = 100_000;
  const textInput = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT_LENGTH) : "";
  
  let fileBase64: string | undefined = undefined;
  if (typeof body.fileBase64 === "string") {
    fileBase64 = body.fileBase64;
  } else if (body.file && typeof body.file === "object" && typeof body.file.data === "string") {
    fileBase64 = body.file.data;
  }

  if (fileBase64 && fileBase64.length > 15_000_000) { // ~11MB base64
    return NextResponse.json({ error: "File too large (max ~10MB)." }, { status: 413 });
  }

  if (!textInput && !fileBase64) {
    return NextResponse.json(
      { error: "Paste statement text or select a document to import." },
      { status: 400 },
    );
  }

  let fileExtractedText =
    body.file && typeof body.file.extractedText === "string" ? body.file.extractedText.trim() : "";
  
  const cleanBase64 = fileBase64 ? fileBase64.replace(/^data:[^;]+;base64,/, "") : undefined;

  if (cleanBase64) {
    try {
      const pdfBuffer = Buffer.from(cleanBase64, "base64");
      const extracted = await extractTextFromPdfBuffer(pdfBuffer);
      if (extracted.length > fileExtractedText.length) fileExtractedText = extracted;
    } catch {
      // Scanned PDFs or images will be read directly by Gemini vision.
    }
  }

  const combinedText = [textInput, fileExtractedText].filter(Boolean).join("\n\n");
  const decision = routePlanImport(combinedText);

  const apiKey = importApiKey();

  // If rate-limited or API key is not configured, fall back to offline parser
  if (retryAfter !== null || !apiKey) {
    const payload = buildImportPlanFallbackPayload(
      decision.fallbackResult,
      "fallback-text-parser",
      decision.deterministicPlan,
    );
    return NextResponse.json({
      ...payload,
      method: "fallback",
      message: retryAfter !== null ? "AI extraction is busy; showing figures from text parser." : undefined,
    });
  }

  try {
    const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [];
    if (cleanBase64) {
      contents.push({
        inlineData: {
          data: cleanBase64,
          mimeType: body.mimeType || body.file?.mimeType || "application/pdf",
        },
      });
      contents.push(
        combinedText
          ? `Extract the plan fields from the attached statement PDF document. Reference text extracted from document:\n\n${combinedText}`
          : "Extract the plan fields from the attached statement PDF document."
      );
    } else {
      contents.push(`Extract the plan fields from this statement text:\n\n${combinedText}`);
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await generateContentWithFallback(
      ai,
      {
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: PLAN_IMPORT_SCHEMA,
          temperature: 0,
        },
      },
      "gemini-2.5-flash",
    );
    const model = parseModelResponse(response.text);
    const payload = mergePlanImportResults({
      fallbackResult: decision.fallbackResult,
      deterministicPlan: decision.deterministicPlan,
      aiPlan: typeof model.plan === "object" && model.plan !== null ? (model.plan as Record<string, unknown>) : null,
      aiHoldings: model.holdings,
      source: "gemini-2.5-flash",
      route: "llm",
    });
    return NextResponse.json({ ...payload, method: "hybrid" });
  } catch (error) {
    console.warn("AI plan import failed across models; returning deterministic recovery result", error);
    const payload = buildImportPlanFallbackPayload(
      decision.fallbackResult,
      "fallback-text-parser",
      decision.deterministicPlan,
    );
    const quotaExhausted = isQuotaExhausted(error);
    return NextResponse.json({
      ...payload,
      method: "fallback",
      message: quotaExhausted
        ? "Gemini API key prepayment credits/quota are depleted. Showing figures read from text parser."
        : "AI extraction was busy; showing figures read from text parser.",
    });
  }
}
