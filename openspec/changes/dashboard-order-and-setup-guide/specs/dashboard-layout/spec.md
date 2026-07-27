## ADDED Requirements

### Requirement: Dashboard module order

The `/planner` dashboard SHALL render its modules in this order, top to bottom: status ribbon, setup guide, Quick levers, Projection, Overview, disclaimer.

The order puts the controls that change the answer above the answer itself: someone who disagrees with the verdict reaches a lever without scrolling.

#### Scenario: Default order on a complete plan

- **WHEN** a signed-out user with non-zero balances opens `/planner`
- **THEN** Quick levers appears above the Projection card
- **AND** the Projection card appears above the Overview card
- **AND** the Overview card appears above the "not financial advice" disclaimer

#### Scenario: Verdict stays visible above the fold

- **WHEN** the dashboard renders with the Overview pushed below the fold
- **THEN** a single-line status ribbon at the top of the page states the verdict ("On track", "There's a shortfall", or "Provisional")
- **AND** the ribbon links to the Overview card so the detail is one click away

### Requirement: Provisional plans withhold judgements

While the plan's total net worth is zero, the dashboard SHALL present the plan as incomplete rather than failing: it SHALL NOT show an on-track or shortfall verdict, a surplus or shortfall figure, a "plan lasts to" age, or a Coast FIRE note.

#### Scenario: Zero balances

- **WHEN** every balance (ISA, GIA, SIPP, rental, home) is zero
- **THEN** the status ribbon reads "Provisional" in a neutral tone
- **AND** the Overview shows the FIRE number (which depends only on target and age) but replaces the on-track verdict with a prompt to add balances
- **AND** the "what today's pots buy" figures show an em dash rather than zero

#### Scenario: Balances present

- **WHEN** at least one balance is above zero
- **THEN** the full verdict, surplus/shortfall figure and "plan lasts to" age are shown

### Requirement: Shared read-only plans omit interactive modules

When the dashboard renders a plan decoded from a `?p=` share parameter, it SHALL omit every module that would edit or personalise the viewer's own plan.

#### Scenario: Viewing a shared plan

- **WHEN** the dashboard renders with a valid `?p=` parameter
- **THEN** Quick levers, the setup guide and the plan actions are not rendered
- **AND** the AI strategy tips do not fetch automatically
- **AND** a "Make it mine" banner is shown
- **AND** the Projection and Overview cards render normally

### Requirement: Print output excludes screen-only chrome

Modules that exist to prompt or navigate SHALL carry `no-print` so a printed plan contains only the plan.

#### Scenario: Printing the dashboard

- **WHEN** the user prints `/planner`
- **THEN** the status ribbon, the setup guide, the chart tab switcher, the money-frame toggle and the "Regenerate" control are absent from the printed output
- **AND** generated AI tips, the Overview figures and the currently selected chart are present
