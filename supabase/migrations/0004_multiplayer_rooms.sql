-- ============================================================================
-- Truth or Cap - Migration 0004: Multiplayer rooms
-- Apply in Supabase Dashboard -> SQL Editor -> New query -> Run
-- AFTER 0001 + 0002 + 0003.
-- ============================================================================

-- Mode pack: family / couple / group
-- Spice: mild (free) / spicy (premium)
do $$ begin
  create type room_mode as enum ('family', 'couple', 'group');
exception when duplicate_object then null; end $$;

do $$ begin
  create type room_spice as enum ('mild', 'spicy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type room_status as enum ('lobby', 'playing', 'finished');
exception when duplicate_object then null; end $$;

-- Rooms: each phone is a player; host controls flow.
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 4 and 8),
  host_user_id uuid references auth.users(id) on delete cascade,
  mode room_mode not null default 'group',
  spice room_spice not null default 'mild',
  status room_status not null default 'lobby',
  current_round int not null default 0,
  max_rounds int not null default 5,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists rooms_code_idx on public.rooms(code);
create index if not exists rooms_status_idx on public.rooms(status, created_at desc);

-- Players in a room. Anonymous join supported via display_name + nullable user_id.
create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  avatar text,
  is_host boolean not null default false,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create index if not exists room_players_room_idx on public.room_players(room_id, joined_at);
create unique index if not exists room_players_room_user_unique
  on public.room_players(room_id, user_id) where user_id is not null;

-- Each round in a room: prompter answers a question, others vote truth/cap.
create table if not exists public.room_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number int not null,
  prompter_player_id uuid not null references public.room_players(id) on delete cascade,
  question text not null,
  declared_answer text check (declared_answer in ('truth', 'cap')),
  recording_url text,
  sus_level numeric(5,2),
  analysis_summary text,
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  revealed_at timestamptz
);

create unique index if not exists room_rounds_room_number_unique
  on public.room_rounds(room_id, round_number);

-- Per-player vote on each round.
create table if not exists public.round_votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.room_rounds(id) on delete cascade,
  voter_player_id uuid not null references public.room_players(id) on delete cascade,
  vote text not null check (vote in ('truth', 'cap')),
  created_at timestamptz not null default now()
);

create unique index if not exists round_votes_round_player_unique
  on public.round_votes(round_id, voter_player_id);

-- Question packs by mode + spice + locale. Pre-seed with curated content.
create table if not exists public.question_packs (
  id uuid primary key default gen_random_uuid(),
  mode room_mode not null,
  spice room_spice not null,
  locale text not null,
  question text not null,
  weight int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists question_packs_lookup_idx
  on public.question_packs(mode, spice, locale);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_rounds enable row level security;
alter table public.round_votes enable row level security;
alter table public.question_packs enable row level security;

-- Anyone (including anon) can read rooms by code (used by /room/[code]).
drop policy if exists "Public reads rooms" on public.rooms;
create policy "Public reads rooms"
  on public.rooms for select using (true);

drop policy if exists "Authed creates rooms" on public.rooms;
create policy "Authed creates rooms"
  on public.rooms for insert
  with check (auth.uid() is not null);

drop policy if exists "Host updates own room" on public.rooms;
create policy "Host updates own room"
  on public.rooms for update
  using (auth.uid() = host_user_id);

drop policy if exists "Public reads room_players" on public.room_players;
create policy "Public reads room_players"
  on public.room_players for select using (true);

drop policy if exists "Public reads room_rounds" on public.room_rounds;
create policy "Public reads room_rounds"
  on public.room_rounds for select using (true);

drop policy if exists "Public reads round_votes" on public.round_votes;
create policy "Public reads round_votes"
  on public.round_votes for select using (true);

drop policy if exists "Public reads question_packs" on public.question_packs;
create policy "Public reads question_packs"
  on public.question_packs for select using (true);

-- ============================================================================
-- Realtime: enable broadcast on key tables
-- ============================================================================
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.room_rounds;
alter publication supabase_realtime add table public.round_votes;

-- ============================================================================
-- Seed: starter question pack (3 modes x 1 spice x 2 locales x 5 questions)
-- Total 30 questions. Replace later with curated 200+.
-- ============================================================================
insert into public.question_packs (mode, spice, locale, question) values
  -- FAMILY EN mild
  ('family','mild','en','Have you ever pretended to like a gift from a relative?'),
  ('family','mild','en','Have you secretly eaten the last cookie and blamed someone else?'),
  ('family','mild','en','Have you faked being asleep to avoid family chores?'),
  ('family','mild','en','Have you ever forgotten a family member''s birthday on purpose?'),
  ('family','mild','en','Have you laughed at a family member''s outfit behind their back?'),
  -- FAMILY PT mild
  ('family','mild','pt','Voce ja fingiu gostar de um presente de parente?'),
  ('family','mild','pt','Voce ja comeu o ultimo biscoito e culpou alguem?'),
  ('family','mild','pt','Voce ja fingiu estar dormindo pra escapar de tarefa?'),
  ('family','mild','pt','Voce ja esqueceu aniversario de familiar de proposito?'),
  ('family','mild','pt','Voce ja riu da roupa de um familiar pelas costas?'),
  -- COUPLE EN mild
  ('couple','mild','en','Have you ever pretended your phone died to avoid texting back?'),
  ('couple','mild','en','Have you read your partner''s messages without permission?'),
  ('couple','mild','en','Have you stalked an ex on social media this month?'),
  ('couple','mild','en','Have you lied about how late you went to bed?'),
  ('couple','mild','en','Have you snoozed an alarm 5 times to make your partner wake up first?'),
  -- COUPLE PT mild
  ('couple','mild','pt','Voce ja fingiu que o celular morreu pra nao responder?'),
  ('couple','mild','pt','Voce ja leu mensagens do parceiro sem permissao?'),
  ('couple','mild','pt','Voce stalkeou um ex em rede social esse mes?'),
  ('couple','mild','pt','Voce mentiu sobre que horas dormiu?'),
  ('couple','mild','pt','Voce apertou soneca 5 vezes pra parceiro acordar primeiro?'),
  -- GROUP EN mild
  ('group','mild','en','Have you ever pretended to know a song while singing along?'),
  ('group','mild','en','Have you ghosted a friend group chat for over a week?'),
  ('group','mild','en','Have you gone to a party only to leave 30 minutes later?'),
  ('group','mild','en','Have you ever lied about being busy to skip a friend hangout?'),
  ('group','mild','en','Have you taken a screenshot of a private group chat?'),
  -- GROUP PT mild
  ('group','mild','pt','Voce ja fingiu que sabia uma musica enquanto cantava junto?'),
  ('group','mild','pt','Voce ja sumiu de grupo de amigos por mais de uma semana?'),
  ('group','mild','pt','Voce ja foi numa festa e saiu 30 min depois?'),
  ('group','mild','pt','Voce ja mentiu que tava ocupado pra escapar de encontro?'),
  ('group','mild','pt','Voce ja deu print em conversa privada de grupo?')
on conflict do nothing;

-- ============================================================================
-- DONE - verify with:
--   select count(*) from question_packs group by mode, spice, locale;
-- ============================================================================
