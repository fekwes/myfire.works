## 1. Import contracts and deterministic extraction

- [ ] 1.1 Define typed import routing, status, warning, wrapper balance, and per-wrapper contribution contracts with a 0.8 confidence threshold.
- [ ] 1.2 Extend deterministic free-text and PDF-text extraction for ISA, SIPP/Personal Pension, and GIA/bridge totals and individual monthly contributions.
- [ ] 1.3 Add parser and router tests for multi-wrapper Vanguard layouts, messy currency formats, confidence routing, and lossless result merging.

## 2. Structured LLM fallback

- [ ] 2.1 Replace the import route’s ad hoc branches with the shared confidence router and always return a recovery result for non-empty input.
- [ ] 2.2 Harden the LLM instruction and response schema for wrapper totals, account-specific contributions, ambiguous text, and nullable unknown values.
- [ ] 2.3 Add route-level coverage for high-confidence fast-path, low-confidence LLM eligibility, unavailable LLM, malformed LLM output, and partial output merge.

## 3. Recovery-first review experience

- [ ] 3.1 Retain pasted text and selected input after recoverable errors in the document import control.
- [ ] 3.2 Update onboarding and edit-plan imports to surface warnings and pre-populate all successful balance and contribution fields in editable review.
- [ ] 3.3 Replace terminal import errors for recoverable input with actionable verification copy and add focused component-level behavior coverage where practical.

## 4. Documentation and verification

- [ ] 4.1 Update docs/ARCHITECTURE.md and app/methodology/page.tsx to describe confidence-based routing and graceful import recovery.
- [ ] 4.2 Verify the import review in the browser at mobile width and in both themes.
- [ ] 4.3 Run npm test, npx tsc --noEmit, npx eslint ., npm run build, and openspec validate --change confidence-plan-import-recovery.
