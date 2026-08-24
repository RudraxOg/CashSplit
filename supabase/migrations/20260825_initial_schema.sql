-- RoomMate production schema for Supabase Postgres.
-- Run this in the Supabase SQL editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  cover_image text,
  simplify_debts boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete set null,
  description text not null check (char_length(description) between 1 and 240),
  total_amount_minor bigint not null check (total_amount_minor > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  category_id text,
  split_type text not null check (split_type in ('EQUAL','SHARES','PERCENT','EXACT','ADJUSTMENT','ITEMIZED')),
  expense_kind text not null default 'NORMAL' check (expense_kind in ('NORMAL','REIMBURSEMENT')),
  expense_date date not null default current_date,
  created_by uuid not null references public.profiles(id),
  notes text,
  receipt_image_url text,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_payers (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  paid_amount_minor bigint not null check (paid_amount_minor >= 0),
  unique (expense_id, user_id)
);

create table if not exists public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  owed_amount_minor bigint not null,
  share_value numeric,
  percent_value numeric check (percent_value is null or percent_value between 0 and 100),
  adjustment_value_minor bigint,
  unique (expense_id, user_id)
);

create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  name text not null,
  price_minor bigint not null check (price_minor > 0)
);

create table if not exists public.expense_item_shares (
  item_id uuid not null references public.expense_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  share_value numeric not null check (share_value > 0),
  primary key (item_id, user_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete set null,
  from_user_id uuid not null references public.profiles(id),
  to_user_id uuid not null references public.profiles(id),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  method text not null default 'cash',
  settled_at timestamptz not null default now(),
  note text,
  check (from_user_id <> to_user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.expense_history (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  changed_by uuid not null references public.profiles(id),
  action text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  ref_type text,
  ref_id uuid,
  text text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.idempotency_keys (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  request_hash text not null,
  response_status integer not null,
  response_body jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  assigned_to uuid not null references public.profiles(id),
  due_date date not null,
  recurrence_rule text,
  status text not null default 'pending' check (status in ('overdue','pending','upcoming','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists expenses_group_date_idx on public.expenses(group_id, expense_date desc) where deleted_at is null;
create index if not exists activity_expense_idx on public.expense_history(expense_id, created_at desc);
create index if not exists chores_group_due_idx on public.chores(group_id, due_date);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_payers enable row level security;
alter table public.expense_shares enable row level security;
alter table public.chores enable row level security;
alter table public.settlements enable row level security;
alter table public.comments enable row level security;
alter table public.activities enable row level security;

create or replace function public.is_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = target_group and user_id = auth.uid());
$$;

drop policy if exists groups_member_read on public.groups;
create policy groups_member_read on public.groups for select using (public.is_group_member(id));
drop policy if exists group_members_self_read on public.group_members;
create policy group_members_self_read on public.group_members for select using (public.is_group_member(group_id));
drop policy if exists expenses_member_read on public.expenses;
create policy expenses_member_read on public.expenses for select using (group_id is null or public.is_group_member(group_id));
drop policy if exists chores_member_read on public.chores;
create policy chores_member_read on public.chores for select using (public.is_group_member(group_id));
drop policy if exists settlements_member_read on public.settlements;
create policy settlements_member_read on public.settlements for select using (group_id is null or public.is_group_member(group_id));
drop policy if exists comments_member_read on public.comments;
create policy comments_member_read on public.comments for select using (exists (select 1 from public.expenses e where e.id = expense_id and (e.group_id is null or public.is_group_member(e.group_id))));
drop policy if exists activities_member_read on public.activities;
create policy activities_member_read on public.activities for select using (group_id is null or public.is_group_member(group_id));
