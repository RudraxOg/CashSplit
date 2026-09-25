-- Shared expenses use the existing expenses, expense_payers and expense_shares
-- tables. New expenses must belong to a household. NOT VALID allows legacy
-- orphaned rows to be reviewed and assigned before full validation.
alter table public.expenses
  add constraint expenses_group_required_check check (group_id is not null) not valid;
