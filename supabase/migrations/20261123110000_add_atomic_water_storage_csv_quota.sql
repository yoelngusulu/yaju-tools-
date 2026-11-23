-- Atomic quota for Water Storage Calculator CSV/Excel rainfall analysis.
-- One successful dataset analysis consumes one bulk slot, regardless of row count.
-- Single-point NASA POWER/manual rainfall input does not call this quota.

create schema if not exists private;

create or replace function private.reserve_conversion_usage(
  p_user_id uuid,
  p_guest_id text,
  p_event_tool text,
  p_scope_tool text,
  p_limit integer default 5,
  p_window_hours integer default 24
)
returns table(allowed boolean, used integer, remaining integer, reservation_id bigint)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_identity text;
  v_used integer;
  v_new_id bigint;
begin
  if ((p_user_id is null) = (p_guest_id is null)) then
    raise exception 'Exactly one usage identity must be provided';
  end if;
  if p_event_tool is null or length(trim(p_event_tool)) = 0 then
    raise exception 'Event tool is required';
  end if;
  if p_limit < 1 or p_window_hours < 1 then
    raise exception 'Limit and window must be positive';
  end if;

  v_identity := case
    when p_user_id is not null then 'user:' || p_user_id::text
    else 'guest:' || p_guest_id
  end;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_identity, 0)
  );

  if p_user_id is not null then
    select count(*)::integer into v_used
    from public.conversion_usage u
    where u.user_id = p_user_id
      and u.created_at >= now() - pg_catalog.make_interval(hours => p_window_hours)
      and (p_scope_tool is null or u.tool = p_scope_tool);
  else
    select count(*)::integer into v_used
    from public.conversion_usage u
    where u.guest_id = p_guest_id
      and u.created_at >= now() - pg_catalog.make_interval(hours => p_window_hours)
      and (p_scope_tool is null or u.tool = p_scope_tool);
  end if;

  if v_used >= p_limit then
    return query select false, v_used, 0, null::bigint;
    return;
  end if;

  insert into public.conversion_usage(user_id, guest_id, tool)
  values (p_user_id, p_guest_id, p_event_tool)
  returning id into v_new_id;

  return query select true, v_used + 1, greatest(p_limit - v_used - 1, 0), v_new_id;
end;
$function$;

create or replace function private.release_conversion_usage(p_reservation_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted integer;
begin
  delete from public.conversion_usage where id = p_reservation_id;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$function$;

revoke all on function private.reserve_conversion_usage(uuid, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function private.release_conversion_usage(bigint) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.reserve_conversion_usage(uuid, text, text, text, integer, integer) to service_role;
grant execute on function private.release_conversion_usage(bigint) to service_role;

-- Public-schema RPC wrappers are callable only by the server's service_role key.
create or replace function public.reserve_water_storage_csv_usage(
  p_user_id uuid,
  p_guest_id text,
  p_limit integer default 2,
  p_window_hours integer default 24
)
returns table(allowed boolean, used integer, remaining integer, reservation_id bigint)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.reserve_conversion_usage(
    p_user_id,
    p_guest_id,
    'water-storage-csv',
    'water-storage-csv',
    p_limit,
    p_window_hours
  );
$function$;

create or replace function public.release_water_storage_csv_usage(p_reservation_id bigint)
returns boolean
language sql
security invoker
set search_path = ''
as $function$
  select private.release_conversion_usage(p_reservation_id);
$function$;

revoke all on function public.reserve_water_storage_csv_usage(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.release_water_storage_csv_usage(bigint) from public, anon, authenticated;
grant execute on function public.reserve_water_storage_csv_usage(uuid, text, integer, integer) to service_role;
grant execute on function public.release_water_storage_csv_usage(bigint) to service_role;
