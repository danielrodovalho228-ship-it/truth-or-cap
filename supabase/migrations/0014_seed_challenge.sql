-- ============================================================================
-- Truth or Cap — Migration 0014: Bootstrap 7 days of QOTD + Challenge.
-- Apply in Supabase Dashboard → SQL Editor → New query → Run.
-- AFTER 0003 (which creates question_of_day + daily_challenge).
--
-- Why: the /api/cron/qotd-challenge cron only runs at 00:00 UTC. This seed
-- guarantees today + the next 6 days are populated so /challenge renders
-- immediately and survives a missed cron tick.
-- ============================================================================

-- 7 upcoming QOTD entries (today + next 6 days).
insert into public.question_of_day (question, active_date) values
  ('Have you cried alone in a car this year?',                                current_date + 0),
  ('Have you ever ghosted someone you actually liked?',                       current_date + 1),
  ('Have you ever lied about how much you spent on something?',               current_date + 2),
  ('Have you ever pretended to read a book to sound smarter?',                current_date + 3),
  ('Have you ever tagged someone in a photo to make an ex jealous?',          current_date + 4),
  ('Have you ever finished a snack you bought to share, before sharing it?',  current_date + 5),
  ('Have you ever lied about being sick to skip something?',                  current_date + 6)
on conflict (active_date) do nothing;

-- 7 upcoming Today's Challenge prompts.
insert into public.daily_challenge (challenge, active_date) values
  ('Confess your guilty-pleasure song to someone judgmental.',                current_date + 0),
  ('Tell us the last lie you told today.',                                    current_date + 1),
  ('Admit one thing you Googled this week and regret.',                       current_date + 2),
  ('Read your last sent text out loud — and explain it.',                     current_date + 3),
  ('Tell us the worst gift you ever pretended to love.',                      current_date + 4),
  ('Confess the most expensive thing you bought and never used.',             current_date + 5),
  ('Describe the pettiest reason you ever unfollowed someone.',               current_date + 6)
on conflict (active_date) do nothing;

-- ============================================================================
-- DONE — verify with:
--   select active_date, question  from question_of_day  where active_date >= current_date order by active_date;
--   select active_date, challenge from daily_challenge  where active_date >= current_date order by active_date;
-- ============================================================================
