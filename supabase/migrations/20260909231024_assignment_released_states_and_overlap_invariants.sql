alter table public.cp_assignments drop constraint cp_assignments_state_check;
alter table public.cp_assignments add constraint cp_assignments_state_check check (
  state = any(array[
    'selected'::text,'conditions_ready'::text,'confirmed'::text,'working'::text,
    'payment_pending'::text,'business_paid'::text,'closed'::text,
    'cancelled'::text,'no_show'::text,'replaced'::text
  ])
);

alter table public.cp_assignments add column released_at timestamptz null;
alter table public.cp_assignments add column release_reason text null check (release_reason is null or char_length(release_reason)<=1000);

alter table public.cp_assignments drop constraint cp_assignments_worker_id_tstzrange_excl;
drop index cp_active_slot;

create unique index cp_active_slot on public.cp_assignments(job_id,slot_no)
where state not in ('cancelled','no_show','replaced');

alter table public.cp_assignments add constraint cp_assignments_worker_id_tstzrange_excl
exclude using gist (
  worker_id with =,
  tstzrange(starts_at,ends_at,'[)') with &&
) where (state not in ('cancelled','no_show','replaced'));

do $migration$
declare def text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='cp_private' and p.proname='command'
    and pg_get_function_identity_arguments(p.oid)='p_action text, p_data jsonb';
  if def is null then raise exception 'cp_private.command no encontrada'; end if;
  def:=replace(def,'state<>''cancelled''','state not in (''cancelled'',''no_show'',''replaced'')');
  def:=replace(def,'state <> ''cancelled''','state not in (''cancelled'',''no_show'',''replaced'')');
  execute def;
end
$migration$;
