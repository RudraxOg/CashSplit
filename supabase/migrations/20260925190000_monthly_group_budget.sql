-- The budget belongs to the household, so every member sees the same amount.
-- A single value is reused each month until a member changes it.
alter table public.groups
  add column if not exists monthly_budget_minor bigint not null default 3000000;

alter table public.groups
  add constraint groups_monthly_budget_positive_check
  check (monthly_budget_minor > 0);
