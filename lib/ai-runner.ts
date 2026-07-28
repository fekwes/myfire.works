import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { isQuotaExhausted } from "./ai-errors";

const DEFAULT_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
];

/** Returns true for errors where we should try the next model (quota, not-found). */
function isRetryable(error: unknown): boolean {
  if (isQuotaExhausted(error)) return true;
  // Model removed / renamed → 404
  const status = (error as { status?: number } | null)?.status;
  if (status === 404) return true;
  return false;
}

/**
 * Generate content using the primary model, automatically falling back to alternative
 * Gemini models if the primary model hits a daily quota / rate limit (429) or is
 * no longer available (404).
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, "model">,
  primaryModel = "gemini-2.0-flash",
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
        console.warn(`Gemini model ${model} unavailable (${(error as { status?: number })?.status}), trying next…`);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
