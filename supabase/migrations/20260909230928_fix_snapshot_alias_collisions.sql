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
    'select b.* ,m.member_role from public.cp_business_members m join public.cp_businesses b on b.id=m.business_id',
    'select biz_row.* ,m.member_role from public.cp_business_members m join public.cp_businesses biz_row on biz_row.id=m.business_id');
  def:=replace(def,
    'select jsonb_agg(v order by v.name) from public.cp_venues v where exists(',
    'select jsonb_agg(venue_row order by venue_row.name) from public.cp_venues venue_row where exists(');
  def:=replace(def,
    'where m.business_id=v.business_id and m.user_id=u and m.active',
    'where m.business_id=venue_row.business_id and m.user_id=u and m.active');

  execute def;
end
$migration$;
