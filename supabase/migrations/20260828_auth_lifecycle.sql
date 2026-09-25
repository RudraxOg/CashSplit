-- Supabase Auth lifecycle: public profile mirror and safe household visibility.
alter table public.profiles add column if not exists color text default '#16A67A';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'RoomMate user'), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

drop policy if exists profiles_member_read on public.profiles;
create policy profiles_member_read on public.profiles for select using (
  id = auth.uid() or id in (
    select gm2.user_id from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid()
  )
);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists expenses_member_insert on public.expenses;
create policy expenses_member_insert on public.expenses for insert with check (created_by = auth.uid() and public.is_group_member(group_id));
drop policy if exists expenses_member_update on public.expenses;
create policy expenses_member_update on public.expenses for update using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
drop policy if exists expense_payers_member_write on public.expense_payers;
create policy expense_payers_member_write on public.expense_payers for all using (exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id))) with check (exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id)));
drop policy if exists expense_shares_member_write on public.expense_shares;
create policy expense_shares_member_write on public.expense_shares for all using (exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id))) with check (exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id)));
drop policy if exists chores_member_write on public.chores;
create policy chores_member_write on public.chores for all using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
drop policy if exists settlements_member_write on public.settlements;
create policy settlements_member_write on public.settlements for insert with check (public.is_group_member(group_id));
drop policy if exists comments_member_write on public.comments;
create policy comments_member_write on public.comments for insert with check (user_id = auth.uid() and exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id)));
drop policy if exists incomes_member_write on public.incomes;
create policy incomes_member_write on public.incomes for all using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
drop policy if exists shopping_member_write on public.shopping_items;
create policy shopping_member_write on public.shopping_items for all using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
