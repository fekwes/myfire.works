import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { formatCurrency } from "@/lib/format";

export const runtime = "nodejs";

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

const TIPS_SCHEMA = {
  type: "object",
  properties: {
    tips: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
        additionalProperties: false,
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["tips"],
  additionalProperties: false,
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as AnalyzeRequest;

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

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: TIPS_SCHEMA },
      },
      system:
        "You are a UK financial planning assistant specializing in FIRE (Financial Independence, Retire Early) strategy. Give tailored, concrete tips referencing current UK tax rules (ISA/GIA, SIPP 25% tax-free lump sum, income tax bands, State Pension). Keep tips educational, not regulated financial advice.",
      messages: [
        {
          role: "user",
          content: `Based on this simulation, give exactly 3 tailored UK strategy tips — covering the SIPP tax-relief vs ISA-bridge balance, using the GIA and its CGT allowance efficiently, and closing (or banking) the gap to the FIRE number — given current UK income tax bands:\n\n${summary}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No response generated." },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(textBlock.text) as AnalyzeResponse;
    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status ?? 502 },
      );
    }
    throw error;
  }
}
