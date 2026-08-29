create table if not exists public.match_results (
  competition_id text not null,
  pool_id text not null,
  match_id text not null,
  result jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (competition_id, pool_id, match_id)
);

create index if not exists match_results_competition_id_idx
  on public.match_results (competition_id);

alter table public.match_results enable row level security;

drop policy if exists "Public can read match results" on public.match_results;
create policy "Public can read match results"
  on public.match_results for select
  using (true);

drop policy if exists "Public can insert match results" on public.match_results;
create policy "Public can insert match results"
  on public.match_results for insert
  with check (true);

drop policy if exists "Public can update match results" on public.match_results;
create policy "Public can update match results"
  on public.match_results for update
  using (true)
  with check (true);

drop policy if exists "Public can delete match results" on public.match_results;
create policy "Public can delete match results"
  on public.match_results for delete
  using (true);

grant select, insert, update, delete on public.match_results to anon, authenticated;
