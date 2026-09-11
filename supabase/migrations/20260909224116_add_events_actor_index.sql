create index if not exists cp_events_actor_created_at
on cp_private.events (actor_id, created_at desc);