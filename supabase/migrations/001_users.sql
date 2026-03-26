create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text,
  timezone text default 'UTC',
  din_tier text default 'free' check (din_tier in ('free','pro')),
  expo_push_token text,
  created_at timestamptz default now()
);
alter table users enable row level security;
create policy "users can read own row" on users for select using (auth.uid() = id);
create policy "users can update own row" on users for update using (auth.uid() = id);
