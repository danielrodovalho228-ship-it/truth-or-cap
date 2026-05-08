-- ============================================================================
-- Migration 0026: XP, levels, streaks + Friends Leaderboard
--
-- Adds:
--   * user_xp        — denormalized totals per user (1 row per user, fast read)
--   * xp_events      — append-only log of every XP award (audit + weekly window)
--   * record_daily_play(uuid) — bumps streak + awards daily_bonus once per day
--   * award_xp(...)            — generic event award (applies streak multiplier)
--   * get_friends_leaderboard(period) — leaderboard rows for caller + friends
--   * trigger to auto-create user_xp row on auth.users insert
--
-- XP values (mirrored in lib/xp.ts):
--   game_complete   = 50
--   correct_verdict = 25
--   daily_bonus     = 100
--   friend_play     = 25
-- Streak multiplier: 1.5x once current_streak >= 3.
--
-- Levels (formula in app + view): L = floor(sqrt(total_xp / 100)) + 1
--   L1: 0–99, L2: 100–399, L3: 400–899, L4: 900–1599, L5: 1600–2499 …
-- ============================================================================

-- 1. user_xp
create table if not exists public.user_xp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp int not null default 0 check (total_xp >= 0),
  current_level int not null default 1 check (current_level >= 1),
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_played_on date,                 -- last calendar day a play counted
  last_daily_bonus_on date,            -- dedup the daily login bonus
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_xp enable row level security;

-- Owner can read their own row. Friends rely on the RPC for leaderboards.
drop policy if exists "Self read xp" on public.user_xp;
create policy "Self read xp"
  on public.user_xp for select
  using (auth.uid() = user_id);

-- No client-side INSERT / UPDATE. Mutations only via SECURITY DEFINER RPCs.
-- (No INSERT / UPDATE / DELETE policies → RLS rejects everything else.)

create or replace function public.user_xp_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists user_xp_updated_at on public.user_xp;
create trigger user_xp_updated_at
  before update on public.user_xp
  for each row execute function public.user_xp_set_updated_at();

-- 2. xp_events (append-only log)
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in (
    'game_complete', 'correct_verdict', 'daily_bonus',
    'friend_play', 'streak_milestone'
  )),
  base_amount int not null check (base_amount >= 0),
  multiplier numeric(4,2) not null default 1.0 check (multiplier >= 1.0),
  amount int not null check (amount >= 0),
  context jsonb,
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_created_idx
  on public.xp_events(user_id, created_at desc);

alter table public.xp_events enable row level security;

drop policy if exists "Self read xp events" on public.xp_events;
create policy "Self read xp events"
  on public.xp_events for select
  using (auth.uid() = user_id);
-- No INSERT policy → only SECURITY DEFINER RPCs can write.

-- 3. Backfill rows for existing users + auto-create on signup.
insert into public.user_xp (user_id)
  select id from auth.users
  where id not in (select user_id from public.user_xp)
on conflict do nothing;

