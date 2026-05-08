-- ============================================================================
-- Migration 0026: Would You Rather — global vote tally.
--
-- One row per (question_id, voter). Authed users dedup by user_id; anonymous
-- voters dedup by sha256(ip + salt). The aggregate functions skip RLS via
-- SECURITY DEFINER and only return counts (never voter identities), so they
-- are safe to expose to authenticated and anonymous callers.
--
-- The "polarizing" view ranks prompts by how close to 50/50 they sit, with
-- a minimum sample threshold to avoid hot-takes off 3 votes.
-- ============================================================================

create table if not exists public.wyr_votes (
  id              uuid primary key default gen_random_uuid(),
  question_id     text not null,
  option_chosen   char(1) not null check (option_chosen in ('A', 'B')),
  voter_id        uuid references auth.users(id) on delete set null,
  voter_ip_hash   text,
  created_at      timestamptz not null default now(),

  -- Either a user or an IP hash must identify the vote (never both null).
  constraint wyr_votes_has_voter check (voter_id is not null or voter_ip_hash is not null)
);

-- Dedup: a single user voting again on the same prompt updates instead of
-- inserts a duplicate. Same for IP-bucketed anon voters.
create unique index if not exists wyr_votes_user_unique
  on public.wyr_votes (question_id, voter_id)
  where voter_id is not null;

create unique index if not exists wyr_votes_ip_unique
  on public.wyr_votes (question_id, voter_ip_hash)
  where voter_id is null and voter_ip_hash is not null;

create index if not exists wyr_votes_question_idx
  on public.wyr_votes (question_id);

create index if not exists wyr_votes_recent_idx
  on public.wyr_votes (created_at desc);

-- ─── RLS ───────────────────────────────────────────────────────────────
-- Inserts/updates always go through the API (service role). Locked-down
-- reads: clients never read raw rows; they call the aggregate RPCs below.

alter table public.wyr_votes enable row level security;

-- Authed users can read THEIR OWN vote (so the UI can show "you picked A"
-- on revisits). Aggregate stats come from the RPCs.
drop policy if exists wyr_votes_self_read on public.wyr_votes;
create policy wyr_votes_self_read on public.wyr_votes
  for select to authenticated
  using (voter_id = auth.uid());

-- No public insert/update/delete. The API uses service role.
revoke insert, update, delete on public.wyr_votes from anon, authenticated;

-- ─── AGGREGATE RPCs ────────────────────────────────────────────────────

-- Per-question tallies: returns A count, B count, total. SECURITY DEFINER
-- so anon callers can read counts without exposing per-row data.
create or replace function public.wyr_question_stats(p_question_id text)
returns table (
  question_id text,
  votes_a bigint,
  votes_b bigint,
  total bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p_question_id as question_id,
    count(*) filter (where option_chosen = 'A')::bigint as votes_a,
    count(*) filter (where option_chosen = 'B')::bigint as votes_b,
    count(*)::bigint as total
  from public.wyr_votes
  where question_id = p_question_id;
$$;

grant execute on function public.wyr_question_stats(text) to anon, authenticated;

-- Polarizing prompts: ranked by how close to 50/50 the split is. Min
-- sample threshold defaults to 10 to avoid noise. Returns up to p_limit.
create or replace function public.wyr_polarizing(p_min_votes int default 10, p_limit int default 20)
returns table (
  question_id text,
  votes_a bigint,
  votes_b bigint,
  total bigint,
  pct_a numeric,
  split_distance numeric  -- 0 = perfect 50/50, 0.5 = 100/0
)
language sql
security definer
set search_path = public
stable
as $$
  with t as (
    select
      question_id,
      count(*) filter (where option_chosen = 'A')::bigint as votes_a,
      count(*) filter (where option_chosen = 'B')::bigint as votes_b,
      count(*)::bigint as total
    from public.wyr_votes
    group by question_id
  )
  select
    question_id,
    votes_a,
    votes_b,
    total,
    round((votes_a::numeric / nullif(total, 0)) * 100, 1) as pct_a,
    abs((votes_a::numeric / nullif(total, 0)) - 0.5) as split_distance
  from t
  where total >= greatest(p_min_votes, 0)
  order by split_distance asc, total desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.wyr_polarizing(int, int) to anon, authenticated;

-- "Top dividers" alt: most lopsided prompts (people overwhelmingly agree
-- on one option). Useful copy for stat pages — "98% picked X."
create or replace function public.wyr_consensus(p_min_votes int default 10, p_limit int default 20)
returns table (
  question_id text,
  votes_a bigint,
  votes_b bigint,
  total bigint,
  pct_a numeric,
  split_distance numeric
)
language sql
security definer
set search_path = public
stable
as $$
  with t as (
    select
      question_id,
      count(*) filter (where option_chosen = 'A')::bigint as votes_a,
      count(*) filter (where option_chosen = 'B')::bigint as votes_b,
      count(*)::bigint as total
    from public.wyr_votes
    group by question_id
  )
  select
    question_id,
    votes_a,
    votes_b,
    total,
    round((votes_a::numeric / nullif(total, 0)) * 100, 1) as pct_a,
    abs((votes_a::numeric / nullif(total, 0)) - 0.5) as split_distance
  from t
  where total >= greatest(p_min_votes, 0)
  order by split_distance desc, total desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.wyr_consensus(int, int) to anon, authenticated;

-- ============================================================================
-- DONE — verify with:
--   select * from public.wyr_question_stats('wyr_phone_or_photos');
--   select * from public.wyr_polarizing(0, 5);
-- ============================================================================
