-- 005_web_mvp.sql
-- Everything the web MVP needs. Safe to run more than once, on a fresh project
-- or on one that already has 001–004 applied.

-- ---------- tables (no-ops if 001–004 already ran) ----------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text,
  timezone text default 'UTC',
  din_tier text default 'free' check (din_tier in ('free','pro')),
  expo_push_token text,
  created_at timestamptz default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
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
create index if not exists tasks_user_date_idx on public.tasks(user_id, scheduled_date);
create table if not exists public.din_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  completion_pct float not null default 0,
  streak_day int not null default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade,
  type text not null,
  sent_at timestamptz default now()
);

-- ---------- new columns for the assessment and execution window ----------
alter table public.users add column if not exists execution_profile text
  check (execution_profile in ('A','P','D','S'));      -- Avoider, Perfectionist, Drifter, Sprinter
alter table public.users add column if not exists assessment_answers text[];
alter table public.users add column if not exists onboarded_at timestamptz;
alter table public.tasks add column if not exists delays int not null default 0;

-- notification types now include 'complete'
alter table public.notification_logs drop constraint if exists notification_logs_type_check;
alter table public.notification_logs add constraint notification_logs_type_check
  check (type in ('start','delay','miss','recovery','complete'));

-- ---------- deleting a login also deletes that person's DIN data ----------
delete from public.users u where not exists (select 1 from auth.users a where a.id = u.id);
alter table public.users drop constraint if exists users_id_fkey;
alter table public.users add constraint users_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- ---------- create a profile row whenever someone signs up ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, role, timezone)
  values (new.id, new.email,
          new.raw_user_meta_data->>'name',
          new.raw_user_meta_data->>'role',
          coalesce(new.raw_user_meta_data->>'timezone','UTC'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- row-level security: each user sees only their own data ----------
alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.din_scores enable row level security;
alter table public.notification_logs enable row level security;

drop policy if exists "users can read own row" on public.users;
drop policy if exists "users can update own row" on public.users;
drop policy if exists "users can insert own row" on public.users;
create policy "users can read own row" on public.users for select using (auth.uid() = id);
create policy "users can update own row" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users can insert own row" on public.users for insert with check (auth.uid() = id);

drop policy if exists "users manage own tasks" on public.tasks;
create policy "users manage own tasks" on public.tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users read own scores" on public.din_scores;
create policy "users read own scores" on public.din_scores for select using (auth.uid() = user_id);

drop policy if exists "users read own notif logs" on public.notification_logs;
drop policy if exists "users insert own notif logs" on public.notification_logs;
create policy "users read own notif logs" on public.notification_logs for select using (auth.uid() = user_id);
create policy "users insert own notif logs" on public.notification_logs for insert with check (auth.uid() = user_id);
