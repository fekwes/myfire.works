# Spec: 95% Confidence Target & GEO Auto-Detection Redesign

## Purpose

Redesign the Overview metrics on the planner dashboard to replace the legacy deterministic "WHAT IT TAKES" minimum card with a **95% Confidence Target Pot** backed by a **5% Guyton-Klinger Dynamic Guardrail**. Additionally, enforce multi-layer GEO auto-detection so visitors from the UK, Spain, and US automatically land on their native country defaults and currency formats.

---

## 1. 95% Confidence Target Overview Specification

### Requirement: 95% Monte Carlo Confidence Target
The system SHALL calculate the Target FIRE Pot required to achieve a **≥ 95.0% survival rate** under sequence-of-returns market risk using a **5% spending guardrail**.

#### Scenario: 95% Target Pot Calculation
- **GIVEN** a user's spending target, current age, and retirement age
- **WHEN** evaluating the Overview target metric
- **THEN** the engine executes a Monte Carlo simulation (`runMonteCarlo`) using the `guard5` strategy (±5% dynamic spending cuts)
- **AND** bisects to find the minimum starting pot at retirement that achieves `successRate >= 0.95`
- **AND** displays this value as the primary **95% Confidence Target Pot**

#### Scenario: Deterministic vs. 95% Confidence Comparison
- **GIVEN** a plan where the flat deterministic minimum pot is £600,000
- **WHEN** sequence-of-returns volatility (16% equity volatility) is applied
- **THEN** the system displays:
  - **95% Confidence Target** (e.g. £680,000 with ±5% guardrails)
  - **Confidence Badge**: "95% Success Rate across 1,000 market paths"
  - **Guardrail Note**: "Includes automatic 5% spending reductions during severe bear markets"

#### Scenario: Guaranteed Income Offset Integration
- **GIVEN** guaranteed future income streams (UK State Pension £12,547/yr, Spain Pensión Pública €14,000/yr, rental income, or part-time work)
- **WHEN** calculating the 95% confidence target pot
- **THEN** guaranteed income is subtracted from annual spending requirements before applying portfolio drawdown stress testing
- **AND** the required pot reflects only the net drawdown required from liquid wrappers

---

## 2. Multi-Layer GEO Auto-Detection Specification

### Requirement: Industrial-Grade Multi-Layer GEO Detection
The system SHALL determine the active user region (`uk`, `es`, or `us`) using a strict 6-layer priority cascade.

```
┌───────────────────────────────────────────────────────────┐
│ 1. Explicit User Preference (localStorage "onfire:region")│
└─────────────────────────────┬─────────────────────────────┘
                              │ null
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 2. Saved Plan Country Attribute (localStorage "onfire:plan")│
└─────────────────────────────┬─────────────────────────────┘
                              │ null
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 3. Server Edge IP Cookie ("x-detected-region" via proxy)  │
│    (x-vercel-ip-country / cf-ipcountry: ES, US, GB/UK)   │
└─────────────────────────────┬─────────────────────────────┘
                              │ null
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 4. Browser Language (navigator.language: es-ES, en-US)    │
└─────────────────────────────┬─────────────────────────────┘
                              │ null
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 5. Timezone Inference (Intl.DateTimeFormat: Europe/Madrid)│
└─────────────────────────────┬─────────────────────────────┘
                              │ null
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 6. Default Fallback ("uk" — £ GBP, Rest-of-UK Tax Bands)  │
└───────────────────────────────────────────────────────────┘
```

#### Scenario: Server Edge Geolocation (Vercel / Cloudflare)
- **GIVEN** a request originating from an IP address in Spain (`x-vercel-ip-country: ES`)
- **WHEN** `proxy.ts` executes on the edge
- **THEN** it sets `x-detected-region=es` cookie (maxAge: 30 days)
- **AND** client-side `getActiveRegionLocal()` reads `es` and activates `esPack` (Euro €, IRPF bands, Plan de Pensiones/PIAS)

#### Scenario: Explicit Override Retention
- **GIVEN** a user in Spain who manually switches the RegionToggle dropdown to `UK`
- **WHEN** `setActiveRegionLocal("uk")` is called
- **THEN** `onfire:region = "uk"` is saved to `localStorage`
- **AND** subsequent visits honor `uk` over edge IP headers or browser locale

---

## 3. UI/UX Component Changes

1. **`components/FireDashboard.tsx`**:
   - Replace legacy "WHAT IT TAKES" flat card title with **"95% Confidence Target"**.
   - Add a subtitle pill badge: `"Stress-tested across 1,000 market paths (5% guardrail)"`.
   - Include a tooltip explaining: *"This is the total capital needed at retirement to achieve a 95% probability that your portfolio never runs out of money before age 95, assuming a 5% spending reduction during deep bear markets."*

2. **`lib/plan-storage.ts` & `proxy.ts`**:
   - Verified implementation of the 6-layer GEO auto-detection cascade.
