import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Paid, abusable endpoint — same limiter shape as the tips route: a short burst
// window + a daily per-IP cap + a global daily backstop.
const perMinute = createRateLimiter({ windowMs: 60_000, max: 5 });
const perDay = createRateLimiter({ windowMs: 86_400_000, max: 40 });
const globalPerDay = createRateLimiter({ windowMs: 86_400_000, max: 500 });

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function limited(request: Request): number | null {
  const ip = clientIp(request);
  const checks = [
    perMinute.check(ip),
    perDay.check(ip),
    globalPerDay.check("global"),
  ];
  const blocked = checks.find((c) => !c.allowed);
  return blocked ? Math.ceil(blocked.retryAfterMs / 1000) : null;
}

// The fixed asset classes Gemini may classify into. The *returns* come from
// these classes in the engine (lib/assets.ts) — Gemini only does the fuzzy
// name→class + fee mapping, so the projection stays deterministic.
const ASSET_CLASSES = [
  "global-equity",
  "us-equity",
  "multi-asset-100",
  "multi-asset-80",
  "multi-asset-60",
  "global-bonds",
  "cash",
] as const;

interface EstimatedHolding {
  label: string;
  assetClass: (typeof ASSET_CLASSES)[number];
  ocf: number;
  weight: number;
}

const HOLDINGS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
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
  required: ["holdings"],
};

const SYSTEM_INSTRUCTION = `You classify a UK investor's fund holdings pasted from a broker statement or spreadsheet. For each distinct holding in the input, output:
- label: the fund's name as given.
- assetClass, the best match from:
  - global-equity: worldwide shares tracker (e.g. FTSE Global All Cap, All-World, MSCI World, developed world).
  - us-equity: US market (e.g. S&P 500, US Equity Index).
  - multi-asset-100 / -80 / -60: an all-in-one fund that is ~100% / ~80% / ~60% equity with the rest in bonds (e.g. LifeStrategy 100/80/60, HSBC Global Strategy).
  - global-bonds: bond or gilt funds.
  - cash: money-market or cash funds.
- ocf: the ongoing charges figure as a decimal fraction (0.0022 = 0.22%). Use the known figure if you recognise the fund, otherwise a sensible estimate (~0.002 for index funds, ~0.001 for large ETFs).
- weight: the holding's share of THIS list as a fraction (all weights sum to ~1). If the input gives amounts or percentages, compute the weights from them; otherwise split equally.
Only include holdings actually present in the input. Do not invent funds. This is a classification task, not financial advice.`;

export async function POST(request: Request) {
  const retryAfter = limited(request);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "You've hit the import limit — please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const raw = await request.text();
  if (raw.length > 12_000) {
    return NextResponse.json({ error: "That's too long to import — paste up to a page or so." }, { status: 413 });
  }
  let text: string;
  try {
    const parsed = JSON.parse(raw) as { text?: unknown };
    if (typeof parsed.text !== "string" || parsed.text.trim() === "") {
      throw new Error("empty");
    }
    text = parsed.text.slice(0, 10_000);
  } catch {
    return NextResponse.json({ error: "Paste your holdings first." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Classify these holdings:\n\n${text}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: HOLDINGS_SCHEMA,
        temperature: 0.2,
      },
    });

    const out = response.text;
    if (!out) {
      return NextResponse.json({ error: "Couldn't read that — try cleaning it up." }, { status: 502 });
    }

    const parsed = JSON.parse(out) as { holdings?: unknown };
    const holdings = Array.isArray(parsed.holdings) ? parsed.holdings : [];

    // Trust nothing from the model: keep only valid classes, clamp numbers.
    const clean: EstimatedHolding[] = [];
    for (const h of holdings) {
      if (typeof h !== "object" || h === null) continue;
      const r = h as Record<string, unknown>;
      if (
        typeof r.assetClass !== "string" ||
        !ASSET_CLASSES.includes(r.assetClass as EstimatedHolding["assetClass"])
      ) {
        continue;
      }
      const ocf =
        typeof r.ocf === "number" && Number.isFinite(r.ocf)
          ? Math.min(0.03, Math.max(0, r.ocf))
          : 0.002;
      const weight =
        typeof r.weight === "number" && Number.isFinite(r.weight) && r.weight > 0
          ? r.weight
          : 0;
      clean.push({
        label: typeof r.label === "string" ? r.label.slice(0, 80) : "Holding",
        assetClass: r.assetClass as EstimatedHolding["assetClass"],
        ocf,
        weight,
      });
    }

    if (clean.length === 0) {
      return NextResponse.json(
        { error: "Couldn't find any funds in that — check the format and try again." },
        { status: 422 },
      );
    }

    return NextResponse.json({ holdings: clean });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed." },
      { status: 502 },
    );
  }
}
