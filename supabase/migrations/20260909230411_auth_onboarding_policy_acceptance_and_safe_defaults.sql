alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter table public.cp_profiles alter column specialty drop default;
alter table public.cp_profiles alter column specialty drop not null;
alter table public.cp_profiles drop constraint cp_profiles_specialty_check;
alter table public.cp_profiles add constraint cp_profiles_specialty_check check (
  (role='worker' and specialty = any(array['Camarero/a'::text,'Bartender'::text,'Cocinero/a'::text,'Ayudante de cocina'::text]))
  or (role='business' and specialty is null)
);
alter table public.cp_profiles add constraint cp_profiles_business_not_available_check check (
  role <> 'business' or available=false
);

create or replace function public.cp_normalize_profile_role()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.role='business' then
    new.specialty:=null;
    new.available:=false;
  elsif new.role='worker' and new.specialty is null then
    new.specialty:='Camarero/a';
  end if;
  return new;
end
$function$;
revoke execute on function public.cp_normalize_profile_role() from public,anon,authenticated,service_role;

drop trigger if exists cp_profiles_normalize_role on public.cp_profiles;
create trigger cp_profiles_normalize_role
before insert or update of role,specialty,available on public.cp_profiles
for each row execute function public.cp_normalize_profile_role();

create table public.cp_policy_documents (
  policy_code text not null check (policy_code in ('terms_of_use','privacy_notice')),
  version text not null check (char_length(trim(version)) between 1 and 40),
  title text not null check (char_length(trim(title)) between 3 and 120),
  status text not null default 'draft' check (status in ('draft','approved','retired')),
  production_ready boolean not null default false,
  current_for_onboarding boolean not null default false,
  content_sha256 text null check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  effective_at timestamptz null,
  created_at timestamptz not null default now(),
  primary key(policy_code,version),
  check (production_ready=false or status='approved')
);
create unique index cp_policy_documents_current_one_per_code
  on public.cp_policy_documents(policy_code) where current_for_onboarding;

create table public.cp_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  policy_code text not null,
  version text not null,
  source text not null default 'app' check (source in ('app','web')),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint cp_policy_acceptances_document_fkey foreign key(policy_code,version)
    references public.cp_policy_documents(policy_code,version),
  constraint cp_policy_acceptances_unique unique(user_id,policy_code,version)
);
create index cp_policy_acceptances_user on public.cp_policy_acceptances(user_id,accepted_at desc);

alter table public.cp_policy_documents enable row level security;
alter table public.cp_policy_acceptances enable row level security;

revoke all on public.cp_policy_documents from anon,authenticated;
revoke all on public.cp_policy_acceptances from anon,authenticated;
grant select on public.cp_policy_documents to authenticated;
grant select on public.cp_policy_acceptances to authenticated;
grant insert(policy_code,version) on public.cp_policy_acceptances to authenticated;
grant select,insert,update,delete on public.cp_policy_documents to service_role;
grant select,insert,update,delete on public.cp_policy_acceptances to service_role;

create policy cp_policy_documents_authenticated_read
on public.cp_policy_documents for select to authenticated
using (current_for_onboarding or status='approved');

create policy cp_policy_acceptances_self_read
on public.cp_policy_acceptances for select to authenticated
using (user_id=(select auth.uid()));

create policy cp_policy_acceptances_self_insert
on public.cp_policy_acceptances for insert to authenticated
with check (user_id=(select auth.uid()) and exists(
  select 1 from public.cp_policy_documents d
  where d.policy_code=cp_policy_acceptances.policy_code
    and d.version=cp_policy_acceptances.version
    and d.current_for_onboarding
));

insert into public.cp_policy_documents(policy_code,version,title,status,production_ready,current_for_onboarding)
values
 ('terms_of_use','mvp-draft-1','TÃ©rminos de uso â€” borrador MVP','draft',false,true),
 ('privacy_notice','mvp-draft-1','PolÃ­tica de privacidad â€” borrador MVP','draft',false,true);

create or replace function public.cp_require_onboarding_acceptances()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if not exists(
    select 1 from public.cp_policy_documents d
    join public.cp_policy_acceptances a
      on a.policy_code=d.policy_code and a.version=d.version
    where d.policy_code='terms_of_use'
      and d.current_for_onboarding
      and a.user_id=new.id
  ) then
    raise exception 'Debes aceptar los TÃ©rminos de uso vigentes antes de completar el perfil.' using errcode='23514';
  end if;
  if not exists(
    select 1 from public.cp_policy_documents d
    join public.cp_policy_acceptances a
      on a.policy_code=d.policy_code and a.version=d.version
    where d.policy_code='privacy_notice'
      and d.current_for_onboarding
      and a.user_id=new.id
  ) then
    raise exception 'Debes aceptar la PolÃ­tica de privacidad vigente antes de completar el perfil.' using errcode='23514';
  end if;
  return new;
end
$function$;
revoke execute on function public.cp_require_onboarding_acceptances() from public,anon,authenticated,service_role;

drop trigger if exists cp_profiles_require_acceptances on public.cp_profiles;
create trigger cp_profiles_require_acceptances
before insert on public.cp_profiles
for each row execute function public.cp_require_onboarding_acceptances();

-- Authenticated clients may mark only their own notification read timestamp.
revoke update on public.cp_notifications from authenticated;
grant update(read_at) on public.cp_notifications to authenticated;

create or replace function public.cp_mark_notifications_read(p_job_id uuid default null)
returns integer
language plpgsql
security invoker
set search_path to ''
as $function$
declare n integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesiÃ³n.' using errcode='42501';
  end if;
  update public.cp_notifications
     set read_at=coalesce(read_at,now())
   where user_id=auth.uid()
     and read_at is null
     and (p_job_id is null or job_id=p_job_id);
  get diagnostics n=row_count;
  return n;
end
$function$;
revoke execute on function public.cp_mark_notifications_read(uuid) from public,anon,service_role;
grant execute on function public.cp_mark_notifications_read(uuid) to authenticated;
