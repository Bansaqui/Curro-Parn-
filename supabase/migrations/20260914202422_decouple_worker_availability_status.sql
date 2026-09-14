-- Keep availability ranges independent from the explicit profile switch.
-- Fail closed if the deployed command no longer matches the expected contract.
do $migration$
declare
  definition text := pg_get_functiondef('cp_private.command(text,jsonb)'::regprocedure);
  target text := 'update public.cp_profiles set available=true where id=u;';
  availability_start integer;
  publish_start integer;
begin
  availability_start := strpos(definition, 'elsif p_action=''availability'' then');
  publish_start := strpos(definition, 'elsif p_action=''publish'' then');
  if availability_start = 0 or publish_start <= availability_start
     or (length(definition) - length(replace(definition, target, ''))) <> length(target)
     or strpos(substring(definition from availability_start for publish_start - availability_start), target) = 0 then
    raise exception 'Unexpected availability command definition; migration aborted.';
  end if;
  -- CREATE OR REPLACE preserves owner/ACL; pg_get_functiondef retains function attributes.
  execute replace(definition, target, '');
end
$migration$;
