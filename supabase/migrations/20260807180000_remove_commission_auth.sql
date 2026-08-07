grant select, insert, update, delete on public.competitions to anon, authenticated;

drop policy if exists "commission members read competitions" on public.competitions;
drop policy if exists "commission members create competitions" on public.competitions;
drop policy if exists "commission members update competitions" on public.competitions;
drop policy if exists "commission members delete competitions" on public.competitions;
drop policy if exists "commission reads competitions" on public.competitions;
drop policy if exists "commission creates competitions" on public.competitions;
drop policy if exists "commission updates competitions" on public.competitions;
drop policy if exists "commission deletes competitions" on public.competitions;

create policy "commission reads competitions" on public.competitions for select to anon, authenticated using (true);
create policy "commission creates competitions" on public.competitions for insert to anon, authenticated with check (true);
create policy "commission updates competitions" on public.competitions for update to anon, authenticated using (true) with check (true);
create policy "commission deletes competitions" on public.competitions for delete to anon, authenticated using (true);
