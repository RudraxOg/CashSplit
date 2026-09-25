-- Secure, single-use group invitations. Membership is created only after the
-- invited account accepts the invite.
create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invited_email text not null check (char_length(invited_email) between 3 and 254),
  invited_user_id uuid references public.profiles(id) on delete set null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists group_invites_one_pending_email
  on public.group_invites(group_id, lower(invited_email))
  where status = 'pending';
create index if not exists group_invites_email_idx on public.group_invites(lower(invited_email), status);
create index if not exists group_invites_token_idx on public.group_invites(token_hash);

alter table public.group_invites enable row level security;

drop policy if exists group_invites_sender_read on public.group_invites;
create policy group_invites_sender_read on public.group_invites
  for select using (invited_by = auth.uid() or invited_user_id = auth.uid() or lower(invited_email) = lower(auth.jwt()->>'email'));

drop policy if exists group_invites_member_insert on public.group_invites;
create policy group_invites_member_insert on public.group_invites
  for insert with check (invited_by = auth.uid() and public.is_group_member(group_id));
