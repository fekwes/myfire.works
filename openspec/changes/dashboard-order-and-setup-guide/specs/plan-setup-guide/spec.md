## ADDED Requirements

### Requirement: Every setup step is completable by following it

Each step in the setup guide SHALL be completable by performing the action its call-to-action describes. A step SHALL NOT depend on the user changing a value they do not want to change, and SHALL NOT depend on a feature that is unavailable in the current deployment.

#### Scenario: Reviewing withdrawals is not a step

- **WHEN** the setup guide is built for any plan
- **THEN** no step depends on the user toggling the pension strategy
- **AND** no step depends on the user having opened the Confidence tab

#### Scenario: Saving is hidden when auth is unavailable

- **WHEN** Supabase is not configured
- **THEN** the "Save your plan" step is absent from the guide entirely
- **AND** the progress count reflects only the steps that are present, so the guide can still reach completion

#### Scenario: Saving completes on sign-in

- **WHEN** Supabase is configured and the user is signed in
- **THEN** the "Save your plan" step is complete

### Requirement: Steps are derived from plan data

Every step's completion SHALL be derived from the plan inputs or the auth session. The guide SHALL NOT carry steps whose completion is recorded only as a browser-local engagement flag.

#### Scenario: Balances step

- **WHEN** the ISA, GIA or SIPP balance is above zero
- **THEN** the "Add your real balances" step is complete

#### Scenario: Funds step

- **WHEN** any wrapper has at least one holding
- **THEN** the "Choose your funds" step is complete

#### Scenario: Completion survives a cleared browser

- **WHEN** the user clears local storage and reloads with the same plan
- **THEN** every previously complete step is still complete

### Requirement: Progress counts only outstanding work

The guide SHALL NOT include a step that is complete by construction. Progress SHALL start at zero for a plan on which nothing has been done.

#### Scenario: Fresh quiz-seeded plan

- **WHEN** a plan has just been created from the quiz, with no balances and no holdings
- **THEN** the guide shows zero of its steps complete

### Requirement: The guide appears while work remains and disappears when done

The guide SHALL render whenever at least one of its steps is outstanding, including while the plan is provisional, and SHALL stop rendering once every step is complete.

#### Scenario: Provisional plan

- **WHEN** the plan has zero balances
- **THEN** the guide is rendered, with "Add your real balances" as the next step

#### Scenario: All steps done

- **WHEN** every step in the guide is complete
- **THEN** the guide is not rendered at all — no congratulatory card remains on the dashboard

#### Scenario: Shared plan

- **WHEN** the dashboard is rendering a shared `?p=` plan
- **THEN** the guide is not rendered

### Requirement: Dismissal is reversible

Dismissing the guide SHALL hide it for the current browser session only, and the dashboard SHALL offer a way to bring it back.

#### Scenario: Dismiss and reload

- **WHEN** the user dismisses the guide and later opens the dashboard in a new session
- **THEN** the guide is shown again if steps remain outstanding

#### Scenario: Restoring within a session

- **WHEN** the user has dismissed the guide in the current session
- **THEN** a compact "Show setup guide" affordance remains available on the dashboard

### Requirement: The guide writes no browser-local engagement state

The setup guide SHALL NOT record engagement in browser storage, and SHALL NOT dispatch an event to synchronise such state. No user action outside the plan itself writes a checklist key.

The flag storage keys, the read and write helpers, the event they dispatched, and every call site that set them are removed. Because those identifiers no longer exist in the codebase, the rename guards that pinned them are removed with them; the guards over identifiers that key real user data — the plan storage key and the Supabase table — remain.

#### Scenario: No residual writes

- **WHEN** the user runs the Monte Carlo simulation or changes the pension strategy
- **THEN** no checklist flag is written to local storage and no checklist event is dispatched

#### Scenario: Data-bearing identifiers stay pinned

- **WHEN** the identifier guards run
- **THEN** the plan's local storage key and the Supabase table name are still pinned against a rename
