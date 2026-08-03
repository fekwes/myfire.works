## Context

The import endpoint currently duplicates routing decisions across the deterministic parser, confidence scorer, route handler, and two client import flows. Its result combines a legacy single monthly contribution with a plan schema that already supports separate ISA, SIPP, and GIA contributions. A request failure can leave the UI with only an error state even when the original pasted text remains useful.

Gemini is optional and all imports must remain usable when no API key is configured or an LLM request fails. The app must retain deterministic results as an auditable fallback and must not use an LLM for return assumptions.

## Goals / Non-Goals

**Goals:**

- Create one typed routing decision based on deterministic confidence, using 0.8 as the threshold for the LLM path.
- Preserve every usable deterministic value, add only validated LLM values, and return a reviewable result for every non-empty input.
- Represent each target wrapper’s balance and monthly contribution explicitly.
- Preserve pasted input in the client and take users to editable review with an actionable warning when extraction is partial or unavailable.
- Keep the public route compatible with current `plan`, `wrappers`, and `holdings` consumers during migration.

**Non-Goals:**

- Replacing the existing PDF text decoder or adding OCR infrastructure.
- Persisting raw imported statements, their text, or LLM output.
- Extracting figures that are absent or uncertain enough to be invented.

## Decisions

### A pure deterministic router owns the confidence threshold

The route handler will use a pure router result built from the parser output. It classifies input as deterministic when confidence is at least 0.8 and otherwise as LLM-eligible. This keeps threshold policy testable and prevents API-key and rate-limit checks from changing the definition of confidence.

An alternative of branching only inside the API route is rejected because it makes client behavior and fallback tests depend on route implementation details.

### Wrapper contributions use per-wrapper fields, with legacy compatibility

The extraction contract will use `isaMonthlyContribution`, `sippMonthlyContribution`, and `giaMonthlyContribution` alongside their wrapper balances. The existing aggregate `monthlyContribution` remains as backward-compatible output when it is all that is known, but it is not used to overwrite a specific wrapper contribution.

An aggregate-only schema is rejected because it cannot faithfully map the user’s requested target state or distinguish an ISA payment from a pension payment.

### LLM output is additive and validation-first

The LLM receives a restrictive structured schema whose numeric fields are nullable. The router normalizes the output and overlays only non-negative, finite values over deterministic fields. It retains deterministic holdings when the LLM has no usable holdings. The final confidence is calculated from the merged plan, while the warning is required whenever any expected wrapper or contribution remains unknown, extraction is low-confidence, or the LLM fails.

Treating LLM output as authoritative is rejected because a noisy PDF can contain fund lines, account references, and totals that need the deterministic result as a safety net.

### The import UI is a recovery surface, not a terminal error state

`DropPasteInput` owns the pasted text until a successful user-directed completion. It receives an import result, reports warnings inline, and does not clear its text after a recoverable failure. Both onboarding and edit-plan flows consume the same result and present their plan review inputs even for partial extraction.

Closing the import panel automatically after fallback is rejected because it hides the surviving text and stops the user from correcting the parse in context.

## Risks / Trade-offs

- [An LLM response contains an incorrect plausible amount] → Preserve the deterministic value when present, validate all output, expose a verification warning, and route through editable review.
- [No Gemini key or quota is available] → Return deterministic partial fields with recovery status and do not treat it as a terminal HTTP error for non-empty input.
- [A scanned PDF has no readable text] → Keep its selected file and show editable zero-value fields with an instruction to paste or manually enter figures.
- [New response fields split client behavior] → Keep legacy response fields while adding explicit status fields and cover both clients with unit tests.

## Migration Plan

1. Introduce typed router and response helpers without removing current fields.
2. Extend deterministic extraction and LLM response schema to separate wrapper contributions.
3. Make both import surfaces consume recovery results and preserve input.
4. Add parser, router, and UI-adjacent behavior tests; document the completed contract.
5. Deploy with the feature on the existing import endpoint. Roll back by reverting the single change commit; legacy fields remain available throughout.

## Open Questions

- None. The target wrappers, threshold, warning copy, and review behavior are specified by this change.
