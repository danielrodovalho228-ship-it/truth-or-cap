-- ============================================================================
-- Truth or Cap — Migration 0003: Question of the Day + Today's Challenge
-- Apply in Supabase Dashboard → SQL Editor → New query → Run
-- AFTER 0001 + 0002.
-- ============================================================================

-- Question of the Day: globally voted Yes/No prompt that rotates daily.
create table if not exists public.question_of_day (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) <= 500),
  active_date date not null unique,
  yes_count int not null default 0,
  no_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists qotd_active_idx on public.question_of_day(active_date desc);

-- Per-user vote (or anonymous via IP hash) on the daily question.
create table if not exists public.qotd_votes (
  id uuid primary key default gen_random_uuid(),
  qotd_id uuid not null references public.question_of_day(id) on delete cascade,
  voter_id uuid references auth.users(id) on delete cascade,
  voter_ip_hash text,
  vote text not null check (vote in ('yes', 'no')),
  created_at timestamptz not null default now()
);

create index if not exists qotd_votes_qotd_idx on public.qotd_votes(qotd_id);

create unique index if not exists qotd_votes_user_unique
  on public.qotd_votes(qotd_id, voter_id)
  where voter_id is not null;

create unique index if not exists qotd_votes_ip_unique
  on public.qotd_votes(qotd_id, voter_ip_hash)
  where voter_id is null and voter_ip_hash is not null;

-- Today's Challenge: surface a recommended prompt (e.g. "Confess your guilty
-- pleasure song") that the home page features. We pre-seed N challenges and
-- pick one per day; users can also see the full archive.
create table if not exists public.daily_challenge (
  id uuid primary key default gen_random_uuid(),
  challenge text not null check (char_length(challenge) <= 500),
  active_date date not null unique,
  created_at timestamptz not null default now()
);

create index if not exists challenge_active_idx on public.daily_challenge(active_date desc);

-- RLS: anyone reads the active daily question + challenge; only service
-- role writes. Voting goes through /api/qotd/vote.
alter table public.question_of_day enable row level security;
alter table public.qotd_votes enable row level security;
alter table public.daily_challenge enable row level security;

drop policy if exists "Public reads QOTD" on public.question_of_day;
create policy "Public reads QOTD"
  on public.question_of_day for select using (true);

drop policy if exists "Public reads QOTD votes" on public.qotd_votes;
create policy "Public reads QOTD votes"
  on public.qotd_votes for select using (true);

drop policy if exists "Anyone can vote QOTD" on public.qotd_votes;
create policy "Anyone can vote QOTD"
  on public.qotd_votes for insert with check (true);

drop policy if exists "Public reads challenge" on public.daily_challenge;
create policy "Public reads challenge"
  on public.daily_challenge for select using (true);

-- Increment helper RPCs.
create or replace function public.qotd_bump(p_qotd_id uuid, p_vote text)
returns void
language plpgsql
security definer
as $$
begin
  if p_vote = 'yes' then
    update public.question_of_day set yes_count = yes_count + 1 where id = p_qotd_id;
  elsif p_vote = 'no' then
    update public.question_of_day set no_count = no_count + 1 where id = p_qotd_id;
  end if;
end;
$$;

-- Seed today's QOTD + challenge so the home page renders something on day 0.
insert into public.question_of_day (question, active_date)
values ('Have you cried alone in a car this year?', current_date)
on conflict (active_date) do nothing;

insert into public.daily_challenge (challenge, active_date)
values ('Confess your guilty-pleasure song to someone judgmental.', current_date)
on conflict (active_date) do nothing;

-- ============================================================================
-- DONE — verify with: select * from question_of_day where active_date = current_date;
-- ============================================================================
