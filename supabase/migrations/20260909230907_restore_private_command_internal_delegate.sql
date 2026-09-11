-- cp_private is an internal schema; authenticated EXECUTE is required only so the
-- SECURITY INVOKER public wrapper can delegate while preserving auth.uid().
-- The private function itself retains fixed search_path and explicit authorization checks.
grant execute on function cp_private.command(text,jsonb) to authenticated;
revoke execute on function cp_private.command(text,jsonb) from anon,public,service_role;

-- Public API remains the wrapper.
alter function public.cp_command(text,jsonb) security invoker;
revoke execute on function public.cp_command(text,jsonb) from public,anon;
grant execute on function public.cp_command(text,jsonb) to authenticated,service_role;
