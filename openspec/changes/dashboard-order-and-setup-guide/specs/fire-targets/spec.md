## ADDED Requirements

### Requirement: Bridge and pension are read from the plan's own ages

Every figure in this capability SHALL take its boundaries from the plan's resolved `sippAccessAge` and `statePensionAge`, never from a hardcoded age. The phase boundaries themselves belong to the `fire-engine` capability; this capability attributes pots to them:

- The **bridge** spans the engine's `bridge` phase — `retirementAge` up to (not including) `sippAccessAge` — funded by the ISA and GIA pots, because the engine locks the SIPP before its access age.
- The **pension** spans the engine's `sipp` and `state-pension` phases, funded primarily by the SIPP.

Where `retirementAge >= sippAccessAge` the bridge SHALL be treated as empty (zero years), not negative.

#### Scenario: A normal early-retirement plan

- **WHEN** `retirementAge` is 55 and `sippAccessAge` is 58
- **THEN** the bridge is 3 years long
- **AND** the pension phase runs from 58 to life expectancy

#### Scenario: A non-default access age

- **WHEN** a plan sets `sippAccessAge` to a value other than the current default
- **THEN** every bridge and pension figure moves with it
- **AND** no figure is computed against the default age

#### Scenario: Retiring at or after pension access

- **WHEN** `retirementAge` is 60 and `sippAccessAge` is 58
- **THEN** the bridge is zero years
- **AND** every bridge-split figure reports zero for the bridge, with the whole requirement attributed to the pension

### Requirement: FIRE number splits into bridge and pension

The system SHALL report, alongside the total FIRE number, how much of that pot must sit in the bridge pots (ISA + GIA) and how much in the pension (SIPP) at `retirementAge`.

The split SHALL be a decomposition, not a second independent estimate: the bridge figure plus the pension figure SHALL equal the reported total, so the three numbers on screen always add up.

#### Scenario: Split adds up

- **WHEN** the FIRE number is computed for any plan
- **THEN** `bridgeRequired + pensionRequired` equals `fireNumber` to within rounding
- **AND** neither component is negative

#### Scenario: Bridge funds the gap years

- **WHEN** the bridge requirement is placed in the ISA/GIA pots and the plan is run from `retirementAge` with no further contributions
- **THEN** the ISA and GIA pots are not depleted before `sippAccessAge`

#### Scenario: Zero-length bridge

- **WHEN** the bridge is zero years
- **THEN** `bridgeRequired` is zero and `pensionRequired` equals the total

### Requirement: Required monthly contribution splits by wrapper

The system SHALL report the total monthly contribution that makes the plan sustainable to life expectancy at the current `retirementAge`, the extra above what the user contributes today, and how that extra divides between the bridge pots (ISA/GIA) and the pension (SIPP).

Where the user already contributes enough, the extra SHALL be reported as zero rather than a negative number. Where no level of contribution makes the plan work, the system SHALL report that explicitly rather than an arbitrarily large figure.

#### Scenario: Shortfall needing extra saving

- **WHEN** the plan is not sustainable at the current retirement age but some contribution level makes it so
- **THEN** the Overview states the extra monthly amount needed
- **AND** states how much of it goes to ISA/GIA and how much to the SIPP

#### Scenario: Already on track

- **WHEN** the plan is already sustainable with current contributions
- **THEN** the extra required is reported as zero and the Overview says no extra saving is needed

#### Scenario: Unreachable by saving alone

- **WHEN** no monthly contribution makes the plan sustainable at the current retirement age
- **THEN** the Overview says the goal cannot be reached by saving alone and points at the other levers (later retirement, lower target)
- **AND** does not display a numeric monthly figure

### Requirement: Sustainable income from today's pots

The system SHALL report the net annual income that the user's **current** balances could sustain to life expectancy with no further contributions, and SHALL split that income into the amount the bridge pots fund and the amount the pension funds.

This figure answers "what would today's pots actually buy me" and is therefore computed from present balances, independent of the target income and of future contributions.

#### Scenario: Reporting today's drawdown

- **WHEN** the user has non-zero balances
- **THEN** the Overview shows a single net annual income figure sustainable from those balances alone
- **AND** shows the bridge-funded and pension-funded portions of it

#### Scenario: No balances yet

- **WHEN** every balance is zero
- **THEN** the figure is suppressed rather than shown as £0

#### Scenario: Consistency with the verdict

- **WHEN** the sustainable income from today's pots is at or above the target annual income
- **THEN** the plan is also reported as on track by the Overview verdict

### Requirement: Figures follow the money-frame toggle

Every currency figure in the Overview that refers to a future point in time SHALL respect the money-frame toggle, using the plan's inflation rate, and SHALL state which frame it is in. This capability consumes the toggle's state; it does not define the toggle's wording.

#### Scenario: Switching the frame

- **WHEN** the user switches the money frame away from today's money
- **THEN** the FIRE number, its bridge and pension components, and the sustainable-income figures all restate in the other frame
- **AND** the bridge and pension components still sum to the displayed total
