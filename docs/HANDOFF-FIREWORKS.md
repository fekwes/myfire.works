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
  api/analyze/route.ts            AI tips (Gemini, rate-limited)
  api/estimate-portfolio/route.ts AI portfolio import — Gemini name→class only
  api/account/delete/route.ts     full account deletion (service-role)

components/
  FireDashboard.tsx     Dashboard: summary, tabs, charts
  FireForm.tsx          every input; Field/NumberInput live here
  FinancesPanel.tsx  FinancesNav.tsx      the Edit-plan screen + tab bar
  PortfolioEditor.tsx   per-wrapper "define portfolio" (search/weights/custom/copy)
  PortfolioImport.tsx   "Import with AI" (paste/CSV → /api/estimate-portfolio)
  QuizFlow.tsx  quiz/QuizPrimitives.tsx   onboarding
  SavedPlans.tsx        Profiles (save/load/rename/copy/delete)
  AssetTimelineChart · IncomeSafetyChart · ConfidencePanel   the three charts
  PlanProvider.tsx      the one active plan (localStorage-backed)
  ui/                   Button · Card · Menu · Collapsible

lib/
  fire-engine.ts        the engine. Read docs/ARCHITECTURE.md before touching.
  assets.ts             asset-class returns/fees + the Holding portfolio model
  vanguard-funds.ts     the ~40-fund catalogue + allocation / fee-drag helpers
  fire-number.ts  coast-fire.ts  monte-carlo.ts  what-if.ts
  quiz.ts               quiz state + assembleQuizInputs
  plan-storage.ts       localStorage + sanitisePlanInput (the validator)
  share.ts              ?p= encode/decode (uses the same validator)
  profiles.ts           profile naming/sorting/errors + PROFILES_TABLE
  checklist.ts  format.ts  export.ts  rate-limit.ts
```

**Portfolio model (the one thing to understand before touching funds):** a
wrapper is one balance + one net-of-fees **growth scalar** that the engine
consumes. When a wrapper has `*Holdings`, `resolveInputs` derives that scalar
from them (balance-weighted `holdingsNetGrowth`), and **expected returns come
from each holding's `assetClass`** (`ASSET_CLASS_RETURN` in `lib/assets.ts`) —
never from a per-fund number or an LLM. Keep it that way: the projection must
stay deterministic and reproducible from the URL.

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
| `GEMINI_API_KEY` | AI tips **and** the AI portfolio import (**not** an Anthropic key) |
| `NEXT_PUBLIC_SITE_URL` | OG cards, sitemap, share links (use the full `https://…` origin — a protocol-less value is now tolerated but set it properly) |

Set the Supabase vars for **preview** as well as production if you want to test
Profiles on a preview URL.

**Supabase setup:** run `supabase/migrations/20260101000000_portfolios.sql` in
the SQL editor (DDL can't run with the API keys). It creates the `portfolios`
table, enables RLS, **and grants the `authenticated` role table access** — the
grant matters: without it, logged-in saves hit "permission denied" even though
RLS is correct. Also add every deployed origin to **Auth → Redirect URLs**, or
sign-in breaks in production.

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

**Live:** production on Vercel at `https://onfire-nu.vercel.app` (custom domain
`myfire.works` still to be pointed). Auto-deploys from `main`.

**Merged history:**
- **PR #3** — Fireworks rebrand + UX/UI overhaul (identity, landing, quiz,
  planner, Finances, Profiles, Account, Methodology, one validated chart system).
- **PR #7** — production build fix (hardened `NEXT_PUBLIC_SITE_URL` so a
  protocol-less value can't crash `next build`), Vercel Speed Insights, SEO
  (self-canonical URLs + `WebSite`/`WebApplication` JSON-LD), the "Night &
  Ember" backdrop redesign, and the AI-provider correction to Gemini.
- **PR #9** — the second UX/product pass, below.

**PR #9 — onboarding, naming, mobile finances, portfolios, AI import:**
- **Onboarding:** removed the landing "skip to the planner" (it bypassed the
  quiz → checklist arc); lighter Profiles block before sign-in; clearer copy.
- **Naming:** header tabs are now **"Dashboard"** (was Planner) and **"Edit
  plan"** (was Your Finances). **Routes are unchanged** (`/planner`,
  `/finances`) so deep-links, share links and the checklist keep working — only
  the labels moved. Methodology left the header for the footer, which also
  carries a Contact `mailto:` and the "not financial advice" line.
- **Finances is tabbed**, not one long scroll: `FinancesNav` is a controlled
  tab bar and `FireForm` renders one section at a time; the `#hash` still
  selects the tab (the checklist deep-links rely on this). Inputs are
  single-column on mobile.
- **Per-wrapper portfolios (headline):** each ISA/GIA/SIPP wrapper has an
  "Optional: define portfolio" editor — a searchable ~40-fund catalogue,
  multiple holdings with weights, custom holdings, copy-across-wrappers, and a
  live net-of-fees growth. Model in **`lib/assets.ts`**: `FireInputs.*Holdings`
  are optional and `resolveInputs` derives each wrapper's growth scalar from
  them, so the engine / share links / Monte Carlo are untouched.
- **AI import (Phase 5):** "Import with AI" pastes a statement / uploads a CSV;
  `/api/estimate-portfolio` has **Gemini classify fund names → asset class + fee
  only** — expected returns still come from the asset class, so the projection
  stays deterministic and reproducible. Gated on `GEMINI_API_KEY`, consented,
  privacy page updated.
