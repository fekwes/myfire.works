-- Bring an already-provisioned project in line with the policy definitions in
-- `20260101000000_portfolios.sql`. A project created from the original file has
-- four policies that call `auth.uid()` per row and target `public`; this
-- rewrites them to evaluate once per statement and to name `authenticated`.
-- See the comment in that file for why both matter.
--
-- `alter policy` rather than `drop`/`create`: the predicate is replaced in
-- place, so there is no instant at which the table sits behind a missing
-- policy. Applying this to a project already carrying the new definitions is
-- a no-op in effect — the statements just rewrite them to the same thing.

alter policy "read own plans" on public.portfolios
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "insert own plans" on public.portfolios
  to authenticated
  with check ((select auth.uid()) = user_id);

alter policy "update own plans" on public.portfolios
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "delete own plans" on public.portfolios
  to authenticated
  using ((select auth.uid()) = user_id);
