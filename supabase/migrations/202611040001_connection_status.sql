-- Public readiness metadata only: this does not grant access to any user rows.
create function public.aura_connection_status() returns boolean
language sql stable security invoker set search_path = '' as $$
  select pg_catalog.to_regclass('public.profiles') is not null
    and pg_catalog.to_regclass('public.couples') is not null
    and pg_catalog.to_regclass('public.couple_members') is not null
    and pg_catalog.to_regclass('public.messages') is not null
    and pg_catalog.to_regclass('public.calendar_events') is not null
    and pg_catalog.to_regclass('public.memories') is not null
    and pg_catalog.to_regclass('public.mood_checkins') is not null
    and pg_catalog.to_regclass('public.cycle_settings') is not null;
$$;
revoke all on function public.aura_connection_status() from public;
grant execute on function public.aura_connection_status() to anon, authenticated, service_role;
