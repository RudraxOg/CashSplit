-- Product growth fields and public onboarding signup storage.
alter table public.groups add column if not exists plan text not null default 'FREE'
  check (plan in ('FREE', 'PLUS', 'HOUSEHOLDS'));
alter table public.groups add column if not exists trial_started_at timestamptz;
alter table public.groups add column if not exists trial_ends_at timestamptz;
alter table public.groups add column if not exists max_members integer not null default 5 check (max_members > 0);

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  source text not null default 'onboarding',
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;
