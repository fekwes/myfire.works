## ADDED Requirements

### Requirement: Tips run once automatically for a personal plan

On a dashboard showing the user's own, non-provisional plan, the system SHALL request AI strategy tips once without requiring a click.

#### Scenario: First view of a complete plan

- **WHEN** a user with non-zero balances opens the dashboard and no tips are cached for the current plan
- **THEN** the tips request is issued automatically
- **AND** a loading state is shown in place of the tips

#### Scenario: Provisional plan does not auto-run

- **WHEN** the plan has zero balances
- **THEN** no automatic request is issued
- **AND** the manual "Get tips" control remains available

#### Scenario: Shared plan does not auto-run

- **WHEN** the dashboard is rendering a shared `?p=` plan
- **THEN** no automatic request is issued

### Requirement: Results are cached against the plan they describe

Tips SHALL be cached against a signature of the inputs they were generated from, so that revisiting an unchanged plan does not issue another request.

#### Scenario: Re-render and navigation

- **WHEN** the user switches chart tabs, toggles the money frame, or navigates away and back to the dashboard without changing any input
- **THEN** the cached tips are shown and no further request is issued

#### Scenario: Editing the plan

- **WHEN** the user changes an input the tips were derived from
- **THEN** the cached tips are marked stale and the user is offered a refresh
- **AND** no automatic request is issued for the edited plan — a refresh requires an explicit click

#### Scenario: Typing in Quick levers

- **WHEN** the user types into a Quick levers field, committing a value on each keystroke
- **THEN** at most one request is in flight at a time and no request is issued per keystroke

### Requirement: Auto-run stops after a refusal from the server

Once the tips endpoint reports that the feature is unconfigured or that a quota has been exhausted, the system SHALL stop issuing automatic requests for the remainder of the session and fall back to the manual control.

#### Scenario: Feature not enabled

- **WHEN** the endpoint responds that AI tips are not enabled on the server
- **THEN** the tips block is hidden or shows a single quiet unavailable note
- **AND** no further automatic request is issued in this session

#### Scenario: Quota exhausted

- **WHEN** the endpoint responds with a rate-limit or quota-exhausted status
- **THEN** the message reads as "off for now", not as an error in the plan
- **AND** no further automatic request is issued in this session

#### Scenario: Transient failure

- **WHEN** the request fails for a reason other than configuration or quota
- **THEN** the error is shown with a retry control
- **AND** the failure is not retried automatically

### Requirement: Auto-run can be disabled by configuration

The deployment SHALL be able to turn automatic running off, leaving the manual control in place, without a code change.

#### Scenario: Auto-run disabled

- **WHEN** the auto-run environment flag is set to off
- **THEN** the dashboard issues no automatic request
- **AND** the "Get tips" control still works
