# Fireworks — project handoff

**Read this first.** It is the single source of truth for where the project
stands, how it's built, what's deployed, and what to do next.

`docs/HANDOFF.md` is the pre-rebrand OnFIRE archive — useful history, but this
file supersedes it wherever they disagree.

---

## 1. What it is

**Fireworks** — a UK FIRE (Financial Independence, Retire Early) planner, and a
recruiter-facing portfolio piece. It models drawdown across ISA, GIA, SIPP,
State Pension and property with correct 2026/27 UK tax, plus Coast FIRE and
Monte Carlo confidence.

- **Repo:** https://github.com/fekwes/onfire (private)
- **Domain:** `myfire.works`
- **Wordmark:** `Fire·works` · **Design system:** "Night & Ember"
- **Local dev:** `npm run dev` → http://localhost:3000

The name carries a double meaning — **FIRE** (financial independence) ×
**fireworks** (the celebratory moment) — and the domain reads as "it *works*".

## 2. Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Recharts · Vitest · `next-themes` · Supabase (`@supabase/ssr`).

**AI tips use Google Gemini** via `@google/genai`, reading `GEMINI_API_KEY`.
Older notes claimed the Anthropic SDK — they were wrong, and following them
sets the wrong secret.

## 3. ⚠️ Things that will break data if you "tidy" them

These names are keys into data that already exists. Renaming them does not
migrate anything — it orphans every saved plan and profile, and to the person
affected it looks like the app threw their data away.

| Identifier | Where |
|---|---|
| `onfire:plan` | localStorage key for the active plan |
| `onfire:flag:confidence-run`, `onfire:flag:withdrawals-viewed` | checklist flags |
| `onfire:flags` | the DOM event the checklist listens for |
| `portfolios` | the Supabase table (via `PROFILES_TABLE` in `lib/profiles.ts`) |
| `fekwes/onfire` | the GitHub repo name |

`lib/identifiers.test.ts` pins all of them, so an accidental rename fails in CI.
If a rename is ever genuinely wanted it needs a real migration: read the old
key, write the new one, keep the fallback for a release or two.

## 4. Repo map

```
app/
  page.tsx              landing            planner/page.tsx   the core screen
  start/page.tsx        onboarding quiz    finances/page.tsx  all inputs
  methodology/page.tsx  the docs page      account/page.tsx   sign-in + data
  privacy/  error.tsx  not-found.tsx  opengraph-image.tsx  icon.svg
  api/analyze/route.ts        AI tips (Gemini, rate-limited)
  api/account/delete/route.ts full account deletion (service-role)

components/
  FireDashboard.tsx     planner: summary, tabs, charts
  FireForm.tsx          every input; Field/NumberInput live here
  FinancesPanel.tsx  FinancesNav.tsx      the Finances screen + section rail
  QuizFlow.tsx  quiz/QuizPrimitives.tsx   onboarding
  SavedPlans.tsx        Profiles (save/load/rename/copy/delete)
  AssetTimelineChart · IncomeSafetyChart · ConfidencePanel   the three charts
  PlanProvider.tsx      the one active plan (localStorage-backed)
  ui/                   Button · Card · Menu · Collapsible

lib/
  fire-engine.ts        the engine. Read docs/ARCHITECTURE.md before touching.
  fire-number.ts  coast-fire.ts  monte-carlo.ts  what-if.ts
  quiz.ts               quiz state + assembleQuizInputs
  plan-storage.ts       localStorage + sanitisePlanInput (the validator)
  share.ts              ?p= encode/decode (uses the same validator)
  profiles.ts           profile naming/sorting/errors + PROFILES_TABLE
  checklist.ts  format.ts  export.ts  vanguard-funds.ts  rate-limit.ts
```

## 5. Design system — "Night & Ember"

Full detail in **`docs/DESIGN.md`**. The essentials:

- **Gesture:** a firework's launch trail is the shape of a compounding curve;
  the burst is the FI moment. Logo, hero and growth lines share that arc.
- **Colour:** deep-indigo night ground, incandescent ember signature,
  periwinkle-violet counter-spark. Dark is default; light is warm paper.
- **Restraint:** warmth is spent in one place — the moment a plan succeeds.
- **Chart ramp is validated, not eyeballed.** `--data-1/2/3` are mark colours,
  a step apart from the UI accents. Re-run the dataviz skill's
  `validate_palette.js` before changing them.
- **Hue is bound to the entity:** ISA ember, SIPP violet, GIA teal — so hiding
  an empty GIA never repaints the others. The dots in `FireForm` must match.

## 6. Deploy & environment

Vercel is connected to the repo; pushes get preview deployments, `main` goes to
production. The app builds and runs with none of these set — features degrade
gracefully — so a public launch without Supabase is safe.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | auth + saved profiles |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser-safe under RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only.** Full account deletion; without it, deletion degrades to data-only |
| `GEMINI_API_KEY` | AI tips (**not** an Anthropic key) |
| `NEXT_PUBLIC_SITE_URL` | OG cards, sitemap, share links |

Set the Supabase vars for **preview** as well as production if you want to test
Profiles on a preview URL.

