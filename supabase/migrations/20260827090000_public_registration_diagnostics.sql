-- Distinguish an unknown public link from deliberately closed registrations.
-- Whitespace/case variants left by older clients are accepted as the canonical open status.
create or replace function public.get_public_competition(requested_slug text)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare competition_data jsonb;
begin
  select data into competition_data from competitions where slug = requested_slug limit 1;
  if competition_data is null then
    return jsonb_build_object('availability', 'missing');
  end if;
  if lower(regexp_replace(trim(coalesce(competition_data->>'statut', '')), '\s+', ' ', 'g')) <> 'inscriptions ouvertes' then
    return jsonb_build_object('availability', 'closed');
  end if;
  return jsonb_build_object(
    'availability', 'open',
    'competition', jsonb_build_object(
      'nom', competition_data->>'nom',
      'lieu', competition_data->>'lieu',
      'date', competition_data->>'date',
      'publicInfo', competition_data->>'publicInfo'
    )
  );
end;
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
    where slug = requested_slug
      and lower(regexp_replace(trim(coalesce(data->>'statut', '')), '\s+', ' ', 'g')) = 'inscriptions ouvertes'
    for update;
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
