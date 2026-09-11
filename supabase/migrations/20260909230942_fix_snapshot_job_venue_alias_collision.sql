do $migration$
declare
  def text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='cp_private' and p.proname='command'
    and pg_get_function_identity_arguments(p.oid)='p_action text, p_data jsonb';

  if def is null then raise exception 'cp_private.command no encontrada'; end if;

  def:=replace(def,
    'select jobs_row.*,bp.display_name business_name,v.name venue_name,',
    'select jobs_row.*,bp.display_name business_name,job_venue.name venue_name,');
  def:=replace(def,
    'join public.cp_venues v on v.id=jobs_row.venue_id',
    'join public.cp_venues job_venue on job_venue.id=jobs_row.venue_id');

  execute def;
end
$migration$;
