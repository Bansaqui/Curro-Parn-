drop policy cp_reviews_parties on public.cp_reviews;
drop index if exists cp_reviews_target;
alter table public.cp_reviews drop constraint cp_reviews_check;
alter table public.cp_reviews drop constraint cp_reviews_target_id_fkey;

alter table public.cp_reviews add column subject_type text not null check (subject_type in ('worker','business'));
alter table public.cp_reviews add column target_worker_id uuid null references public.cp_profiles(id);
alter table public.cp_reviews add column target_business_id uuid null references public.cp_businesses(id);
alter table public.cp_reviews add column venue_id uuid not null references public.cp_venues(id);
alter table public.cp_reviews add constraint cp_reviews_exactly_one_target_check check (
  (subject_type='worker' and target_worker_id is not null and target_business_id is null)
  or (subject_type='business' and target_business_id is not null and target_worker_id is null)
);
alter table public.cp_reviews add constraint cp_reviews_author_not_worker_target_check check (
  target_worker_id is null or author_id<>target_worker_id
);
alter table public.cp_reviews drop column target_id;

create index cp_reviews_target_worker on public.cp_reviews(target_worker_id,created_at desc) where target_worker_id is not null;
create index cp_reviews_target_business on public.cp_reviews(target_business_id,created_at desc) where target_business_id is not null;
create index cp_reviews_venue on public.cp_reviews(venue_id,created_at desc);

create policy cp_reviews_parties on public.cp_reviews for select to authenticated using (
  author_id=(select auth.uid())
  or target_worker_id=(select auth.uid())
  or exists(
    select 1 from public.cp_business_members m
    where m.business_id=cp_reviews.target_business_id
      and m.user_id=(select auth.uid()) and m.active
  )
);

do $migration$
declare def text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='cp_private' and p.proname='command'
    and pg_get_function_identity_arguments(p.oid)='p_action text, p_data jsonb';
  if def is null then raise exception 'cp_private.command no encontrada'; end if;

  def:=replace(def,
    'where r.target_id=p.id',
    'where r.target_worker_id=p.id');
  def:=replace(def,
    'where r.author_id=u or r.target_id=u',
    'where r.author_id=u or r.target_worker_id=u or exists(select 1 from public.cp_business_members review_member where review_member.business_id=r.target_business_id and review_member.user_id=u and review_member.active)');
  def:=replace(def,
    'insert into public.cp_reviews(assignment_id,author_id,target_id,stars,comment)\n    values(s.id,u,case when u=s.worker_id then (select created_by from public.cp_businesses where id=s.business_id) else s.worker_id end,(p_data->>''stars'')::smallint,coalesce(p_data->>''comment'',''''))',
    'insert into public.cp_reviews(assignment_id,author_id,subject_type,target_worker_id,target_business_id,venue_id,stars,comment)\n    values(s.id,u,case when u=s.worker_id then ''business'' else ''worker'' end,case when u=s.worker_id then null else s.worker_id end,case when u=s.worker_id then s.business_id else null end,j.venue_id,(p_data->>''stars'')::smallint,coalesce(p_data->>''comment'',''''))');

  execute def;
end
$migration$;
