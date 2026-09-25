-- Existing expenses have been checked for null group_id values. Mark the
-- previously added constraint validated so it covers the whole ledger.
alter table public.expenses
  validate constraint expenses_group_required_check;
