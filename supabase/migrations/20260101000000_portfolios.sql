-- OnFIRE: saved plans table + row-level security.
-- Apply this either by pasting it into the Supabase SQL editor, or by running
-- `supabase db push` if you've linked the project with the Supabase CLI.

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  inputs jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.portfolios enable row level security;

-- Table-level grants for the logged-in role. RLS (below) still restricts every
-- row to its owner; these grants just let the `authenticated` role reach the
-- table at all. `anon` is intentionally NOT granted — signed-out visitors have
-- no business touching saved plans.
grant select, insert, update, delete on public.portfolios to authenticated;

-- Two details in every policy below, both flagged by Supabase's database
-- linter (`auth_rls_initplan`) against the first version of this file:
--
-- 1. `(select auth.uid())`, not a bare `auth.uid()`. Postgres treats the bare
--    call as volatile-per-row and re-evaluates it for every row it examines;
--    wrapping it in a scalar subquery lets the planner hoist it into an
--    InitPlan and run it once per statement. Same result, and the difference
--    grows with the row count.
-- 2. `to authenticated`. Without it a policy targets `public`, so Postgres
--    evaluates it for `anon` too — which the grant above already excludes from
--    this table. Naming the role keeps the two consistent.

create policy "read own plans"
  on public.portfolios for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own plans"
  on public.portfolios for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "update own plans"
  on public.portfolios for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "delete own plans"
  on public.portfolios for delete
  to authenticated
  using ((select auth.uid()) = user_id);
