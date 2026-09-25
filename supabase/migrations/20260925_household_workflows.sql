create extension if not exists pg_trgm;
alter table public.groups add column if not exists default_split jsonb;
create index if not exists expenses_group_date_idx on public.expenses(group_id, expense_date desc, created_at desc, id) where deleted_at is null;
create index if not exists expenses_description_search_idx on public.expenses using gin(description gin_trgm_ops) where deleted_at is null;

create table if not exists public.expense_series (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  template jsonb not null,
  frequency text not null check (frequency in ('WEEKLY','FORTNIGHTLY','MONTHLY','YEARLY')),
  time_zone text not null default 'Asia/Kolkata',
  next_date date not null,
  anchor_day integer not null check (anchor_day between 1 and 31),
  active boolean not null default true,
  last_error text,
  version integer not null default 1,
  created_at timestamptz not null default now()
);
create table if not exists public.expense_occurrences (
  series_id uuid not null references public.expense_series(id) on delete cascade,
  occurrence_date date not null,
  expense_id uuid references public.expenses(id),
  primary key (series_id, occurrence_date)
);
alter table public.expense_series enable row level security;
alter table public.expense_occurrences enable row level security;
create policy expense_series_read on public.expense_series for select using (public.is_group_member(group_id));
create policy expense_occurrences_read on public.expense_occurrences for select using (exists(select 1 from public.expense_series s where s.id = series_id and public.is_group_member(s.group_id)));
create index expense_series_due_idx on public.expense_series(next_date) where active;

-- A single transaction claims a period, posts the complete ledger, and advances
-- the series. Concurrent workers and retries cannot post the same period twice.
create or replace function public.post_expense_occurrence(p_series_id uuid, p_date date, p_next_date date, p_version integer, p_bundle jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.expense_series; result uuid;
begin
  select * into s from public.expense_series where id = p_series_id for update;
  if s.id is null then raise exception 'series not found'; end if;
  select expense_id into result from public.expense_occurrences where series_id = s.id and occurrence_date = p_date;
  if result is not null then return result; end if;
  if not s.active or s.next_date <> p_date or s.version <> p_version then raise exception 'series changed' using errcode = '40001'; end if;
  if p_next_date <= p_date then raise exception 'next date must advance'; end if;
  if (p_bundle->'p_expense'->>'group_id')::uuid <> s.group_id then raise exception 'group mismatch'; end if;
  result := public.create_expense_bundle(p_bundle->'p_expense', p_bundle->'p_payers', p_bundle->'p_shares', coalesce(p_bundle->'p_items','[]'::jsonb), '[]'::jsonb, p_bundle->'p_history', p_bundle->'p_activity');
  insert into public.expense_occurrences values(s.id, p_date, result);
  update public.expense_series set next_date = p_next_date, last_error = null where id = s.id;
  return result;
end $$;
revoke all on function public.post_expense_occurrence(uuid,date,date,integer,jsonb) from public, anon, authenticated;
grant execute on function public.post_expense_occurrence(uuid,date,date,integer,jsonb) to service_role;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  event_key text not null,
  subject text not null,
  body text not null,
  preference text not null default 'newExpenses',
  status text not null default 'pending' check(status in ('pending','processing','sent','skipped')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique(user_id,event_key)
);
alter table public.notification_outbox enable row level security;
create index notification_pending_idx on public.notification_outbox(available_at) where status in ('pending','processing');
create or replace function public.queue_expense_notice() returns trigger language plpgsql security definer set search_path = public as $$
declare e public.expenses;
begin
  select * into e from public.expenses where id = new.expense_id;
  insert into public.notification_outbox(user_id,group_id,event_key,subject,body)
    select m.user_id,e.group_id,'expense-history:'||new.id,
      case when new.action = 'deleted' then 'Expense deleted' when new.action = 'created' then 'New household expense' else 'Expense updated' end,
      e.description || ' · ' || e.currency || ' ' || (e.total_amount_minor::numeric/100)::text
    from public.group_members m where m.group_id = e.group_id and m.user_id <> new.changed_by
    on conflict(user_id,event_key) do nothing;
  return new;
end $$;
create trigger expense_notification after insert on public.expense_history for each row execute function public.queue_expense_notice();
revoke all on function public.queue_expense_notice() from public, anon, authenticated;

create or replace function public.queue_settlement_notice() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'settle' then
    insert into public.notification_outbox(user_id,group_id,event_key,subject,body,preference)
      select m.user_id,new.group_id,'settlement-activity:'||new.id,'Settlement recorded',new.detail,'settlements'
      from public.group_members m where m.group_id = new.group_id and m.user_id <> new.user_id
      on conflict(user_id,event_key) do nothing;
  end if;
  return new;
end $$;
create trigger settlement_notification after insert on public.activities for each row execute function public.queue_settlement_notice();
revoke all on function public.queue_settlement_notice() from public, anon, authenticated;

create or replace function public.claim_notifications(p_limit integer default 20)
returns setof public.notification_outbox language sql security definer set search_path = public as $$
  update public.notification_outbox set status = 'processing', lease_until = now()+interval '5 minutes', attempts = attempts+1
  where id in (select id from public.notification_outbox where available_at <= now() and attempts < 8
    and (status = 'pending' or (status = 'processing' and lease_until < now())) order by available_at for update skip locked limit least(p_limit,100)) returning *;
$$;
revoke all on function public.claim_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_notifications(integer) to service_role;

-- Receipt objects are accessed through the authorized API, never public URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('expense-receipts','expense-receipts',false,5242880,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
