-- Profile trust foundation. No remote application is performed by this change.
create table public.cp_worker_specialties (
 worker_id uuid not null references public.cp_profiles(id) on delete cascade,
 specialty text not null check(specialty in ('Camarero/a','Bartender','Cocinero/a','Ayudante de cocina')),
 is_primary boolean not null default false,
 primary key(worker_id,specialty)
);
create unique index cp_worker_one_primary on public.cp_worker_specialties(worker_id) where is_primary;
create table public.cp_worker_skills (
 worker_id uuid not null references public.cp_profiles(id) on delete cascade,
 skill text not null check(skill in ('Sala','Barra','Bandeja','TPV','Terraza','Eventos','Barista','Coctelería')),
 primary key(worker_id,skill)
);
create table public.cp_worker_experience (
 id uuid primary key default gen_random_uuid(),
 worker_id uuid not null references public.cp_profiles(id) on delete cascade,
 employer_name text not null check(char_length(trim(employer_name)) between 2 and 100),
 role_label text not null check(char_length(trim(role_label)) between 2 and 100),
 start_date date not null,
 end_date date,
 description text not null default '' check(char_length(description)<=600),
 verification_status text not null default 'declared' check(verification_status in ('declared','verified')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(end_date is null or end_date>=start_date)
);
create index cp_worker_experience_owner on public.cp_worker_experience(worker_id,start_date desc);
alter table public.cp_worker_specialties enable row level security;
alter table public.cp_worker_skills enable row level security;
alter table public.cp_worker_experience enable row level security;
-- Intentionally no Data API access, including SELECT: commands are the privacy boundary.
revoke all on public.cp_worker_specialties,public.cp_worker_skills,public.cp_worker_experience from public,anon,authenticated,service_role;

-- Deferred validation permits atomic replacement of the list but never zero primaries in a nonempty list.
create function cp_private.check_worker_primary() returns trigger
language plpgsql security invoker set search_path='' as $f$
declare target uuid:=coalesce(new.worker_id,old.worker_id);
begin
 if exists(select 1 from public.cp_worker_specialties where worker_id=target)
 and (select count(*) from public.cp_worker_specialties where worker_id=target and is_primary)<>1 then
  raise exception 'Selecciona una especialidad principal.' using errcode='23514';
 end if;
 return null;
end $f$;
revoke all on function cp_private.check_worker_primary() from public,anon,authenticated,service_role;
create constraint trigger cp_worker_primary_required after insert or update or delete on public.cp_worker_specialties
deferrable initially immediate for each row execute function cp_private.check_worker_primary();
insert into public.cp_worker_specialties(worker_id,specialty,is_primary)
select id,specialty,true from public.cp_profiles where role='worker';

create function cp_private.initialize_worker_specialty() returns trigger
language plpgsql security definer set search_path='' as $f$
begin
 if auth.uid() is null or auth.uid()<>new.id then raise exception 'Acceso denegado.' using errcode='42501'; end if;
 if new.role='worker' then
  insert into public.cp_worker_specialties(worker_id,specialty,is_primary) values(new.id,new.specialty,true);
 end if;
 return new;
end $f$;
revoke all on function cp_private.initialize_worker_specialty() from public,anon,authenticated,service_role;
create trigger cp_profile_specialty_initial after insert on public.cp_profiles for each row execute function cp_private.initialize_worker_specialty();

create function cp_private.profile_trust_command(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $f$
declare
 u uuid:=auth.uid(); me public.cp_profiles; target uuid; app public.cp_applications;
 item jsonb; entry_id uuid; primary_name text;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then
  raise exception 'Acceso denegado.' using errcode='42501';
 end if;
 select * into me from public.cp_profiles where id=u;
 if me.id is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Acceso denegado.' using errcode='42501'; end if;
 if p_action='worker_profile' then
  if me.role='worker' then
   if p_data<>'{}'::jsonb then raise exception 'Acceso denegado.' using errcode='42501'; end if;
   target:=u;
  elsif me.role='business' then
   if (p_data - 'application_id')<>'{}'::jsonb then raise exception 'Acceso denegado.' using errcode='42501'; end if;
   select * into app from public.cp_applications where id=(p_data->>'application_id')::uuid;
   if app.id is null or not exists(select 1 from public.cp_business_members m where m.business_id=app.business_id and m.user_id=u and m.active)
     or not exists(select 1 from public.cp_jobs j where j.id=app.job_id and j.business_id=app.business_id)
     or not exists(select 1 from cp_private.events e where e.actor_id=app.worker_id and e.action='apply' and e.entity_id=app.id)
   then raise exception 'Acceso denegado.' using errcode='42501'; end if;
   target:=app.worker_id;
  else raise exception 'Acceso denegado.' using errcode='42501'; end if;
  return jsonb_build_object(
   'display_name',(select display_name from public.cp_profiles where id=target and role='worker'),
   'legacy_specialty',(select specialty from public.cp_profiles where id=target),
   'specialties',coalesce((select jsonb_agg(jsonb_build_object('specialty',s.specialty,'is_primary',s.is_primary) order by s.is_primary desc,s.specialty) from public.cp_worker_specialties s where s.worker_id=target),'[]'::jsonb),
   'skills',coalesce((select jsonb_agg(s.skill order by s.skill) from public.cp_worker_skills s where s.worker_id=target),'[]'::jsonb),
   'experience',coalesce((select jsonb_agg(jsonb_build_object('id',case when target=u then e.id else null end,'employer_name',e.employer_name,'role_label',e.role_label,'start_date',e.start_date,'end_date',e.end_date,'description',e.description,'verification_status',e.verification_status) order by e.start_date desc,e.id) from public.cp_worker_experience e where e.worker_id=target),'[]'::jsonb),
   'is_new',not exists(select 1 from public.cp_assignments a where a.worker_id=target and a.state='closed')
  );
 end if;
 if me.role<>'worker' then raise exception 'Solo profesionales.' using errcode='42501'; end if;
 -- Serialize profile list replacements and enforce count limits against concurrent edits.
 perform 1 from public.cp_profiles where id=u for update;
 if p_action='worker_profile_save' then
  if (p_data - array['specialties','primary_specialty','skills'])<>'{}'::jsonb
   or jsonb_typeof(p_data->'specialties') is distinct from 'array'
   or jsonb_typeof(p_data->'skills') is distinct from 'array' then raise exception 'Datos de perfil no válidos.' using errcode='23514'; end if;
  if jsonb_array_length(p_data->'specialties') not between 1 and 4 or jsonb_array_length(p_data->'skills')>8 then raise exception 'Datos de perfil no válidos.' using errcode='23514'; end if;
  primary_name:=p_data->>'primary_specialty';
  if primary_name is null or not (p_data->'specialties' ? primary_name) then raise exception 'Selecciona una especialidad principal.' using errcode='23514'; end if;
  set constraints public.cp_worker_primary_required deferred;
  delete from public.cp_worker_specialties where worker_id=u;
  for item in select value from jsonb_array_elements(p_data->'specialties') loop
   if jsonb_typeof(item)<>'string' then raise exception 'Especialidad no válida.' using errcode='23514'; end if;
   insert into public.cp_worker_specialties(worker_id,specialty,is_primary) values(u,item#>>'{}',item#>>'{}'=primary_name);
  end loop;
  set constraints public.cp_worker_primary_required immediate;
  delete from public.cp_worker_skills where worker_id=u;
  for item in select value from jsonb_array_elements(p_data->'skills') loop
   if jsonb_typeof(item)<>'string' then raise exception 'Habilidad no válida.' using errcode='23514'; end if;
   insert into public.cp_worker_skills(worker_id,skill) values(u,item#>>'{}');
  end loop;
 elsif p_action='worker_experience_save' then
  if (p_data - array['id','employer_name','role_label','start_date','end_date','description'])<>'{}'::jsonb
    or jsonb_typeof(p_data->'employer_name') is distinct from 'string'
    or jsonb_typeof(p_data->'role_label') is distinct from 'string'
    or (p_data ? 'description' and jsonb_typeof(p_data->'description') is distinct from 'string')
    or coalesce(p_data->>'start_date','')!~'^\d{4}-\d{2}-\d{2}$'
    or (p_data->>'end_date' is not null and p_data->>'end_date'!~'^\d{4}-\d{2}-\d{2}$')
    or (p_data->>'start_date')::date>current_date or (p_data->>'end_date')::date>current_date
  then raise exception 'Datos de experiencia no válidos.' using errcode='23514'; end if;
  if p_data->>'id' is null then
   if (select count(*) from public.cp_worker_experience where worker_id=u)>=30 then raise exception 'Máximo 30 experiencias.' using errcode='23514'; end if;
   insert into public.cp_worker_experience(worker_id,employer_name,role_label,start_date,end_date,description)
   values(u,trim(p_data->>'employer_name'),trim(p_data->>'role_label'),(p_data->>'start_date')::date,(p_data->>'end_date')::date,coalesce(p_data->>'description','')) returning id into entry_id;
  else
   update public.cp_worker_experience set employer_name=trim(p_data->>'employer_name'),role_label=trim(p_data->>'role_label'),start_date=(p_data->>'start_date')::date,end_date=(p_data->>'end_date')::date,description=coalesce(p_data->>'description',''),updated_at=now()
   where id=(p_data->>'id')::uuid and worker_id=u and verification_status='declared' returning id into entry_id;
   if entry_id is null then raise exception 'Acceso denegado.' using errcode='42501'; end if;
  end if;
 elsif p_action='worker_experience_delete' then
  if (p_data - 'id')<>'{}'::jsonb then raise exception 'Acceso denegado.' using errcode='42501'; end if;
  delete from public.cp_worker_experience where id=(p_data->>'id')::uuid and worker_id=u and verification_status='declared' returning id into entry_id;
  if entry_id is null then raise exception 'Acceso denegado.' using errcode='42501'; end if;
 else raise exception 'Acción no válida.' using errcode='22023'; end if;
 insert into cp_private.events(actor_id,action,entity_id) values(u,p_action,coalesce(entry_id,u));
 return jsonb_build_object('ok',true);
end $f$;
revoke all on function cp_private.profile_trust_command(text,jsonb) from public,anon,authenticated,service_role;

do $migration$
declare
 def text:=pg_get_functiondef('cp_private.command(text,jsonb)'::regprocedure);
 marker text:=' if p_action=''snapshot'' then';
begin
 if (length(def)-length(replace(def,marker,'')))<>length(marker) then raise exception 'Unexpected command definition'; end if;
 execute replace(def,marker,$sql$ if p_action in ('worker_profile','worker_profile_save','worker_experience_save','worker_experience_delete') then
  return cp_private.profile_trust_command(p_action,p_data);
 end if;
$sql$||marker);
end $migration$;