**Supabase setup:** run `supabase/migrations/20260101000000_portfolios.sql` in
the SQL editor (DDL can't run with the API keys), and add every deployed origin
to **Auth → Redirect URLs**, or sign-in breaks in production.

## 7. Conventions

- **One logical change = one commit**, ending with the `Co-Authored-By:` line.
- **Quality gate on every commit:** `npm test`, `npx tsc --noEmit`,
  `npx eslint .`, `npm run build`. CI runs exactly these (note: CI uses
  `npm run lint`).
- **Verify in the browser, both themes**, before claiming something works.
  Several bugs in this project were invisible until measured — see §8.
- **Verify UK tax figures against real 2026/27 guidance.** Never invent
  numbers. Keep `/methodology` and `docs/ARCHITECTURE.md` in step with the
  engine.
- **Pension default is "gradual" (UFPLS)**; lump-sum cash goes to GIA, never
  ISA.

## 8. Lessons this codebase has already taught

Worth knowing, because each cost real debugging:

1. **Measure, don't eyeball.** The mobile header overflowed on *every page for
   every returning user* and survived several visual passes — because the nav
   only renders once a plan exists, so an empty first visit looks fine. Test
   with seeded state.
2. **Next changes fragments without firing events.** `hashchange`/`popstate`
   don't fire on same-page `<Link>` navigation. Anything that must react to a
   link needs a **search param** (`useSearchParams` is reactive) — that's why
   the Confidence tab uses `?tab=`.
3. **Status colour must follow meaning, not position.** "Already covered" was
   painted danger-red because it happened to sit in the left card.
4. **Never let a write fail silently.** Profiles used to flash a success tick
   regardless of the Supabase error, so saves looked saved and vanished.
5. **Untrusted input needs one shared validator.** `sanitisePlanInput` guards
   both localStorage and share links; `typeof x === "number"` alone lets
   `Infinity` through.

## 9. Current state

**Shipped (PR #3, merged):** the Fireworks rebrand and a full UX/UI overhaul —
identity, landing, quiz (the redundant Lean/Fat personas removed), planner,
Finances restructure, Profiles rebuild, Account, Methodology, one validated
chart system, and fixes for the bugs in §8.

**Green:** 160 tests · `tsc` · `eslint` · production build. Swept 5 widths × 2
themes × 7 routes with no overflow and no unnamed controls; reduced-motion,
keyboard, print and share/adopt all verified in-browser.

### Known gaps

- 🔴 **Profiles has never been exercised against a live Supabase.** It's
  covered by unit tests and the signed-out path only. **Do this first:** sign
  in, then Save → reload → Load → rename → Save a copy → delete.
- 🟡 `docs/ARCHITECTURE.md` still has pre-property/pre-2026 phrasings ("21
  tests", "two balances", "flat 5% applied identically to ISA and SIPP").
- 🟡 No automated a11y/visual regression in CI — the sweeps were ad-hoc
  Playwright scripts run by hand.
- 🟡 Rate limiting is in-memory per instance; multi-instance production needs
  Upstash/Vercel KV behind the `RateLimiter` interface.
- 🟡 Single-person plans only — no partner/joint modelling.

## 10. Backlog — candidate next moves

Roughly highest value first. Nothing here is started.

1. **Verify Profiles end-to-end**, then decide whether plans should sync
   automatically rather than via an explicit Save.
2. **Onboarding → activation.** The quiz seeds placeholder contributions; the
   checklist nudges people to real numbers. Measure where they drop off.
3. **Partner / joint plans** — the most-requested gap in UK FIRE tooling, and
   a real engine change (two allowances, two pensions).
4. **Scottish tax bands** — currently rest-of-UK only, and called out as a
   caveat on `/methodology`.
5. **Mortgages** on the property model (currently value + growth only).
6. **Automated regression:** Playwright a11y + visual snapshots in CI, so the
   §8-class bugs can't come back.
7. **Analytics** — cookieless and privacy-friendly only, to keep `/privacy`
   honest.

---

## 11. Prompt to start the next session

Paste this in:

> You're continuing **Fireworks** (repo `fekwes/onfire`), a UK FIRE planner.
>
> **First, read `docs/HANDOFF-FIREWORKS.md` end to end** — it has the full
> context, repo map, deploy/env notes, the identifiers that must never be
> renamed, and the backlog. Then skim `docs/DESIGN.md` (the "Night & Ember"
> system and the validated chart ramp) and `docs/ARCHITECTURE.md` (the engine).
>
> Work on a new branch off `main`; never push to `main` directly. Keep the
> quality gate green on **every** commit: `npm test`, `npx tsc --noEmit`,
> `npx eslint .`, `npm run build`. Verify in the browser in **both themes** and
> at mobile width before saying something works — this codebase has a history
> of bugs that are invisible until measured (see §8 of the handoff). Never
> commit secrets. Don't open a PR unless I ask.
>
> **Your task:** <describe it here>
>
> Before you start, tell me your plan and ask me anything that would change it.
> If you find a problem with what I've asked for, say so in a sentence or two
> and then get on with it under stated assumptions — don't stop and wait.

**Swap in whichever task you want.** Good first candidates, with the framing
that makes each go well:

- *"Verify saved Profiles end-to-end against the live Supabase, then fix
  whatever that turns up. I'll do the clicking — tell me exactly what to try
  and what you need from me."*
- *"Add partner/joint plans. Treat the engine as the hard part: two personal
  allowances, two pensions, two State Pensions. Propose the data model and the
  UI before you write anything."*
- *"Add Scottish income-tax bands. Verify every figure against real 2026/27
  guidance, keep the rest-of-UK path unchanged, and update `/methodology`."*
- *"Put Playwright a11y + visual regression in CI, covering the sweeps in §8 of
  the handoff so those bugs can't come back."*
