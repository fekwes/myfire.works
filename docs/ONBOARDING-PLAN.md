# Onboarding — evaluation and plan

Written after walking the live app cold, as someone who has never seen it and
doesn't know what a SIPP is. Every finding below is observed, not assumed;
the evidence is in §1.

---

## 1. What actually happens to a first-time user

The journey today is: **landing → 3-question quiz → planner**, then the user is
left to find everything else via a 6-step checklist.

### 🔴 F1 — The quiz answers were thrown away (fixed, but read this)

Answer three questions, click "Open my planner", and the planner showed
**someone else's defaults**: age 35, target £40,000, and a **£130,000 net worth
the user never entered**. Their real answers sat in `localStorage`, invisible,
until a hard reload.

Cause: `PlanProvider` lives in the root layout and reads storage in a
mount-only effect; the quiz wrote straight to `localStorage` and navigated
client-side, so the provider never re-read. Fixed by routing the quiz through
`setInputs()` — the provider owns the plan, so nothing else should write it.

**Why it matters beyond the fix:** the entire onboarding was decorative on the
happy path, and the app opened by showing a stranger's finances as if they were
yours. Any future "seed the plan from X" flow must go through the provider.

### 🔴 F2 — The first thing you ever see is failure

With the quiz working, a new user's first view is:

> **There's a shortfall** · ON COURSE FOR **£103,945** · **£1,019,800 short of it**
> · NET WORTH TODAY **£0** · PLAN LASTS TO **Age 55** (in red)

That verdict is *arithmetically correct and completely meaningless* — they have
entered no balances yet, so of course they're short. We compute a confident,
alarming judgement from data we know we don't have, and lead with it.

### 🟠 F3 — Jargon with no on-ramp

The landing page uses **ISA, SIPP, GIA, CGT, Monte Carlo, drawdown,
personal-allowance taper** — and never says what **FIRE** stands for. The
planner adds "tax-free pension" and "Coast FIRE".

There are 17 good tooltips in Your Finances, but they're *behind* the moment of
confusion: you meet the jargon on the landing page and the planner, and the
explanations live on a screen you haven't opened yet.

### 🟠 F4 — Nothing tells you where to find your numbers

The single hardest step is "Add your real balances", and the app never says
where to look (pension portal, ISA provider, last statement) or that a rough
figure is fine. A newbie who doesn't know their SIPP balance simply stops.

### 🟡 F5 — The checklist optimises the wrong order

Steps run: balances → **funds** → confidence → withdrawals → save. "Choose your
funds" sets a fee-aware growth rate — a refinement — and it sits ahead of
stress-testing and saving. It surfaced *before* balances in one run.

### 🟡 F6 — The Confidence tab is unexplained

"Equity allocation", "guardrails ±5%", "10th–90th percentile", "success rate",
"2,000 randomised market paths" — presented with no plain-English framing of
what a guardrail is or why 95% is good.

### 🟡 F7 — No sense of progress or payoff

The quiz has no reveal moment. You answer three questions and get dropped into
a dense dashboard. There's no "here's what we worked out for you" beat — which
is exactly what the brand's one celebratory moment exists for.

---

## 2. The onboarding we should build

**Principle: never show a verdict we haven't earned.** Until the user has given
us enough to judge, the app should be visibly *incomplete*, not *failing*.

**Principle: teach at the point of confusion**, not in a docs page.

**Principle: the fastest path to a believable number wins.** Every extra
question must buy more accuracy than it costs in drop-off.

### Stage A — Landing (30 seconds)

- One line saying what FIRE is, in plain words, above the fold.
- Keep the live preview card; label it clearly as **an example**, not theirs.
- Defer ISA/SIPP/GIA/CGT to lower down the page or a hover.

### Stage B — Quiz (2 minutes, 3–4 questions)

Keep the current three, and add **one optional question: "roughly what have you
saved already?"** — a single combined figure with a "not sure / skip" escape.
That one number is the difference between a meaningless verdict and a real one.

Give each question a "why we ask" affordance, and make the strategy step
explain Coast/Barista in one plain line each (it already does — keep it).

### Stage C — The reveal (the moment we currently don't have)

Before the dashboard, one screen: **"Here's your number."** The FIRE number,
the age, and one honest sentence about confidence. This is where the brand's
burst belongs — the one celebratory beat, earned.

If they skipped savings, this screen says so plainly: *"Based on starting from
zero. Add what you've saved to see the real picture."*

### Stage D — First planner view

- **Provisional state.** With no balances, replace "There's a shortfall" with
  something honest: *"Add what you've saved to see whether you're on track."*
  Keep the FIRE number (it's valid — it depends only on target and age); grey
  the verdict, the "short of it" figure and "Plan lasts to".
- **One clear next action**, not six. "Add your balances" with a hint about
  where to find them.
- Reorder the checklist: balances → save/sign-up → confidence → funds →
  withdrawals.

### Stage E — Progressive discovery

- Explain each tool the first time it's opened, in one sentence (Confidence
  especially).
- A glossary popover for ISA/SIPP/GIA/CGT/Coast, reachable from anywhere the
  terms appear.

---

## 3. Suggested build order

1. **Provisional/insufficient-data state** (F2) — biggest honesty win, and it
   changes what "no data" means across the planner.
2. **Optional savings question + the reveal screen** (F7, and makes F2's
   provisional state rarer).
3. **Checklist reorder + "where to find this"** (F4, F5).
4. **Plain-English on-ramp: landing line + glossary** (F3).
5. **First-open explainer for Confidence** (F6).
6. Measure drop-off per step before adding anything else.

Each is independently shippable. 1–3 are the ones that change behaviour.

## 4. Constraints

- **Engine untouched.** This is presentation and flow only.
- `onfire:*` keys and the `portfolios` table must not be renamed (see
  `HANDOFF-FIREWORKS.md` §3; `lib/identifiers.test.ts` pins them).
- Anything that seeds a plan goes through `PlanProvider.setInputs`, never
  `savePlanLocal` directly — that's what caused F1.
- Quality gate green per commit; verify in-browser in both themes and at 375px.
