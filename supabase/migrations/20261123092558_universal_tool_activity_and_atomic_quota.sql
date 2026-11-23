-- Universal YAJU tool activity and per-tool usage reservations.
-- Apply only to the isolated development Supabase project before production review.

create table if not exists public.tool_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_id text,
  tool_id text not null,
  status text not null default 'reserved'
    check (status in ('reserved', 'committed', 'released')),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  committed_at timestamptz,
  constraint tool_usage_reservations_one_identity check ((user_id is null) <> (guest_id is null))
);

create index if not exists tool_usage_reservations_user_window_idx
  on public.tool_usage_reservations (user_id, tool_id, reserved_at desc);
create index if not exists tool_usage_reservations_guest_window_idx
  on public.tool_usage_reservations (guest_id, tool_id, reserved_at desc);

alter table public.tool_usage_reservations enable row level security;
revoke all on public.tool_usage_reservations from public, anon, authenticated;
grant all on public.tool_usage_reservations to service_role;

create table if not exists public.tool_activity (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  guest_id text,
  tool_id text not null check (tool_id in (
    'coordinates-converter', 'epsg-crs-finder', 'distance-area-bearing',
    'ahp-criteria-weighting', 'water-storage', 'qr-code-generator',
    'html-to-pdf', 'merge-pdf', 'split-pdf', 'compress-pdf',
    'pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint', 'image-to-pdf'
  )),
  category text not null check (category in ('GIS & Field Tools', 'Document Tools', 'Image Tools')),
  event_type text not null,
  success boolean not null default true check (success),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  constraint tool_activity_one_identity check ((user_id is null) <> (guest_id is null))
);

create index if not exists tool_activity_user_occurred_idx
  on public.tool_activity (user_id, occurred_at desc) where user_id is not null;
create index if not exists tool_activity_guest_occurred_idx
  on public.tool_activity (guest_id, occurred_at desc) where guest_id is not null;

alter table public.tool_activity enable row level security;
revoke all on public.tool_activity from public, anon, authenticated;
grant select on public.tool_activity to authenticated;
grant all on public.tool_activity to service_role;
create policy "Users read their own tool activity"
  on public.tool_activity for select to authenticated
  using ((select auth.uid()) = user_id);

create schema if not exists private;

create or replace function private.reserve_tool_usage(
  p_user_id uuid,
  p_guest_id text,
  p_tool_id text,
  p_limit integer,
  p_window_seconds integer default 86400
)
returns table(allowed boolean, used integer, remaining integer, reservation_id uuid)
language plpgsql security definer set search_path = '' as $function$
declare
  v_identity text;
  v_used integer;
  v_id uuid;
begin
  if ((p_user_id is null) = (p_guest_id is null)) then
    raise exception 'Exactly one usage identity must be provided';
  end if;
  if p_tool_id is null or length(trim(p_tool_id)) = 0 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Tool, limit and window must be valid';
  end if;
  v_identity := case when p_user_id is not null then 'user:' || p_user_id::text else 'guest:' || p_guest_id end;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_identity || ':' || p_tool_id, 0));

  select
    (select count(*)::integer from public.conversion_usage u
      where u.tool = p_tool_id and u.created_at >= now() - pg_catalog.make_interval(secs => p_window_seconds)
        and ((p_user_id is not null and u.user_id = p_user_id) or (p_guest_id is not null and u.guest_id = p_guest_id)))
    +
    (select count(*)::integer from public.tool_usage_reservations r
      where r.tool_id = p_tool_id and ((p_user_id is not null and r.user_id = p_user_id) or (p_guest_id is not null and r.guest_id = p_guest_id))
        and ((r.status = 'committed' and r.committed_at >= now() - pg_catalog.make_interval(secs => p_window_seconds))
          or (r.status = 'reserved' and r.expires_at > now())))
  into v_used;

  if v_used >= p_limit then
    return query select false, v_used, 0, null::uuid;
    return;
  end if;
  insert into public.tool_usage_reservations(user_id, guest_id, tool_id)
    values (p_user_id, p_guest_id, p_tool_id) returning id into v_id;
  return query select true, v_used + 1, greatest(p_limit - v_used - 1, 0), v_id;
end;
$function$;

create or replace function private.finish_tool_usage(p_reservation_id uuid, p_user_id uuid, p_guest_id text, p_commit boolean)
returns boolean language plpgsql security definer set search_path = '' as $function$
declare v_count integer;
begin
  if ((p_user_id is null) = (p_guest_id is null)) then
    raise exception 'Exactly one usage identity must be provided';
  end if;
  update public.tool_usage_reservations
    set status = case when p_commit then 'committed' else 'released' end,
        committed_at = case when p_commit then now() else null end
    where id = p_reservation_id and status = 'reserved' and expires_at > now()
      and ((p_user_id is not null and user_id = p_user_id) or (p_guest_id is not null and guest_id = p_guest_id));
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$function$;

create or replace function public.reserve_tool_usage(
  p_user_id uuid, p_guest_id text, p_tool_id text, p_limit integer, p_window_seconds integer default 86400
)
returns table(allowed boolean, used integer, remaining integer, reservation_id uuid)
language sql security invoker set search_path = '' as $function$
  select * from private.reserve_tool_usage(p_user_id, p_guest_id, p_tool_id, p_limit, p_window_seconds);
$function$;

create or replace function public.finish_tool_usage(p_reservation_id uuid, p_user_id uuid, p_guest_id text, p_commit boolean)
returns boolean language sql security invoker set search_path = '' as $function$
  select private.finish_tool_usage(p_reservation_id, p_user_id, p_guest_id, p_commit);
$function$;

revoke all on function private.reserve_tool_usage(uuid, text, text, integer, integer) from public, anon, authenticated;
revoke all on function private.finish_tool_usage(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.reserve_tool_usage(uuid, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.finish_tool_usage(uuid, uuid, text, boolean) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.reserve_tool_usage(uuid, text, text, integer, integer) to service_role;
grant execute on function private.finish_tool_usage(uuid, uuid, text, boolean) to service_role;
grant execute on function public.reserve_tool_usage(uuid, text, text, integer, integer) to service_role;
grant execute on function public.finish_tool_usage(uuid, uuid, text, boolean) to service_role;
