create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  title text not null,
  scheduled_date date not null,
  scheduled_time time not null,
  priority text default 'medium' check (priority in ('low','medium','high')),
  is_recurring boolean default false,
  recurrence_rule text,
  status text default 'pending' check (status in ('pending','completed','missed')),
  completed_at timestamptz,
  created_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "users manage own tasks" on tasks for all using (auth.uid() = user_id);
create index on tasks(user_id, scheduled_date);