create or replace function public.handle_new_user_xp()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  insert into public.user_xp (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_user_xp_init on auth.users;
create trigger trg_user_xp_init
  after insert on auth.users
  for each row execute function public.handle_new_user_xp();

-- 4. Internal helper: compute level from total_xp.
create or replace function public.xp_level_for(p_total_xp int)
returns int language sql immutable as $$
  select greatest(1, floor(sqrt(greatest(p_total_xp, 0)::numeric / 100.0))::int + 1);
$$;

-- 5. award_xp: generic XP event. Applies streak multiplier (1.5x at >=3 days)
--    and updates totals + level. Returns the new state.
create or replace function public.award_xp(
  p_reason text,
  p_base_amount int,
  p_context jsonb default null
)
returns table (
  total_xp int,
  current_level int,
  amount_awarded int,
  multiplier numeric,
  current_streak int
)
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_user uuid := auth.uid();
  v_streak int;
  v_mult numeric(4,2) := 1.0;
  v_amount int;
  v_new_total int;
  v_new_level int;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if p_reason not in (
    'game_complete','correct_verdict','daily_bonus','friend_play','streak_milestone'
  ) then
    raise exception 'invalid reason: %', p_reason using errcode = '22023';
  end if;
  if p_base_amount is null or p_base_amount < 0 or p_base_amount > 1000 then
    raise exception 'base_amount out of range' using errcode = '22023';
  end if;

  -- Lock the user's row (creates if missing — defensive against trigger gaps).
  insert into public.user_xp (user_id) values (v_user) on conflict do nothing;
  select current_streak into v_streak from public.user_xp
    where user_id = v_user for update;

  if coalesce(v_streak, 0) >= 3 then
    v_mult := 1.5;
  end if;

  v_amount := floor(p_base_amount * v_mult)::int;

  insert into public.xp_events (user_id, reason, base_amount, multiplier, amount, context)
    values (v_user, p_reason, p_base_amount, v_mult, v_amount, p_context);

  update public.user_xp
     set total_xp = total_xp + v_amount,
         current_level = public.xp_level_for(total_xp + v_amount)
   where user_id = v_user
   returning user_xp.total_xp, user_xp.current_level into v_new_total, v_new_level;

  total_xp := v_new_total;
  current_level := v_new_level;
  amount_awarded := v_amount;
  multiplier := v_mult;
  current_streak := coalesce(v_streak, 0);
  return next;
end $$;

revoke execute on function public.award_xp(text, int, jsonb) from public, anon;
grant execute on function public.award_xp(text, int, jsonb) to authenticated;

-- 6. award_xp_for_user: service-role variant for server-side awards keyed by
--    user id (e.g. host reveal awards XP to the round's prompter, not caller).
create or replace function public.award_xp_for_user(
  p_user_id uuid,
  p_reason text,
  p_base_amount int,
  p_context jsonb default null
)
returns table (
  total_xp int,
  current_level int,
  amount_awarded int,
  multiplier numeric,
  current_streak int
)
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_streak int;
  v_mult numeric(4,2) := 1.0;
  v_amount int;
  v_new_total int;
  v_new_level int;
begin
  if p_user_id is null then
    raise exception 'user_id required' using errcode = '22023';
  end if;
  if p_reason not in (
    'game_complete','correct_verdict','daily_bonus','friend_play','streak_milestone'
  ) then
    raise exception 'invalid reason' using errcode = '22023';
  end if;
  if p_base_amount is null or p_base_amount < 0 or p_base_amount > 1000 then
    raise exception 'base_amount out of range' using errcode = '22023';
  end if;

  insert into public.user_xp (user_id) values (p_user_id) on conflict do nothing;
  select current_streak into v_streak from public.user_xp
    where user_id = p_user_id for update;

  if coalesce(v_streak, 0) >= 3 then
    v_mult := 1.5;
  end if;
  v_amount := floor(p_base_amount * v_mult)::int;

  insert into public.xp_events (user_id, reason, base_amount, multiplier, amount, context)
    values (p_user_id, p_reason, p_base_amount, v_mult, v_amount, p_context);

  update public.user_xp
     set total_xp = total_xp + v_amount,
         current_level = public.xp_level_for(total_xp + v_amount)
   where user_id = p_user_id
   returning user_xp.total_xp, user_xp.current_level into v_new_total, v_new_level;

  total_xp := v_new_total;
  current_level := v_new_level;
  amount_awarded := v_amount;
  multiplier := v_mult;
  current_streak := coalesce(v_streak, 0);
  return next;
end $$;

revoke execute on function public.award_xp_for_user(uuid, text, int, jsonb)
  from public, anon, authenticated;
-- Service role only.

-- 7. record_daily_play: idempotent per UTC day.
--    Updates streak based on (today - last_played_on) and awards the
--    daily_bonus on the first call of the day. Safe to call on every page
--    load — second+ calls return the unchanged state.
create or replace function public.record_daily_play()
returns table (
  current_streak int,
  longest_streak int,
  awarded_daily_bonus boolean,
  total_xp int,
  current_level int
)
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_row record;
  v_new_streak int;
  v_new_longest int;
  v_did_bonus boolean := false;
  v_bonus_total int;
  v_bonus_level int;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  insert into public.user_xp (user_id) values (v_user) on conflict do nothing;
  select * into v_row from public.user_xp where user_id = v_user for update;

  -- Streak math against UTC calendar day.
  if v_row.last_played_on is null then
    v_new_streak := 1;
  elsif v_row.last_played_on = v_today then
    v_new_streak := v_row.current_streak;            -- already counted today
  elsif v_row.last_played_on = v_today - interval '1 day' then
    v_new_streak := v_row.current_streak + 1;        -- consecutive day
  else
    v_new_streak := 1;                               -- gap → reset
  end if;
  v_new_longest := greatest(v_row.longest_streak, v_new_streak);

  update public.user_xp
     set current_streak = v_new_streak,
         longest_streak = v_new_longest,
         last_played_on = v_today
   where user_id = v_user;

  -- Daily bonus: only once per UTC day.
  if v_row.last_daily_bonus_on is distinct from v_today then
    update public.user_xp
       set last_daily_bonus_on = v_today
     where user_id = v_user;
    -- Award the bonus AFTER the streak update so the multiplier applies.
    select t.total_xp, t.current_level into v_bonus_total, v_bonus_level
      from public.award_xp_for_user(v_user, 'daily_bonus', 100,
        jsonb_build_object('date', v_today)) as t;
    v_did_bonus := true;
  end if;

  current_streak := v_new_streak;
  longest_streak := v_new_longest;
  awarded_daily_bonus := v_did_bonus;
  if v_did_bonus then
    total_xp := v_bonus_total;
    current_level := v_bonus_level;
  else
    select user_xp.total_xp, user_xp.current_level
      into total_xp, current_level
      from public.user_xp where user_id = v_user;
  end if;
  return next;
end $$;

revoke execute on function public.record_daily_play() from public, anon;
grant execute on function public.record_daily_play() to authenticated;

-- 8. Friends Leaderboard: caller + their friends, ranked by XP (period filter).
--    SECURITY DEFINER so it can read user_xp rows behind RLS, but it only
--    returns rows for the caller's own friend set.
create or replace function public.get_friends_leaderboard(p_period text default 'all_time')
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  total_xp int,
  current_level int,
  current_streak int,
  longest_streak int,
  weekly_xp int,
  is_self boolean
)
language plpgsql security definer stable set search_path = public, pg_catalog as $$
declare
  v_user uuid := auth.uid();
  v_since timestamptz := now() - interval '7 days';
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if p_period not in ('all_time','weekly') then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  return query
  with circle as (
    select v_user as id
    union
    select friend_id from public.friendships where user_id = v_user
  ),
  weekly as (
    select e.user_id, coalesce(sum(e.amount), 0)::int as wxp
      from public.xp_events e
     where e.created_at >= v_since
       and e.user_id in (select id from circle)
     group by e.user_id
  )
  select
    p.id,
    p.username,
    p.avatar_url,
    coalesce(x.total_xp, 0),
    coalesce(x.current_level, 1),
    coalesce(x.current_streak, 0),
    coalesce(x.longest_streak, 0),
    coalesce(w.wxp, 0),
    p.id = v_user
  from public.profiles p
  join circle c on c.id = p.id
  left join public.user_xp x on x.user_id = p.id
  left join weekly w on w.user_id = p.id
  order by
    case when p_period = 'weekly'
      then coalesce(w.wxp, 0)
      else coalesce(x.total_xp, 0)
    end desc,
    coalesce(x.current_streak, 0) desc,
    p.username asc
  limit 100;
end $$;

revoke execute on function public.get_friends_leaderboard(text) from public, anon;
grant execute on function public.get_friends_leaderboard(text) to authenticated;

-- ============================================================================
-- DONE.
-- ============================================================================
