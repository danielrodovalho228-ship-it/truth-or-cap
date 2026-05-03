-- ============================================================================
-- Migration 0009: critical fixes from QA agent audit
-- ============================================================================

-- Hide round_votes from public until the round is revealed.
drop policy if exists "Public reads round_votes" on public.round_votes;
create policy "Public reads round_votes after reveal"
  on public.round_votes for select using (
    exists (
      select 1 from public.room_rounds r
      where r.id = round_id and r.revealed_at is not null
    )
    or
    -- Voter can always see their own vote.
    exists (
      select 1 from public.room_players p
      where p.id = voter_player_id and p.user_id = auth.uid()
    )
  );

-- Admin audit log for who promoted/blocked whom and when.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  target_id uuid references auth.users(id) on delete cascade,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log(target_id, created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log(actor_id, created_at desc);
alter table public.admin_audit_log enable row level security;

-- BR-modern questions (15 bangers from QA comedy editor)
insert into public.question_packs (mode, spice, locale, question) values
  ('group','mild','pt','Voce ja deu 1 estrela no Uber e mentiu pro motorista que foi engano?'),
  ('group','mild','pt','Voce ja viu story do ex as 3 da manha e respondeu sem querer, deu mole feio?'),
  ('couple','mild','pt','Voce ja escondeu o valor do iFood do parceiro pq tava osso explicar?'),
  ('group','mild','pt','Voce ja entrou em reuniao de Zoom de cueca e rezou pra camera nao ligar?'),
  ('couple','mild','pt','Voce ja mandou PIX errado e ficou implorando "pelo amor de Deus me devolve" no zap?'),
  ('family','mild','pt','Voce ja silenciou o grupo da familia no WhatsApp e jurou que tava com bug?'),
  ('group','mild','pt','Voce ja postou story na academia e foi embora em 10 minutos?'),
  ('couple','mild','pt','Voce ja deu unmatch no Tinder e fingiu que o app bugou?'),
  ('group','mild','pt','Voce ja viu story de alguem 17 vezes seguidas rezando pra nao aparecer no topo?'),
  ('couple','mild','pt','Voce ja falou que tava "no busao" mas tava no sofa vendo BBB?'),
  ('group','mild','pt','Voce ja mandou print de conversa pro grupo das amigas em menos de 30 segundos?'),
  ('family','mild','pt','Voce ja fingiu que o entregador nao chegou pra comer escondido da familia?'),
  ('group','mild','pt','Voce ja postou foto antiga e botou "tbt" so pra parecer que a vida ta on?'),
  ('couple','mild','pt','Voce ja stalkeou a ex do seu crush ate 2019 e quase curtiu?'),
  ('group','mild','pt','Voce ja mandou "ja to indo" e ainda nem tinha tomado banho?')
on conflict do nothing;

-- Helper RPC: signups by day (for admin)
create or replace function public.signups_by_day(window_days int default 14)
returns table (day date, signups bigint)
language sql security definer set search_path = public, pg_catalog as $$
  select (created_at::date) as day, count(*)::bigint as signups
    from profiles
   where created_at >= now() - (window_days || ' days')::interval
   group by 1
   order by 1 desc;
$$;

-- ============================================================================
-- DONE.
-- ============================================================================
