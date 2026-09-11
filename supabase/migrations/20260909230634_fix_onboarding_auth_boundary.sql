create or replace function public.cp_onboard(
  p_role text,
  p_display_name text,
  p_specialty text default null,
  p_accept_terms boolean default false,
  p_accept_privacy boolean default false
)
returns public.cp_profiles
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  u uuid:=auth.uid();
  result public.cp_profiles;
  terms_version text;
  privacy_version text;
begin
  if u is null then
    raise exception 'Debes iniciar sesiÃ³n.' using errcode='42501';
  end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'Completa una cuenta verificada antes de crear el perfil.' using errcode='42501';
  end if;
  if exists(select 1 from public.cp_profiles where id=u) then
    raise exception 'El perfil ya existe.' using errcode='23505';
  end if;
  if p_accept_terms is not true or p_accept_privacy is not true then
    raise exception 'Debes aceptar los TÃ©rminos de uso y la PolÃ­tica de privacidad.' using errcode='23514';
  end if;
  if p_role not in ('worker','business') then
    raise exception 'Tipo de cuenta no vÃ¡lido.' using errcode='22023';
  end if;
  if char_length(trim(coalesce(p_display_name,''))) not between 2 and 100 then
    raise exception 'El nombre debe tener entre 2 y 100 caracteres.' using errcode='22023';
  end if;

  select version into terms_version
  from public.cp_policy_documents
  where policy_code='terms_of_use' and current_for_onboarding
  limit 1;
  select version into privacy_version
  from public.cp_policy_documents
  where policy_code='privacy_notice' and current_for_onboarding
  limit 1;
  if terms_version is null or privacy_version is null then
    raise exception 'No hay polÃ­ticas de onboarding configuradas.';
  end if;

  insert into public.cp_policy_acceptances(policy_code,version)
  values ('terms_of_use',terms_version),('privacy_notice',privacy_version)
  on conflict(user_id,policy_code,version) do nothing;

  insert into public.cp_profiles(id,role,display_name,specialty)
  values(
    u,
    p_role,
    trim(p_display_name),
    case when p_role='worker' then coalesce(p_specialty,'Camarero/a') else null end
  )
  returning * into result;

  return result;
end
$function$;

revoke execute on function public.cp_onboard(text,text,text,boolean,boolean) from public,anon,service_role;
grant execute on function public.cp_onboard(text,text,text,boolean,boolean) to authenticated;
