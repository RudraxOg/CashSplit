-- Income is separate from the shared expense ledger. Existing rows were
-- recorded without an owner field; added_by is the only stored attribution.
-- Backfill those rows as personal income so they never inflate household
-- income. Review legacy ownership in the app if someone entered another
-- member's income before this migration.
alter table public.incomes
  add column if not exists income_type text not null default 'PERSONAL',
  add column if not exists owner_user_id uuid references public.profiles(id);

update public.incomes
set owner_user_id = added_by
where income_type = 'PERSONAL' and owner_user_id is null;

alter table public.incomes
  drop constraint if exists incomes_income_type_owner_check;

alter table public.incomes
  add constraint incomes_income_type_owner_check check (
    (income_type = 'PERSONAL' and owner_user_id is not null)
    or (income_type = 'HOUSEHOLD' and owner_user_id is null)
  );

alter table public.incomes
  drop constraint if exists incomes_income_type_check;

alter table public.incomes
  add constraint incomes_income_type_check check (income_type in ('PERSONAL', 'HOUSEHOLD'));

create index if not exists incomes_group_type_date_idx
  on public.incomes (group_id, income_type, income_date desc)
  where deleted_at is null;

create index if not exists incomes_owner_idx
  on public.incomes (owner_user_id)
  where owner_user_id is not null;
