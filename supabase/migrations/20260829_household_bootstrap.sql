-- Bootstrap a household for existing users and automatically create one for
-- every new Supabase Auth user. The frontend may still request the legacy
-- "g1" group; the backend resolves that alias to the first real UUID group.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  household_id uuid;
  trial_start timestamptz := now();
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'RoomMate user'
  );

  insert into public.profiles (id, name, email)
  values (new.id, display_name, new.email)
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email;

  insert into public.groups (
    name, simplify_debts, plan, trial_started_at, trial_ends_at, max_members
  )
  values (
    display_name || '''s Household',
    false,
    'PLUS',
    trial_start,
    trial_start + interval '14 days',
    5
  )
  returning id into household_id;

  insert into public.group_members (group_id, user_id)
  values (household_id, new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

do $$
declare
  household_id uuid;
  profile_row record;
begin
  select id into household_id
  from public.groups
  order by created_at
  limit 1;

  if household_id is null then
    insert into public.groups (
      name, simplify_debts, plan, trial_started_at, trial_ends_at, max_members
    )
    values (
      'My Household',
      false,
      'PLUS',
      now(),
      now() + interval '14 days',
      5
    )
    returning id into household_id;
  end if;

  for profile_row in
    select id from public.profiles
  loop
    insert into public.group_members (group_id, user_id)
    values (household_id, profile_row.id)
    on conflict do nothing;
  end loop;
end;
$$;
