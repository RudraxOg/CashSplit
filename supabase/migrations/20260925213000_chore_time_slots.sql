-- A chore may be planned for a specific wall-clock time or left as an anytime task.
alter table public.chores
  add column if not exists start_time time without time zone,
  add column if not exists duration_minutes integer;

alter table public.chores
  add constraint chores_time_slot_pair_check
  check ((start_time is null) = (duration_minutes is null));

alter table public.chores
  add constraint chores_time_slot_range_check
  check (
    start_time is null or (
      duration_minutes between 1 and 720
      and extract(hour from start_time) * 60
        + extract(minute from start_time)
        + extract(second from start_time) / 60
        + duration_minutes <= 1440
    )
  );

create index if not exists chores_group_day_time_idx
  on public.chores (group_id, due_date, start_time)
  where deleted_at is null;
