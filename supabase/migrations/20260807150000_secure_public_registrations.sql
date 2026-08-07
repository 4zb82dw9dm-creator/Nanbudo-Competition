create table if not exists public.competitions (
  id text primary key,
  slug text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.competitions enable row level security;
revoke all on public.competitions from anon;
grant select, insert, update, delete on public.competitions to authenticated;

create policy "commission members read competitions" on public.competitions for select to authenticated using (true);
create policy "commission members create competitions" on public.competitions for insert to authenticated with check (true);
create policy "commission members update competitions" on public.competitions for update to authenticated using (true) with check (true);
create policy "commission members delete competitions" on public.competitions for delete to authenticated using (true);

create or replace function public.get_public_competition(requested_slug text)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('nom', data->>'nom', 'lieu', data->>'lieu', 'date', data->>'date', 'publicInfo', data->>'publicInfo')
  from competitions where slug = requested_slug and data->>'statut' = 'Inscriptions ouvertes' limit 1;
$$;

create or replace function public.submit_public_registration(requested_slug text, submitted_competitors jsonb)
returns integer language plpgsql security definer set search_path = public
as $$
declare target_id text; existing_data jsonb; submitted_count integer;
begin
  if jsonb_typeof(submitted_competitors) <> 'array' then raise exception 'Inscription invalide'; end if;
  submitted_count := jsonb_array_length(submitted_competitors);
  if submitted_count < 1 or submitted_count > 100 then raise exception 'Nombre de participants invalide'; end if;
  if exists (select 1 from jsonb_array_elements(submitted_competitors) p where
    nullif(trim(p->>'nom'), '') is null or nullif(trim(p->>'prenom'), '') is null or
    nullif(trim(p->>'club'), '') is null or nullif(trim(p->>'email'), '') is null) then
    raise exception 'Données obligatoires manquantes';
  end if;
  select id, data into target_id, existing_data from competitions
    where slug = requested_slug and data->>'statut' = 'Inscriptions ouvertes' for update;
  if target_id is null then raise exception 'Compétition indisponible'; end if;
  update competitions set data = jsonb_set(existing_data, '{competitors}', coalesce(existing_data->'competitors', '[]'::jsonb) || submitted_competitors), updated_at = now()
    where id = target_id;
  return submitted_count;
end;
$$;

revoke all on function public.get_public_competition(text) from public;
revoke all on function public.submit_public_registration(text, jsonb) from public;
grant execute on function public.get_public_competition(text) to anon, authenticated;
grant execute on function public.submit_public_registration(text, jsonb) to anon, authenticated;
