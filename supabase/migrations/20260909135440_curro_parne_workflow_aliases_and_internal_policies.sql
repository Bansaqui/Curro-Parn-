create or replace function cp_private.command(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); me public.cp_profiles; j public.cp_jobs; a public.cp_applications; s public.cp_assignments;
 target uuid; result jsonb; st text; n integer; slot integer; entity uuid; begin_at timestamptz; end_at timestamptz;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then
  raise exception 'Debes iniciar sesiÃ³n con un correo confirmado.' using errcode='42501';
 end if;
 select * into me from public.cp_profiles where id=u;
 if p_action='onboard' then
  if me.id is not null then return to_jsonb(me); end if;
  insert into public.cp_profiles(id,role,display_name,specialty) values(u,p_data->>'role',trim(p_data->>'name'),coalesce(p_data->>'specialty','Camarero/a')) returning * into me;
  insert into cp_private.events(actor_id,action,entity_id) values(u,p_action,u);
  return to_jsonb(me);
 end if;
 if p_action='snapshot' then
  return jsonb_build_object('profile',to_jsonb(me),
   'jobs',coalesce((select jsonb_agg(x order by x.starts_at) from(select jobs_row.*,p.display_name business_name,(select count(*) from public.cp_assignments assigned_row where assigned_row.job_id=jobs_row.id and assigned_row.state<>'cancelled') occupied from public.cp_jobs jobs_row join public.cp_profiles p on p.id=jobs_row.business_id where jobs_row.business_id=u or (me.role='worker' and ((jobs_row.state='published' and jobs_row.ends_at>now()) or exists(select 1 from public.cp_applications apps_row where apps_row.job_id=jobs_row.id and apps_row.worker_id=u))) order by jobs_row.starts_at desc limit 200)x),'[]'::jsonb),
   'applications',coalesce((select jsonb_agg(x) from(select apps_row.*,p.display_name worker_name from public.cp_applications apps_row join public.cp_profiles p on p.id=apps_row.worker_id where apps_row.worker_id=u or apps_row.business_id=u order by apps_row.created_at desc limit 500)x),'[]'::jsonb),
   'assignments',coalesce((select jsonb_agg(x) from(select assigned_row.*,p.display_name worker_name from public.cp_assignments assigned_row join public.cp_profiles p on p.id=assigned_row.worker_id where assigned_row.worker_id=u or assigned_row.business_id=u order by assigned_row.created_at desc limit 500)x),'[]'::jsonb),
   'availability',coalesce((select jsonb_agg(v order by v.starts_at) from public.cp_availability v where v.worker_id=u),'[]'::jsonb),
   'reviews',coalesce((select jsonb_agg(r) from public.cp_reviews r where r.author_id=u or r.target_id=u),'[]'::jsonb),
   'incidents',coalesce((select jsonb_agg(i) from public.cp_incidents i join public.cp_assignments assigned_row on assigned_row.id=i.assignment_id where assigned_row.worker_id=u or assigned_row.business_id=u),'[]'::jsonb));
 end if;
 if me.id is null then raise exception 'Completa tu perfil.'; end if;
 if p_action='profile' then
  update public.cp_profiles set display_name=trim(p_data->>'name'),bio=coalesce(p_data->>'bio',''),available=coalesce((p_data->>'available')::boolean,false) where id=u;
  entity:=u;
 elsif p_action='availability' then
  if me.role<>'worker' then raise exception 'Solo profesionales.' using errcode='42501'; end if;
  if p_data ? 'delete_id' then delete from public.cp_availability where id=(p_data->>'delete_id')::uuid and worker_id=u;
  else
   if (select count(*) from public.cp_availability where worker_id=u)>=100 then raise exception 'LÃ­mite de 100 franjas.'; end if;
   insert into public.cp_availability(worker_id,starts_at,ends_at) values(u,(p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz) returning id into entity;
   update public.cp_profiles set available=true where id=u;
  end if;
 elsif p_action='publish' then
  if me.role<>'business' then raise exception 'Solo negocios.' using errcode='42501'; end if;
  if (p_data->>'starts_at')::timestamptz<=now() then raise exception 'La entrada debe ser futura.'; end if;
  if (select count(*) from public.cp_jobs where business_id=u and created_at>now()-interval '1 day')>=50 then raise exception 'LÃ­mite diario de publicaciones alcanzado.'; end if;
  insert into public.cp_jobs(business_id,title,specialty,location,description,starts_at,ends_at,slots,pay_cents,urgent)
   values(u,trim(p_data->>'title'),p_data->>'specialty',trim(p_data->>'location'),coalesce(p_data->>'description',''),(p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz,(p_data->>'slots')::smallint,(p_data->>'pay_cents')::integer,coalesce((p_data->>'urgent')::boolean,false)) returning id into entity;
 elsif p_action='candidates' then
  select * into j from public.cp_jobs where id=(p_data->>'job_id')::uuid for update;
  if j.id is null or j.business_id<>u then raise exception 'Acceso denegado.' using errcode='42501'; end if;
  -- Serialize cohort allocation so two jobs cannot both take the same first turn.
  perform pg_advisory_xact_lock(7742001);
  insert into cp_private.match_order(job_id,worker_id,position)
   select j.id,p.id,(select coalesce(max(position),0) from cp_private.match_order where job_id=j.id)+row_number() over(order by coalesce((select max(m.created_at) from cp_private.match_order m where m.worker_id=p.id and m.position=1),'-infinity'::timestamptz),md5(j.id::text||p.id::text))
   from public.cp_profiles p where p.role='worker' and p.available and p.specialty=j.specialty
   and exists(select 1 from public.cp_availability v where v.worker_id=p.id and v.starts_at<=j.starts_at and v.ends_at>=j.ends_at)
   and not exists(select 1 from public.cp_assignments booked_row where booked_row.worker_id=p.id and booked_row.state<>'cancelled' and tstzrange(booked_row.starts_at,booked_row.ends_at,'[)')&&tstzrange(j.starts_at,j.ends_at,'[)'))
   and not exists(select 1 from cp_private.match_order m where m.job_id=j.id and m.worker_id=p.id);
  return coalesce((select jsonb_agg(x order by x.position) from(select p.id,p.display_name,p.specialty,p.city,p.bio,m.position,
   (select count(*) from public.cp_reviews r where r.target_id=p.id) reference_count,
   (select round(avg(stars),1) from public.cp_reviews r where r.target_id=p.id) rating
   from cp_private.match_order m join public.cp_profiles p on p.id=m.worker_id where m.job_id=j.id and p.available and p.specialty=j.specialty
   and exists(select 1 from public.cp_availability v where v.worker_id=p.id and v.starts_at<=j.starts_at and v.ends_at>=j.ends_at)
   and not exists(select 1 from public.cp_assignments booked_row where booked_row.worker_id=p.id and booked_row.state<>'cancelled' and tstzrange(booked_row.starts_at,booked_row.ends_at,'[)')&&tstzrange(j.starts_at,j.ends_at,'[)')))x),'[]'::jsonb);
 elsif p_action in ('apply','invite') then
  select * into j from public.cp_jobs where id=(p_data->>'job_id')::uuid for update;
  if j.id is null or j.state<>'published' or j.starts_at<=now() then raise exception 'El Curro ya no admite candidaturas.'; end if;
  if p_action='apply' then
   if me.role<>'worker' then raise exception 'Solo profesionales.' using errcode='42501'; end if;target:=u;st:='applied';
  else
   if j.business_id<>u then raise exception 'Acceso denegado.' using errcode='42501'; end if;target:=(p_data->>'worker_id')::uuid;st:='invited';
  end if;
  perform 1 from public.cp_profiles p where p.id=target and p.role='worker' and p.available and p.specialty=j.specialty for update;
  if not found then raise exception 'El profesional no es compatible o no estÃ¡ disponible.'; end if;
  if not exists(select 1 from public.cp_availability where worker_id=target and starts_at<=j.starts_at and ends_at>=j.ends_at) then raise exception 'Falta disponibilidad para todo el turno.'; end if;
  if exists(select 1 from public.cp_assignments booked_row where booked_row.worker_id=target and booked_row.state<>'cancelled' and tstzrange(booked_row.starts_at,booked_row.ends_at,'[)')&&tstzrange(j.starts_at,j.ends_at,'[)')) then raise exception 'Existe un turno solapado.'; end if;
  if (select count(*) from public.cp_assignments where job_id=j.id and state<>'cancelled')>=j.slots then raise exception 'No quedan plazas.'; end if;
  select * into a from public.cp_applications where job_id=j.id and worker_id=target;
  if a.id is null then insert into public.cp_applications(job_id,business_id,worker_id,state) values(j.id,j.business_id,target,st) returning id into entity;
  elsif a.state=st then return jsonb_build_object('id',a.id,'unchanged',true);
  elsif p_action='apply' and a.state='invited' then update public.cp_applications set state='applied' where id=a.id;entity:=a.id;
  else raise exception 'Ya existe una candidatura para este Curro.'; end if;
 elsif p_action in ('select','reject','withdraw') then
  select * into a from public.cp_applications where id=(p_data->>'application_id')::uuid;
  if a.id is null then raise exception 'Candidatura no disponible.'; end if;
  select * into j from public.cp_jobs where id=a.job_id for update;
  select * into a from public.cp_applications where id=a.id for update;
  if p_action='withdraw' then
   if a.worker_id<>u then raise exception 'Acceso denegado.' using errcode='42501'; end if;
   if a.state not in ('applied','invited') then raise exception 'La candidatura no se puede retirar.'; end if;
   update public.cp_applications set state='withdrawn' where id=a.id;
  else
   if a.business_id<>u then raise exception 'Acceso denegado.' using errcode='42501'; end if;
   if p_action='reject' then
    if a.state not in ('applied','invited') then raise exception 'La candidatura no se puede rechazar.'; end if;
    update public.cp_applications set state='rejected' where id=a.id;
   else
    if a.state='selected' then return jsonb_build_object('id',a.id,'unchanged',true); end if;
    if a.state<>'applied' or j.state<>'published' or j.starts_at<=now() then raise exception 'Se necesita una candidatura aceptada por el profesional.'; end if;
    perform 1 from public.cp_profiles where id=a.worker_id and available and specialty=j.specialty for update;
    if not found or not exists(select 1 from public.cp_availability where worker_id=a.worker_id and starts_at<=j.starts_at and ends_at>=j.ends_at) then raise exception 'La disponibilidad ha cambiado.'; end if;
    select x into slot from generate_series(1,j.slots) x where not exists(select 1 from public.cp_assignments booked_row where booked_row.job_id=j.id and booked_row.slot_no=x and booked_row.state<>'cancelled') order by x limit 1;
    if slot is null then raise exception 'No quedan plazas.'; end if;
    insert into public.cp_assignments(application_id,job_id,business_id,worker_id,slot_no,starts_at,ends_at) values(a.id,j.id,j.business_id,a.worker_id,slot,j.starts_at,j.ends_at) returning id into entity;
    update public.cp_applications set state='selected' where id=a.id;
   end if;
  end if;
  entity:=coalesce(entity,a.id);
 elsif p_action in ('transition','cancel','incident','review') then
  select * into s from public.cp_assignments where id=(p_data->>'assignment_id')::uuid;
  if s.id is null or (s.worker_id<>u and s.business_id<>u) then raise exception 'Acceso denegado.' using errcode='42501'; end if;
  select * into j from public.cp_jobs where id=s.job_id for update;
  select * into s from public.cp_assignments where id=s.id for update;
  entity:=s.id;
  if p_action='cancel' then
   if length(trim(coalesce(p_data->>'reason','')))<5 then raise exception 'Indica un motivo de al menos 5 caracteres.'; end if;
   if s.state='cancelled' then return jsonb_build_object('id',s.id,'unchanged',true); end if;
   if s.state not in ('selected','conditions_ready','confirmed') then raise exception 'Con el turno iniciado, registra una incidencia.'; end if;
   update public.cp_assignments set state='cancelled',cancellation_reason=trim(p_data->>'reason') where id=s.id;
   update public.cp_applications set state='withdrawn' where id=s.application_id;
  elsif p_action='incident' then
   insert into public.cp_incidents(assignment_id,author_id,description) values(s.id,u,trim(p_data->>'description')) returning id into entity;
  elsif p_action='review' then
   if s.state<>'closed' then raise exception 'La referencia requiere un Curro cerrado.'; end if;
   insert into public.cp_reviews(assignment_id,author_id,target_id,stars,comment) values(s.id,u,case when u=s.worker_id then s.business_id else s.worker_id end,(p_data->>'stars')::smallint,coalesce(p_data->>'comment','')) on conflict(assignment_id,author_id) do nothing;
  else
   st:=p_data->>'state';
   if (st in ('conditions_ready','business_paid') and u<>s.business_id) or (st in ('confirmed','working','payment_pending','closed') and u<>s.worker_id) then raise exception 'AcciÃ³n reservada a la otra parte.' using errcode='42501'; end if;
   if st=s.state then return jsonb_build_object('id',s.id,'unchanged',true); end if;
   if not ((s.state='selected' and st='conditions_ready') or(s.state='conditions_ready' and st='confirmed') or(s.state='confirmed' and st='working') or(s.state='working' and st='payment_pending') or(s.state='payment_pending' and st='business_paid') or(s.state='business_paid' and st='closed')) then raise exception 'Ese cambio de estado no corresponde.'; end if;
   if st='working' and now()<s.starts_at-interval '30 minutes' then raise exception 'Puedes iniciar desde 30 minutos antes de la entrada.'; end if;
   if st in ('conditions_ready','confirmed') and coalesce((p_data->>'acknowledged')::boolean,false)=false then raise exception 'Debes confirmar las condiciones.'; end if;
   update public.cp_assignments set state=st,started_at=case when st='working' then now() else started_at end,finished_at=case when st='payment_pending' then now() else finished_at end,paid_marked_at=case when st='business_paid' then now() else paid_marked_at end,closed_at=case when st='closed' then now() else closed_at end where id=s.id;
  end if;
 elsif p_action in ('message','messages') then
  select * into a from public.cp_applications where id=(p_data->>'application_id')::uuid;
  if a.id is null or (a.worker_id<>u and a.business_id<>u) then raise exception 'Acceso denegado.' using errcode='42501'; end if;
  if p_action='messages' then return coalesce((select jsonb_agg(x order by x.created_at) from(select * from public.cp_messages where application_id=a.id order by created_at desc limit 200)x),'[]'::jsonb); end if;
  if a.state in ('rejected','withdrawn') then raise exception 'Esta conversaciÃ³n estÃ¡ cerrada.'; end if;
  if (select count(*) from public.cp_messages where sender_id=u and created_at>now()-interval '1 minute')>=30 then raise exception 'Espera un minuto antes de enviar mÃ¡s mensajes.'; end if;
  insert into public.cp_messages(application_id,sender_id,body) values(a.id,u,trim(p_data->>'body')) returning id into entity;
 elsif p_action='cancel_job' then
  select * into j from public.cp_jobs where id=(p_data->>'job_id')::uuid for update;
  if j.id is null or j.business_id<>u then raise exception 'Acceso denegado.' using errcode='42501'; end if;
  if exists(select 1 from public.cp_assignments where job_id=j.id and state<>'cancelled') then raise exception 'Gestiona antes las plazas asignadas.'; end if;
  update public.cp_jobs set state='cancelled' where id=j.id;entity:=j.id;
 else raise exception 'AcciÃ³n no reconocida.';
 end if;
 insert into cp_private.events(actor_id,action,entity_id) values(u,p_action,entity);
 return jsonb_build_object('id',entity,'ok',true);
end $$;

create policy cp_internal_events_deny on cp_private.events for all to authenticated using(false) with check(false);
create policy cp_internal_match_deny on cp_private.match_order for all to authenticated using(false) with check(false);
