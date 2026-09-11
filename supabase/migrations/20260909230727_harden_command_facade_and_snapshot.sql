revoke execute on function cp_private.command(text,jsonb) from authenticated,anon,public,service_role;

grant usage on schema cp_private to postgres;

create or replace function public.cp_command(p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  base jsonb;
  onboarded public.cp_profiles;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesiÃ³n.' using errcode='42501';
  end if;

  if p_action='onboard' then
    select * into onboarded from public.cp_onboard(
      p_data->>'role',
      p_data->>'name',
      nullif(p_data->>'specialty',''),
      coalesce((p_data->>'accept_terms')::boolean,false),
      coalesce((p_data->>'accept_privacy')::boolean,false)
    );
    return to_jsonb(onboarded);
  end if;

  -- The private command is not directly executable by authenticated users.
  -- This invoker wrapper is the only application-facing entry point.
  base:=cp_private.command(p_action,p_data);

  if p_action='snapshot' then
    base:=base || jsonb_build_object(
      'notifications',coalesce((
        select jsonb_agg(to_jsonb(n) order by n.created_at desc)
        from public.cp_notifications n
        where n.user_id=auth.uid()
        limit 200
      ),'[]'::jsonb),
      'policy_documents',coalesce((
        select jsonb_agg(to_jsonb(d) order by d.policy_code,d.version)
        from public.cp_policy_documents d
        where d.current_for_onboarding or d.status='approved'
      ),'[]'::jsonb)
    );
  end if;

  return base;
end
$function$;

revoke execute on function public.cp_command(text,jsonb) from public,anon;
grant execute on function public.cp_command(text,jsonb) to authenticated,service_role;
