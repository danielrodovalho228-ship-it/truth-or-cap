-- ============================================================================
-- Truth or Cap — Migration 0002: API cost log
-- Apply in Supabase Dashboard → SQL Editor → New query → Run
-- AFTER 0001_initial_schema.sql
-- ============================================================================

-- Cost tracking table: every Whisper/Hume/Claude call writes a row.
create table if not exists public.api_cost_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  game_id uuid references public.games(id) on delete cascade,
  provider text not null check (provider in ('hume_voice', 'hume_face', 'whisper', 'claude')),
  cost_usd numeric(10,6) not null,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists api_cost_log_created_at_idx on public.api_cost_log(created_at desc);
create index if not exists api_cost_log_user_idx on public.api_cost_log(user_id);
create index if not exists api_cost_log_game_idx on public.api_cost_log(game_id);

-- RPC to compute total cost in a rolling window (used by /admin in M09).
create or replace function public.total_cost_in_window(window_hours int default 24)
returns numeric
language sql
stable
as $$
  select coalesce(sum(cost_usd), 0)::numeric
  from public.api_cost_log
  where created_at > now() - (window_hours || ' hours')::interval;
$$;

-- RLS: only service role writes. Users can read their own (for transparency).
alter table public.api_cost_log enable row level security;

drop policy if exists "Users see own cost log" on public.api_cost_log;
create policy "Users see own cost log"
  on public.api_cost_log for select
  using (auth.uid() = user_id);

-- ============================================================================
-- DONE — verify with: select count(*) from api_cost_log;
-- ============================================================================
