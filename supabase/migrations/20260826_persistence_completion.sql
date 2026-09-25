-- Completes the persistence model used by the RoomMate API.
-- Apply after 20260825_initial_schema.sql.

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  source text not null check (char_length(source) between 1 and 120),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  added_by uuid not null references public.profiles(id),
  income_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  purchased boolean not null default false,
  purchased_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.chores add column if not exists deleted_at timestamptz;
alter table public.expense_items enable row level security;
alter table public.expense_item_shares enable row level security;
alter table public.expense_history enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.incomes enable row level security;
alter table public.shopping_items enable row level security;

create index if not exists incomes_group_date_idx on public.incomes(group_id, income_date desc) where deleted_at is null;
create index if not exists shopping_group_created_idx on public.shopping_items(group_id, created_at desc) where deleted_at is null;
create index if not exists expense_shares_expense_idx on public.expense_shares(expense_id);
create index if not exists expense_payers_expense_idx on public.expense_payers(expense_id);
create index if not exists settlements_group_date_idx on public.settlements(group_id, settled_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expenses_touch_updated_at on public.expenses;
create trigger expenses_touch_updated_at before update on public.expenses
for each row execute function public.touch_updated_at();
drop trigger if exists incomes_touch_updated_at on public.incomes;
create trigger incomes_touch_updated_at before update on public.incomes
for each row execute function public.touch_updated_at();
drop trigger if exists shopping_touch_updated_at on public.shopping_items;
create trigger shopping_touch_updated_at before update on public.shopping_items
for each row execute function public.touch_updated_at();

-- Read policies are intentionally group-scoped. The API uses the service role,
-- but these policies protect the tables if a browser client is introduced later.
drop policy if exists incomes_member_read on public.incomes;
create policy incomes_member_read on public.incomes for select using (public.is_group_member(group_id));
drop policy if exists shopping_member_read on public.shopping_items;
create policy shopping_member_read on public.shopping_items for select using (public.is_group_member(group_id));
drop policy if exists expense_items_member_read on public.expense_items;
create policy expense_items_member_read on public.expense_items for select using (exists (select 1 from public.expenses e where e.id = expense_id and (e.group_id is null or public.is_group_member(e.group_id))));
drop policy if exists expense_item_shares_member_read on public.expense_item_shares;
create policy expense_item_shares_member_read on public.expense_item_shares for select using (exists (select 1 from public.expense_items i join public.expenses e on e.id = i.expense_id where i.id = item_id and (e.group_id is null or public.is_group_member(e.group_id))));
drop policy if exists expense_history_member_read on public.expense_history;
create policy expense_history_member_read on public.expense_history for select using (exists (select 1 from public.expenses e where e.id = expense_id and (e.group_id is null or public.is_group_member(e.group_id))));

-- These RPCs make multi-table expense writes atomic. The API calls them with
-- the service role after it has checked membership and validated the payload.
create or replace function public.create_expense_bundle(
  p_expense jsonb,
  p_payers jsonb,
  p_shares jsonb,
  p_items jsonb default '[]'::jsonb,
  p_item_shares jsonb default '[]'::jsonb,
  p_history jsonb default null,
  p_activity jsonb default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare expense_id uuid;
begin
  insert into expenses (group_id, description, total_amount_minor, currency, category_id, split_type, expense_kind, expense_date, created_by, notes)
  values ((p_expense->>'group_id')::uuid, p_expense->>'description', (p_expense->>'total_amount_minor')::bigint,
    coalesce(p_expense->>'currency', 'INR'), p_expense->>'category_id', p_expense->>'split_type',
    coalesce(p_expense->>'expense_kind', 'NORMAL'), coalesce((p_expense->>'expense_date')::date, current_date),
    (p_expense->>'created_by')::uuid, p_expense->>'notes')
  returning id into expense_id;

  insert into expense_payers (expense_id, user_id, paid_amount_minor)
    select expense_id, (value->>'user_id')::uuid, (value->>'paid_amount_minor')::bigint from jsonb_array_elements(p_payers);
  insert into expense_shares (expense_id, user_id, owed_amount_minor, share_value, percent_value, adjustment_value_minor)
    select expense_id, (value->>'user_id')::uuid, (value->>'owed_amount_minor')::bigint,
      nullif(value->>'share_value','')::numeric, nullif(value->>'percent_value','')::numeric, nullif(value->>'adjustment_value_minor','')::bigint
    from jsonb_array_elements(p_shares);
  insert into expense_items (expense_id, name, price_minor)
    select expense_id, value->>'name', (value->>'price_minor')::bigint from jsonb_array_elements(p_items);
  if p_history is not null then insert into expense_history (expense_id, changed_by, action, snapshot) values (expense_id, (p_history->>'changed_by')::uuid, p_history->>'action', p_history->'snapshot'); end if;
  if p_activity is not null then insert into activities (group_id, user_id, kind, ref_type, ref_id, text, detail) values ((p_activity->>'group_id')::uuid, (p_activity->>'user_id')::uuid, p_activity->>'kind', 'expense', expense_id, p_activity->>'text', p_activity->>'detail'); end if;
  return expense_id;
end;
$$;

create or replace function public.update_expense_bundle(
  p_expense_id uuid,
  p_expense jsonb,
  p_payers jsonb,
  p_shares jsonb,
  p_items jsonb default '[]'::jsonb,
  p_history jsonb default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare updated_id uuid;
begin
  update expenses set description = p_expense->>'description', total_amount_minor = (p_expense->>'total_amount_minor')::bigint,
    currency = coalesce(p_expense->>'currency', currency), category_id = p_expense->>'category_id', split_type = p_expense->>'split_type',
    expense_kind = coalesce(p_expense->>'expense_kind', expense_kind), expense_date = coalesce((p_expense->>'expense_date')::date, expense_date),
    notes = p_expense->>'notes', version = version + 1 where id = p_expense_id and deleted_at is null returning id into updated_id;
  if updated_id is null then raise exception 'expense not found or already deleted' using errcode = 'P0002'; end if;
  delete from expense_payers where expense_id = updated_id;
  delete from expense_shares where expense_id = updated_id;
  delete from expense_items where expense_id = updated_id;
  insert into expense_payers (expense_id, user_id, paid_amount_minor) select updated_id, (value->>'user_id')::uuid, (value->>'paid_amount_minor')::bigint from jsonb_array_elements(p_payers);
  insert into expense_shares (expense_id, user_id, owed_amount_minor, share_value, percent_value, adjustment_value_minor)
    select updated_id, (value->>'user_id')::uuid, (value->>'owed_amount_minor')::bigint, nullif(value->>'share_value','')::numeric, nullif(value->>'percent_value','')::numeric, nullif(value->>'adjustment_value_minor','')::bigint from jsonb_array_elements(p_shares);
  insert into expense_items (expense_id, name, price_minor) select updated_id, value->>'name', (value->>'price_minor')::bigint from jsonb_array_elements(p_items);
  if p_history is not null then insert into expense_history (expense_id, changed_by, action, snapshot) values (updated_id, (p_history->>'changed_by')::uuid, p_history->>'action', p_history->'snapshot'); end if;
  return updated_id;
end;
$$;
