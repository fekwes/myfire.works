import type { FireInputs } from "./fire-engine";
import { sanitisePlanInput } from "./plan-storage";

/**
 * Encode a plan into a URL-safe string for a read-only share link (`/planner?p=<encoded>`).
 * Uses UTF-8 safe encoding so currency symbols (€) and unicode fund names don't throw btoa errors.
 */
export function encodePlan(inputs: FireInputs): string {
  const json = JSON.stringify(inputs);
  const bytes = new TextEncoder().encode(json);
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode a shared-plan parameter back into `FireInputs`, or `null` if malformed.
 * Restores base64 padding to ensure valid decoding across all URL lengths.
 */
export function decodePlan(param: string | null | undefined): FireInputs | null {
  if (!param) return null;
  try {
    let b64 = param.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (b64.length % 4)) % 4;
    b64 += "=".repeat(pad);
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return sanitisePlanInput(JSON.parse(json));
  } catch {
    return null;
  }
}
