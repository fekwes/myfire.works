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

create policy "read own plans"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "insert own plans"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

create policy "update own plans"
  on public.portfolios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own plans"
  on public.portfolios for delete
  using (auth.uid() = user_id);
