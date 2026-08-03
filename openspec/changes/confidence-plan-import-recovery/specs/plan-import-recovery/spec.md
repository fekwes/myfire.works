## ADDED Requirements

### Requirement: Confidence-based import routing
The system SHALL perform deterministic extraction for every non-empty plan import and SHALL route the input to structured LLM extraction when deterministic confidence is below 0.8 and the optional LLM service is available.

#### Scenario: High-confidence deterministic import
- **WHEN** deterministic extraction reaches confidence 0.8 or higher
- **THEN** the system returns the deterministic values without invoking LLM extraction

#### Scenario: Low-confidence import with LLM available
- **WHEN** deterministic extraction is below confidence 0.8 and LLM extraction is configured
- **THEN** the system sends the same import payload to structured LLM extraction and merges validated results with deterministic values

#### Scenario: Low-confidence import without LLM availability
- **WHEN** deterministic extraction is below confidence 0.8 and the LLM service is unavailable, rate-limited, or fails
- **THEN** the system returns the deterministic partial result with an actionable verification warning

### Requirement: Wrapper and contribution extraction contract
The system SHALL map identifiable UK investment data into separate ISA, SIPP, and non-ISA/GIA balances and monthly contributions.

#### Scenario: Multi-wrapper statement
- **WHEN** a valuation contains Personal Pension or SIPP, Stocks & Shares ISA, and General Investment Account, Personal Portfolio, or Bridge Fund totals
- **THEN** the system maps each total to its corresponding wrapper balance without summing underlying fund lines

#### Scenario: Separate contribution amounts
- **WHEN** input identifies monthly, regular, or recurring savings for an ISA, SIPP, or non-ISA/GIA account
- **THEN** the system maps the amount to that wrapper’s monthly contribution field

#### Scenario: Messy currency text
- **WHEN** input contains supported amount representations such as pound-prefixed, GBP-suffixed, comma-separated, or plain decimal figures near a wrapper label
- **THEN** the system extracts the corresponding non-negative monetary amount

### Requirement: Recovery-first import review
The system SHALL make any usable import result editable and SHALL retain pasted input after an unsuccessful or partial extraction attempt.

#### Scenario: Partial extraction
- **WHEN** the system detects some but not all relevant figures
- **THEN** it pre-populates detected fields in the review experience and displays “We caught some figures, but please verify these fields.”

#### Scenario: Extraction yields no figures
- **WHEN** an import contains user input but no wrapper or contribution can be extracted
- **THEN** the system preserves the pasted input, presents editable review fields, and instructs the user to verify or enter figures rather than ending with a terminal extraction error

#### Scenario: Retry after recoverable error
- **WHEN** a client-side import request fails after the user pasted text
- **THEN** the text remains in the input control so the user can correct or retry it
