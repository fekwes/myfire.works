import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { isQuotaExhausted } from "./ai-errors";

const DEFAULT_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
];

/**
 * Generate content using the primary model, automatically falling back to alternative
 * Gemini models if the primary model hits a daily quota / rate limit (429).
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
      if (isQuotaExhausted(error)) {
        console.warn(`Gemini model ${model} quota exhausted, attempting fallback model...`);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
