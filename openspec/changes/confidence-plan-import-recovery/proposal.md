## Why

Plan imports can currently stop at a brittle parser result, lose context when an API request fails, and surface a dead-end error instead of a reviewable partial plan. Complex broker valuations (especially multi-wrapper Vanguard PDFs) and ordinary free-text descriptions therefore force users to re-enter figures that were present in their original input.

Without a consistent confidence threshold and recovery path, the app can present empty wrapper balances after an attempted import, undermining trust in the plan and the user’s ability to correct it.

## What Changes

- Add a confidence-based ingestion contract that keeps deterministic extraction as a fast path and sends low-confidence input (below 0.8) to structured LLM extraction when available.
- Define a single import result that preserves parsed values, raw input context, source, confidence, and a recoverable warning for partial or unsuccessful extraction.
- Expand extraction support for messy pasted text and multi-page, multi-wrapper UK investment statements, including ISA, SIPP/Personal Pension, and non-ISA bridge/GIA balances and their monthly contributions.
- Route every import outcome to an editable review experience; retain the pasted text after an error so users can retry or correct it without re-entering it.
- Replace terminal extraction failure copy with clear verification guidance when any figures or user input can be recovered.

## Capabilities

### New Capabilities

- `plan-import-recovery`: Confidence-aware financial-plan import, structured extraction, and resilient review behavior.

### Modified Capabilities

- None.

## Non-goals

- Replacing the portfolio projection engine or allowing an LLM to set investment-return assumptions.
- Adding support for broker authentication, account aggregation, or persistence of raw statements.
- Guaranteeing an extraction result from scanned or corrupted documents with no readable figures.

## Impact

- Affected code: the import route, deterministic import parser/router, onboarding and finances import components, and import tests.
- The API response gains explicit extraction status and raw-input recovery metadata while retaining existing plan and wrapper fields for current consumers.
- Documentation: architecture and methodology pages will describe the confidence threshold and graceful degradation behavior.
