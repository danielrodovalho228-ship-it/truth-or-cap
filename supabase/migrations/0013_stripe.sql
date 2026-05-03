-- Migration 0013: Stripe integration (customer + subscription tracking + webhook idempotency)

alter table public.profiles add column if not exists stripe_customer_id text unique;
alter table public.profiles add column if not exists stripe_subscription_id text;
create index if not exists profiles_stripe_customer_idx on public.profiles(stripe_customer_id) where stripe_customer_id is not null;

-- Idempotency table for Stripe webhook events. Insert event.id; conflict =
-- duplicate, skip. Cleanup nightly via expire_old_stripe_events().
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- Only service role can read/write — no public policies needed.

-- Helper used by API routes to check premium status without joins.
create or replace function public.is_premium_user(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(p.is_premium, false)
    and (p.premium_until is null or p.premium_until > now())
  from public.profiles p where p.id = uid;
$$;

-- Optional: prune stripe_events older than 90 days (call from cron).
create or replace function public.expire_old_stripe_events()
returns int language plpgsql security definer set search_path = public as $$
declare deleted int;
begin
  delete from public.stripe_events where received_at < now() - interval '90 days';
  get diagnostics deleted = row_count;
  return deleted;
end $$;
