-- Privileged bundle writers are backend-only. SECURITY DEFINER functions
-- otherwise inherit PostgreSQL's default EXECUTE grant to PUBLIC.
revoke all on function public.create_expense_bundle(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_expense_bundle(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

revoke all on function public.update_expense_bundle(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.update_expense_bundle(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

-- Prevent browser roles from invoking auth bootstrap directly.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Persist notification preferences even before delivery providers are added.
alter table public.profiles
  add column if not exists notification_preferences jsonb not null default
  '{"newExpenses":true,"choreReminders":true,"weeklyDigest":false}'::jsonb;