- **Sign-in fixes:** `getUser()` no longer bricks the auth UI on a flaky
  network; sign-up now saves the just-built plan as a first "My plan" profile
  and routes in; sign-out awaits + redirects home; added "Forgot password?";
  the sign-in popover closes on outside-click / Escape.
- **Legacy removed** (no old plans to protect): the `fundForGrowth`
  reverse-lookup and the `VANGUARD_FUNDS` / `VanguardFund` aliases are gone;
  allocation and fee-drag are holdings-only. `sanitisePlanInput` was kept — it
  hardens untrusted share-link input, which is timeless, not old-plan compat.

**Green:** 168 tests · `tsc` · `eslint` · production build.

**Branch `harden-profiles-and-import` — the two known gaps, then a review:**
Full findings in **`docs/REVIEW-2026-07.md`**. The headline: the
"sign-up saves your plan" feature was **unreachable on this project**. It read
`data.session` from `signUp()`, which is only populated when Supabase email
confirmation is off — and this project has it on (`/auth/v1/settings` reports
`mailer_autoconfirm: false`). So the account was created, the plan wasn't saved,
and nothing said so. The decision now keys off "a session exists" instead:
`lib/plan-sync.ts` holds the policy, `PlanProvider` owns the I/O, and it works
for confirmation-on, confirmation-off and plain sign-in alike.

Also fixed: silent PostgREST failures on every profile write (it *returns*
errors, it doesn't throw, so the `try/catch` caught nothing); saved `jsonb` rows
reaching the engine without `sanitisePlanInput`; a crafted `?p=` link building a
5-million-entry timeline and killing the tab (finite ≠ plausible — ranges now
live in the shared validator); Monte Carlo scoring the three strategies on
*different* market paths, which had it reporting ±10% guardrails as worse than
±5%; a blocked caller still draining the global AI budget; and upstream error
text reaching the browser. 226 tests.

### Known gaps
- 🔴 **The signed-in profile flows still need a human with an account.** Agents
  can't create accounts or enter passwords. **Do this:** sign up → follow the
  email link → confirm a "My plan" profile appeared → Save/Load/rename/copy/
  delete → sign out → sign in on a fresh browser and confirm the plan restores.
  Verified *without* an account: the `portfolios` table exists and `anon` is
  correctly denied (`42501`, not a missing-table error).
- 🟡 **AI import needs a real `GEMINI_API_KEY` to judge classification quality.**
  Everything else is covered by tests now — malformed replies, invented asset
  classes, absurd fees, weights that don't sum to 1, prompt injection in the
  pasted document. Run `npm run smoke:ai-import` against a dev server with a key.
- 🔴 **Rate limiting is per-instance, so the global cap isn't global.** On Vercel
  each instance has its own `Map`, making the "500/day" backstop *500 × instances*
  and resetting on cold start. This one has a bill attached — do it before any
  real traffic. See `docs/REVIEW-2026-07.md` R1.
- 🟡 Recharts is ~124 KB gz of /planner's 359 KB. Lazy-loading was tried,
  measured and reverted (it duplicates the library); replacing it with plain SVG
  is the real lever. R2.
- 🟡 No error reporting, and no end-to-end regression net. R3, R5.
- 🟡 `docs/ARCHITECTURE.md` still has pre-property/pre-2026 phrasings.
- 🟡 Single-person plans only; rest-of-UK tax only; property has no mortgage.

## 10. Backlog — candidate next moves

Roughly highest value first. Nothing here is started.

1. **Shared-store rate limiting** (Upstash/Vercel KV behind the existing
   `RateLimiter` interface). The only item with a real cost attached — see the
   gaps and `docs/REVIEW-2026-07.md` R1.
2. **Human verification of the signed-in flows** (see gaps), then decide whether
   plans should sync automatically vs. an explicit Save.
3. **Custom domain** `myfire.works` → Vercel domains + `NEXT_PUBLIC_SITE_URL` +
   Supabase redirect URLs; then Search Console + submit the sitemap.
4. **Multi-country groundwork** — the wrapper refactor in
   **`docs/MULTI-COUNTRY.md` §3**. Turns "add a country" from a rewrite into a
   data change, and is worth doing even if no second country ships. Note it
   changes the persisted plan shape, so it needs a `schemaVersion` + v1→v2
   migration (§3 of this handoff explains why that isn't optional). Recommended
   country order after it: **Canada → joint plans → US → Spain**.
5. **Partner / joint plans** — the most-requested UK FIRE gap, and a hard
   prerequisite for the US (filing status changes every bracket).
6. **Replace Recharts with plain SVG** — ~124 KB gz of /planner's 359 KB.
   `LandingHeroPreview` already shows it can be done well. R2.
7. **Automated regression:** Playwright a11y + visual snapshots in CI. Every bug
   in §8 was invisible until measured. R5.
8. **Error reporting** (cookieless, to keep `/privacy` honest). R3.
9. **Scottish tax bands** — rest-of-UK only today; verify every 2026/27 figure.
   Cheap once the country pack exists: Scotland is a `region`, not a pack.
10. **Mortgages** on the property model (value + growth only today).
11. **AI import extras** — Excel (.xlsx), a Google-Sheets link, and a review step
    before imported holdings are applied (the component's docstring currently
    overstates this: `onImport` applies immediately).

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
