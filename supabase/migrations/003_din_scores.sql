create table din_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  date date not null,
  completion_pct float not null default 0,
  streak_day int not null default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table din_scores enable row level security;
create policy "users read own scores" on din_scores for select using (auth.uid() = user_id);
