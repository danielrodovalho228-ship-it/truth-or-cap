-- ============================================================================
-- Migration 0011: notifications system (preferences + push subs + outbox)
-- ============================================================================

-- One row per user, per notification kind. Default ON for everything except
-- weekly_digest (off-by-default to avoid spam).
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Email channel toggles
  email_friend_joined boolean not null default true,
  email_voted_on_you boolean not null default true,
  email_result_revealed boolean not null default true,
  email_qotd_daily boolean not null default true,
  email_streak_reminder boolean not null default true,
  email_weekly_digest boolean not null default false,
  email_room_invite boolean not null default true,
  email_marketing boolean not null default false, -- requires explicit opt-in
  -- Push channel toggles
  push_friend_joined boolean not null default true,
  push_voted_on_you boolean not null default true,
  push_result_revealed boolean not null default true,
  push_qotd_daily boolean not null default false, -- noisy
  push_streak_reminder boolean not null default true,
  push_room_invite boolean not null default true,
  -- locale for templating
  locale text not null default 'pt',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Self read prefs" on public.notification_preferences;
create policy "Self read prefs"
  on public.notification_preferences for select
  using (user_id = auth.uid());

drop policy if exists "Self update prefs" on public.notification_preferences;
create policy "Self update prefs"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-create default prefs row on signup
create or replace function public.create_default_prefs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_preferences (user_id) values (new.id)
    on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_create_default_prefs on auth.users;
create trigger trg_create_default_prefs
  after insert on auth.users
  for each row execute function public.create_default_prefs();

-- Web Push subscriptions (one user can have multiple devices)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Self read subs" on public.push_subscriptions;
create policy "Self read subs"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "Self insert subs" on public.push_subscriptions;
create policy "Self insert subs"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "Self delete subs" on public.push_subscriptions;
create policy "Self delete subs"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- Notification outbox / log: every email or push we sent, for dedup + audit.
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null,
  channel text not null check (channel in ('email','push','in_app')),
  status text not null default 'pending'
    check (status in ('pending','sent','failed','skipped')),
  -- Dedup key, e.g. "voted_on_you:{round_id}:{voter_id}".
  -- Unique constraint prevents double-send on retries.
  dedup_key text,
  payload jsonb,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create unique index if not exists notification_log_dedup_idx
  on public.notification_log(dedup_key) where dedup_key is not null;
create index if not exists notification_log_user_idx
  on public.notification_log(user_id, created_at desc);

alter table public.notification_log enable row level security;

drop policy if exists "Self read log" on public.notification_log;
create policy "Self read log"
  on public.notification_log for select
  using (user_id = auth.uid());

-- VAPID public key + sender identity stashed in a config table so we can
-- rotate without redeploying. Service role only.
create table if not exists public.notification_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.notification_config enable row level security;
-- No SELECT/INSERT policies: only service role reads/writes.

-- ============================================================================
-- DONE.
-- ============================================================================
