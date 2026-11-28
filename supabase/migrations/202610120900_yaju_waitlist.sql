create table if not exists public.waitlist_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.waitlist_subscribers enable row level security;
revoke all on public.waitlist_subscribers from anon, authenticated;
grant all on public.waitlist_subscribers to service_role;
