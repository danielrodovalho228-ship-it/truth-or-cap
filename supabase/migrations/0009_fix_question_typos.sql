-- ============================================================================
-- Migration 0009: fix missing apostrophes in seeded English question_packs
-- ============================================================================
-- Original 0007 inserts went out without apostrophes (didnt, exs, partners,
-- friends, Im). This patches the live rows so users see correct English.
-- Idempotent: re-running has no effect once the bad rows are gone.
-- ============================================================================

update public.question_packs
   set question = 'Have you ever liked an ex''s post and then panic-unliked it 2 seconds later?'
 where question = 'Have you ever liked an exs post and then panic-unliked it 2 seconds later?';

update public.question_packs
   set question = 'Have you ever lied about loving a friend''s new haircut?'
 where question = 'Have you ever lied about loving a friends new haircut?';

update public.question_packs
   set question = 'Have you ever Googled your partner''s ex more than once?'
 where question = 'Have you ever Googled your partners ex more than once?';

update public.question_packs
   set question = 'Have you ever screenshotted your partner''s text to send to a friend for translation?'
 where question = 'Have you ever screenshotted your partners text to send to a friend for translation?';

update public.question_packs
   set question = 'Have you ever said "I''m on my way" while still in the shower?'
 where question = 'Have you ever said "Im on my way" while still in the shower?';

update public.question_packs
   set question = 'Have you ever faked laughing at a joke you didn''t hear?'
 where question = 'Have you ever faked laughing at a joke you didnt hear?';

update public.question_packs
   set question = 'Have you ever sent a voice note then immediately regretted it but didn''t delete?'
 where question = 'Have you ever sent a voice note then immediately regretted it but didnt delete?';

-- ============================================================================
-- Done. Verify with:
--   select question from question_packs where question ilike '%didn%' or question ilike '%''s%';
-- ============================================================================
