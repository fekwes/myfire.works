import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { isQuotaExhausted } from "./ai-errors";

/** Current models in priority order — only active, non-deprecated models. */
const DEFAULT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

/** Returns true for errors where we should try the next model in the fallback chain. */
function isRetryable(error: unknown): boolean {
  if (!error) return true;
  if (isQuotaExhausted(error)) return true;

  const errObj = error as { status?: number; code?: number; error?: { code?: number } } | null;
  const status = errObj?.status ?? errObj?.code ?? errObj?.error?.code;
  if (status !== undefined && status >= 400) return true;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  return /\b(404|400|429|500|502|503|504)\b|NOT_FOUND|INVALID_ARGUMENT|UNSUPPORTED|RESOURCE_EXHAUSTED|quota|rate.?limit|overload|unavailable|busy|internal|high demand|deadline_exceeded/i.test(
    message,
  );
}

/**
 * Generate content using the primary model, automatically falling back to alternative
 * Gemini models if the primary model hits a daily quota / rate limit (429), is overloaded (503/500),
 * or is no longer available (404/400).
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, "model">,
  primaryModel = "gemini-2.5-flash",
) {
  const modelsToTry = [
    primaryModel,
    ...DEFAULT_MODELS.filter((m) => m !== primaryModel),
  ];

  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (error) {
      lastError = error;
      if (isRetryable(error)) {
        console.warn(`Gemini model ${model} failed/unavailable, attempting fallback to next model…`, error);
        continue;
      }
      // Even for non-standard error shapes, if we have remaining models, try them
      console.warn(`Gemini model ${model} threw error, trying next model in chain…`, error);
    }
  }

  throw lastError;
}
