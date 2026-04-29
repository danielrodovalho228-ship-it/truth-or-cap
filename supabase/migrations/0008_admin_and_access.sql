-- ============================================================================
-- Migration 0008: admin role + access allowlist (closed-beta gate)
-- ============================================================================

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_allowed boolean not null default true;
alter table public.profiles add column if not exists allowed_at timestamptz;
alter table public.profiles add column if not exists allowed_by uuid references auth.users(id) on delete set null;

create index if not exists profiles_is_admin_idx on public.profiles(is_admin) where is_admin = true;
create index if not exists profiles_is_allowed_idx on public.profiles(is_allowed) where is_allowed = false;

-- Bootstrap: dtrodovalho40@gmail.com is the founding admin.
update public.profiles
   set is_admin = true,
       is_allowed = true,
       allowed_at = coalesce(allowed_at, now())
 where id = 'cd5b78fd-4e6e-4124-ae06-f5fc82ffef46';

-- Helper RPC: admin counts.
create or replace function public.admin_summary()
returns table (
  total_users bigint,
  allowed_users bigint,
  admin_users bigint,
  total_rooms bigint,
  active_rooms bigint,
  total_rounds bigint,
  analyzed_rounds bigint,
  cost_24h numeric
)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select
    (select count(*) from profiles)                                              as total_users,
    (select count(*) from profiles where is_allowed)                             as allowed_users,
    (select count(*) from profiles where is_admin)                               as admin_users,
    (select count(*) from rooms)                                                 as total_rooms,
    (select count(*) from rooms where status in ('lobby','playing'))             as active_rooms,
    (select count(*) from room_rounds)                                           as total_rounds,
    (select count(*) from room_rounds where sus_level is not null and sus_level >= 0) as analyzed_rounds,
    coalesce((select sum(cost_usd) from api_cost_log where created_at >= now() - interval '24 hours'), 0) as cost_24h
$$;

-- ============================================================================
-- DONE. After migration: /admin page can call admin_summary().
-- ============================================================================
