create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'General feedback',
    'Report a problem',
    'Feature suggestion',
    'Question about a tool',
    'Accessibility issue'
  )),
  message text not null check (char_length(message) between 10 and 3000),
  reply_email text,
  page_reference text,
  status text not null default 'NEW' check (status in ('NEW', 'REVIEWED', 'RESOLVED', 'ARCHIVED')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_submissions_created_at_idx
  on public.feedback_submissions (created_at desc);
create index if not exists feedback_submissions_status_idx
  on public.feedback_submissions (status, created_at desc);

alter table public.feedback_submissions enable row level security;

revoke all on table public.feedback_submissions from anon, authenticated;
grant insert, select, update on table public.feedback_submissions to service_role;
