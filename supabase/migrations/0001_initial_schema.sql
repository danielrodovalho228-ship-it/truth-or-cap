-- ============================================================================
-- Truth or Cap — Initial schema migration
-- Apply this in Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================================
-- PROFILES (auto-created on auth signup via trigger)
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  phone_hash text,
  voice_baseline_features jsonb,
  voice_baseline_at timestamptz,
  current_streak int not null default 0,
  streak_protected_until timestamptz,
  total_invites_sent int not null default 0,
  total_invites_redeemed int not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists profiles_phone_hash_idx on public.profiles(phone_hash) where phone_hash is not null;

-- Auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      'user_' || substr(new.id::text, 1, 8)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- GAMES (each recording)
-- ============================================================================

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  player_username text not null,
  question text not null check (char_length(question) <= 500),
  declared_answer text not null check (declared_answer in ('truth', 'cap')),
  recording_url text not null,
  recording_duration_ms int not null check (recording_duration_ms between 1000 and 60000),
  is_public boolean not null default true,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists games_player_id_idx on public.games(player_id);
create index if not exists games_created_at_idx on public.games(created_at desc);
create index if not exists games_public_recent_idx on public.games(is_public, created_at desc) where is_public = true;

-- ============================================================================
-- ANALYSES (AI lie detector results)
-- ============================================================================

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade unique,
  sus_level int not null check (sus_level between 0 and 100),
  voice_stress_score int check (voice_stress_score between 0 and 100),
  facial_score int check (facial_score between 0 and 100),
  linguistic_score int check (linguistic_score between 0 and 100),
  transcription text,
  reasons jsonb not null default '[]',
  raw_voice_data jsonb,
  raw_facial_data jsonb,
  model_version text not null default 'mvp_v1',
  processing_time_ms int,
  created_at timestamptz not null default now()
);

create index if not exists analyses_game_id_idx on public.analyses(game_id);

-- ============================================================================
-- VOTES (truth/cap crowd voting)
-- ============================================================================

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  voter_id uuid references auth.users(id) on delete cascade,
  voter_ip_hash text,
  vote text not null check (vote in ('truth', 'cap')),
  created_at timestamptz not null default now()
);

create index if not exists votes_game_id_idx on public.votes(game_id);

-- Unique constraint per (game, voter) — handles both authed and anonymous
create unique index if not exists votes_game_user_unique 
  on public.votes(game_id, voter_id) 
  where voter_id is not null;

create unique index if not exists votes_game_ip_unique 
  on public.votes(game_id, voter_ip_hash) 
  where voter_id is null and voter_ip_hash is not null;

-- ============================================================================
-- INVITATIONS (referral codes)
-- ============================================================================

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_phone_hash text,
  invitee_email text,
  invite_code text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  channel text check (channel in ('whatsapp', 'sms', 'copy', 'qr', 'native_share')),
  context text check (context in ('curiosity', 'streak', 'challenge', 'group', 'leaderboard', 'manual')),
  source_game_id uuid references public.games(id) on delete set null,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists invitations_inviter_idx on public.invitations(inviter_id);
create index if not exists invitations_phone_hash_idx on public.invitations(invitee_phone_hash) where invitee_phone_hash is not null;
create index if not exists invitations_code_idx on public.invitations(invite_code);

-- RPC to atomically increment invites sent counter
create or replace function public.increment_invites_sent(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set total_invites_sent = total_invites_sent + 1
  where id = p_user_id;
end;
$$;

-- ============================================================================
-- FRIENDSHIPS (mutual)
-- ============================================================================

create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  source text check (source in ('contact', 'invite', 'username_search', 'qr')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id != friend_id)
);

create index if not exists friendships_user_idx on public.friendships(user_id);
create index if not exists friendships_friend_idx on public.friendships(friend_id);

-- View: friend stats (detection accuracy per friendship)
create or replace view public.friend_stats as
select 
  f.user_id,
  f.friend_id,
  count(distinct g.id) as games_against,
  coalesce(
    avg(case when v.vote = g.declared_answer then 1.0 else 0.0 end),
    0
  ) as detection_accuracy,
  max(g.created_at) as last_played_at
from public.friendships f
left join public.games g on g.player_id = f.friend_id
left join public.votes v on v.game_id = g.id and v.voter_id = f.user_id
group by f.user_id, f.friend_id;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.analyses enable row level security;
alter table public.votes enable row level security;
alter table public.invitations enable row level security;
alter table public.friendships enable row level security;

-- Profiles: anyone can read public profiles, only owner can write
drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable"
  on public.profiles for select
  using (is_public = true or auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Games: public games viewable by all, owner can do anything
drop policy if exists "Public games are viewable" on public.games;
create policy "Public games are viewable"
  on public.games for select
  using (is_public = true or auth.uid() = player_id);

drop policy if exists "Users insert own games" on public.games;
create policy "Users insert own games"
  on public.games for insert
  with check (auth.uid() = player_id);

drop policy if exists "Users update own games" on public.games;
create policy "Users update own games"
  on public.games for update
  using (auth.uid() = player_id);

drop policy if exists "Users delete own games" on public.games;
create policy "Users delete own games"
  on public.games for delete
  using (auth.uid() = player_id);

-- Analyses: viewable if associated game is viewable
drop policy if exists "Analyses readable when game viewable" on public.analyses;
create policy "Analyses readable when game viewable"
  on public.analyses for select
  using (
    exists (
      select 1 from public.games
      where games.id = analyses.game_id
      and (games.is_public = true or games.player_id = auth.uid())
    )
  );

-- Votes: anyone can vote (anonymous supported), readable if game viewable
drop policy if exists "Anyone can vote" on public.votes;
create policy "Anyone can vote"
  on public.votes for insert
  with check (true);

drop policy if exists "Votes viewable on viewable games" on public.votes;
create policy "Votes viewable on viewable games"
  on public.votes for select
  using (
    exists (
      select 1 from public.games
      where games.id = votes.game_id
      and (games.is_public = true or games.player_id = auth.uid())
    )
  );

-- Invitations: only inviter can see/create own invites
drop policy if exists "Users see own sent invites" on public.invitations;
create policy "Users see own sent invites"
  on public.invitations for select
  using (auth.uid() = inviter_id);

drop policy if exists "Users create own invites" on public.invitations;
create policy "Users create own invites"
  on public.invitations for insert
  with check (auth.uid() = inviter_id);

drop policy if exists "Users update own invites" on public.invitations;
create policy "Users update own invites"
  on public.invitations for update
  using (auth.uid() = inviter_id);

-- Friendships: bilateral visibility, user adds own
drop policy if exists "Users see own friendships" on public.friendships;
create policy "Users see own friendships"
  on public.friendships for select
  using (auth.uid() in (user_id, friend_id));

drop policy if exists "Users add own friendships" on public.friendships;
create policy "Users add own friendships"
  on public.friendships for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own friendships" on public.friendships;
create policy "Users delete own friendships"
  on public.friendships for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- DONE — verify with: select count(*) from profiles;
-- ============================================================================
