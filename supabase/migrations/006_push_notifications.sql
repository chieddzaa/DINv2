-- 006_push_notifications.sql: phone notifications when the app is closed.
-- Safe to run more than once.

-- each device that turned on notifications
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "users manage own push subscriptions" on public.push_subscriptions;
create policy "users manage own push subscriptions" on public.push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- each nudge is sent once per task (the app and the server share this log)
delete from public.notification_logs a using public.notification_logs b
  where a.task_id is not null and a.task_id = b.task_id and a.type = b.type and a.ctid > b.ctid;
alter table public.notification_logs drop constraint if exists notification_logs_task_type_key;
alter table public.notification_logs add constraint notification_logs_task_type_key unique (task_id, type);

-- scheduler + HTTP calls from the database
create extension if not exists pg_cron;
create extension if not exists pg_net;
