do $migration$
declare def text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='cp_private' and p.proname='command'
    and pg_get_function_identity_arguments(p.oid)='p_action text, p_data jsonb';
  if def is null then raise exception 'cp_private.command no encontrada'; end if;

  def:=replace(def,
    'insert into public.cp_reviews(assignment_id,author_id,target_id,stars,comment)',
    'insert into public.cp_reviews(assignment_id,author_id,subject_type,target_worker_id,target_business_id,venue_id,stars,comment)');
  def:=replace(def,
    'values(s.id,u,case when u=s.worker_id then (select created_by from public.cp_businesses where id=s.business_id) else s.worker_id end,(p_data->>''stars'')::smallint,coalesce(p_data->>''comment'',''''))',
    'values(s.id,u,case when u=s.worker_id then ''business'' else ''worker'' end,case when u=s.worker_id then null else s.worker_id end,case when u=s.worker_id then s.business_id else null end,j.venue_id,(p_data->>''stars'')::smallint,coalesce(p_data->>''comment'',''''))');

  execute def;
end
$migration$;
