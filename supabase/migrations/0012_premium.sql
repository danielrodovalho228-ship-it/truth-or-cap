-- Migration 0012: premium gate (manual admin grants until Stripe lands)
alter table public.profiles add column if not exists is_premium boolean not null default false;
alter table public.profiles add column if not exists premium_until timestamptz;
alter table public.profiles add column if not exists premium_granted_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists premium_granted_at timestamptz;
create index if not exists profiles_is_premium_idx on public.profiles(is_premium) where is_premium = true;

-- Auto-expire premium nightly. Wire to Vercel cron later.
create or replace function public.expire_lapsed_premium()
returns int language plpgsql security definer set search_path = public as $$
declare expired int;
begin
  update public.profiles set is_premium = false
   where is_premium = true and premium_until is not null and premium_until < now();
  get diagnostics expired = row_count;
  return expired;
end $$;

-- Audit log policy (so admin can read admin_audit_log via /admin/audit page)
drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log" on public.admin_audit_log for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
