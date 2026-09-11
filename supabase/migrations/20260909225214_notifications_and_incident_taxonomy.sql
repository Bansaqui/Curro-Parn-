create table public.cp_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.cp_profiles(id) on delete cascade,
  job_id uuid null references public.cp_jobs(id) on delete cascade,
  application_id uuid null references public.cp_applications(id) on delete cascade,
  assignment_id uuid null references public.cp_assignments(id) on delete cascade,
  type text not null check (type in ('application','invitation','selected','rejected','withdrawn','service','payment','incident','cancellation','review','system')),
  title text not null check (char_length(trim(title)) between 1 and 140),
  body text not null default '' check (char_length(body) <= 1000),
  read_at timestamptz null,
  created_at timestamptz not null default now()
);
create index cp_notifications_user_unread on public.cp_notifications(user_id,created_at desc) where read_at is null;
create index cp_notifications_job on public.cp_notifications(job_id,user_id,created_at desc) where job_id is not null;
alter table public.cp_notifications enable row level security;
revoke all on public.cp_notifications from anon,authenticated;
grant select on public.cp_notifications to authenticated;
grant update(read_at) on public.cp_notifications to authenticated;
create policy cp_notifications_self_read on public.cp_notifications for select to authenticated using (user_id=(select auth.uid()));
create policy cp_notifications_self_mark_read on public.cp_notifications for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

alter table public.cp_incidents add column incident_type text not null default 'other';
alter table public.cp_incidents add column resolution text null;
alter table public.cp_incidents add column resolved_at timestamptz null;
alter table public.cp_incidents add column resolved_by uuid null references public.cp_profiles(id);
alter table public.cp_incidents add constraint cp_incidents_type_check check (incident_type in ('late','no_show','abandonment','venue_closed','conditions_changed','safety','conduct','other'));
alter table public.cp_incidents add constraint cp_incidents_resolution_check check (resolution is null or char_length(resolution) <= 2000);
create index cp_incidents_open on public.cp_incidents(assignment_id,created_at desc) where status='open';
create index cp_incidents_resolved_by on public.cp_incidents(resolved_by,created_at desc) where resolved_by is not null;

create or replace function cp_private.notify_user(
  p_user uuid,p_type text,p_title text,p_body text default '',p_job uuid default null,p_application uuid default null,p_assignment uuid default null
) returns uuid language plpgsql security definer set search_path to '' as $f$
declare nid uuid;
begin
  insert into public.cp_notifications(user_id,type,title,body,job_id,application_id,assignment_id)
  values(p_user,p_type,p_title,coalesce(p_body,''),p_job,p_application,p_assignment)
  returning id into nid;
  return nid;
end $f$;

create or replace function cp_private.notify_business(
  p_business uuid,p_type text,p_title text,p_body text default '',p_job uuid default null,p_application uuid default null,p_assignment uuid default null
) returns integer language plpgsql security definer set search_path to '' as $f$
declare n integer;
begin
  insert into public.cp_notifications(user_id,type,title,body,job_id,application_id,assignment_id)
  select m.user_id,p_type,p_title,coalesce(p_body,''),p_job,p_application,p_assignment
  from public.cp_business_members m
  where m.business_id=p_business and m.active and m.member_role in ('owner','manager');
  get diagnostics n = row_count;
  return n;
end $f$;

