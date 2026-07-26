/**
 * Whether a provider error is a rate/quota exhaustion (HTTP 429 /
 * RESOURCE_EXHAUSTED) rather than a transient failure. This matters because the
 * two want different messages: a genuine outage says "try again", but a hit
 * daily quota is a limit — telling someone to "try again" then just fails again.
 *
 * The `@google/genai` SDK's error shape isn't guaranteed, so this is
 * intentionally string-based over the message plus any `status` field.
 */
export function isQuotaExhausted(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 429) return true;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message);
}

/** The message shown to the browser when the daily AI quota is spent. */
export const AI_QUOTA_MESSAGE =
  "The AI features have hit today's limit — please try again tomorrow.";
