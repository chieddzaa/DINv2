create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade,
  type text check (type in ('start','delay','miss','recovery')) not null,
  sent_at timestamptz default now()
);
alter table notification_logs enable row level security;
create policy "users read own notif logs" on notification_logs for select using (auth.uid() = user_id);