revoke all on function cp_private.notify_user(uuid,text,text,text,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function cp_private.notify_business(uuid,text,text,text,uuid,uuid,uuid) from public,anon,authenticated;

create or replace function cp_private.application_notifications() returns trigger
language plpgsql security definer set search_path to '' as $f$
begin
  if tg_op='INSERT' then
    if new.state='applied' then
      perform cp_private.notify_business(new.business_id,'application','Nueva candidatura','Un profesional se ha interesado en tu Curro.',new.job_id,new.id,null);
    elsif new.state='invited' then
      perform cp_private.notify_user(new.worker_id,'invitation','Nueva invitaciÃ³n','Un negocio te ha invitado a un Curro.',new.job_id,new.id,null);
    end if;
  elsif new.state is distinct from old.state then
    if new.state='selected' then
      perform cp_private.notify_user(new.worker_id,'selected','Has sido seleccionado','El negocio te ha seleccionado para este Curro.',new.job_id,new.id,null);
    elsif new.state='rejected' then
      perform cp_private.notify_user(new.worker_id,'rejected','Candidatura no seleccionada','El negocio ha cerrado tu candidatura para este Curro.',new.job_id,new.id,null);
    elsif new.state='withdrawn' then
      perform cp_private.notify_business(new.business_id,'withdrawn','Candidatura retirada','El profesional ha retirado su candidatura.',new.job_id,new.id,null);
    end if;
  end if;
  return new;
end $f$;
create trigger cp_applications_notifications after insert or update of state on public.cp_applications for each row execute function cp_private.application_notifications();

create or replace function cp_private.assignment_notifications() returns trigger
language plpgsql security definer set search_path to '' as $f$
begin
  if tg_op='UPDATE' and new.state is distinct from old.state then
    if new.state='confirmed' then
      perform cp_private.notify_business(new.business_id,'service','Curro confirmado','El profesional ha confirmado las condiciones.',new.job_id,new.application_id,new.id);
    elsif new.state='payment_pending' then
      perform cp_private.notify_business(new.business_id,'payment','Turno finalizado','El profesional ha finalizado el turno. El pago queda pendiente.',new.job_id,new.application_id,new.id);
    elsif new.state='business_paid' then
      perform cp_private.notify_user(new.worker_id,'payment','Pago marcado como realizado','El negocio ha marcado el pago como realizado.',new.job_id,new.application_id,new.id);
    elsif new.state='closed' then
      perform cp_private.notify_business(new.business_id,'payment','Cobro confirmado','El profesional ha confirmado el cobro. Curro cerrado.',new.job_id,new.application_id,new.id);
    elsif new.state='cancelled' then
      perform cp_private.notify_user(new.worker_id,'cancellation','Plaza cancelada','Tu asignaciÃ³n para este Curro ha sido cancelada.',new.job_id,new.application_id,new.id);
      perform cp_private.notify_business(new.business_id,'cancellation','Plaza liberada','Una asignaciÃ³n del Curro ha quedado cancelada.',new.job_id,new.application_id,new.id);
    end if;
  end if;
  return new;
end $f$;
create trigger cp_assignments_notifications after update of state on public.cp_assignments for each row execute function cp_private.assignment_notifications();

create or replace function cp_private.incident_notifications() returns trigger
language plpgsql security definer set search_path to '' as $f$
declare a public.cp_assignments;
begin
  select * into a from public.cp_assignments where id=new.assignment_id;
  if new.author_id=a.worker_id then
    perform cp_private.notify_business(a.business_id,'incident','Nueva incidencia','El profesional ha registrado una incidencia en el Curro.',a.job_id,a.application_id,a.id);
  else
    perform cp_private.notify_user(a.worker_id,'incident','Nueva incidencia','El negocio ha registrado una incidencia en tu Curro.',a.job_id,a.application_id,a.id);
  end if;
  return new;
end $f$;
create trigger cp_incidents_notifications after insert on public.cp_incidents for each row execute function cp_private.incident_notifications();

create or replace function cp_private.job_notifications() returns trigger
language plpgsql security definer set search_path to '' as $f$
begin
  if tg_op='UPDATE' and new.state='cancelled' and old.state is distinct from new.state then
    insert into public.cp_notifications(user_id,type,title,body,job_id,application_id)
    select distinct a.worker_id,'cancellation','Curro cancelado','El negocio ha cancelado este Curro.',new.id,a.id
    from public.cp_applications a where a.job_id=new.id and a.state not in ('rejected','withdrawn');
  end if;
  return new;
end $f$;
create trigger cp_jobs_notifications after update of state on public.cp_jobs for each row execute function cp_private.job_notifications();
