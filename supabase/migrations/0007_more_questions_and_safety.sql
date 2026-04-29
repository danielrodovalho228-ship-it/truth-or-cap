-- ============================================================================
-- Migration 0007: bigger / funnier question pool + safety helpers
-- ============================================================================

-- 12 replacements for weak seed questions + 30 brand new ones (10 per mode).
insert into public.question_packs (mode, spice, locale, question) values
  -- Replacements
  ('family','mild','en','Have you ever re-gifted something to the person who originally gave it to you?'),
  ('family','mild','pt','Voce ja deu de presente uma coisa pra mesma pessoa que tinha te dado?'),
  ('family','mild','en','Have you ever blamed a fart on the dog (or a sibling) in front of guests?'),
  ('family','mild','pt','Voce ja jogou um pum nas costas do cachorro (ou do irmao) na frente de visita?'),
  ('couple','mild','en','Have you ever liked an exs post and then panic-unliked it 2 seconds later?'),
  ('couple','mild','pt','Voce ja curtiu post do ex e tirou a curtida correndo dois segundos depois?'),
  ('couple','mild','en','Have you ever pretended to be asleep so your partner would deal with the baby/pet/door?'),
  ('couple','mild','pt','Voce ja fingiu que tava dormindo pro parceiro resolver o bebe, o pet ou a campainha?'),
  ('group','mild','en','Have you ever said "haha just saw this" to a message you ignored for 3 days?'),
  ('group','mild','pt','Voce ja mandou "kkk vi agora" numa mensagem que tava te encarando ha 3 dias?'),
  ('group','mild','en','Have you ever lied about loving a friends new haircut?'),
  ('group','mild','pt','Voce ja mentiu que amou o cabelo novo de um amigo?'),
  -- FAMILY EN
  ('family','mild','en','Have you ever pretended the WiFi was broken so a relative would leave?'),
  ('family','mild','en','Have you faked a phone call to escape a family dinner conversation?'),
  ('family','mild','en','Have you ever hidden a bad school grade and forged a parent signature?'),
  ('family','mild','en','Have you secretly thrown out a gift the same week you got it?'),
  ('family','mild','en','Have you ever pretended to flush the toilet and just walked away?'),
  -- FAMILY PT
  ('family','mild','pt','Voce ja disse que o wifi tava ruim so pra parente ir embora?'),
  ('family','mild','pt','Voce ja fingiu uma ligacao pra fugir de papo de almoco de familia?'),
  ('family','mild','pt','Voce ja escondeu uma nota baixa e imitou a assinatura dos pais?'),
  ('family','mild','pt','Voce ja jogou fora um presente na mesma semana que ganhou?'),
  ('family','mild','pt','Voce ja fingiu que deu descarga e saiu de boa do banheiro?'),
  -- COUPLE EN
  ('couple','mild','en','Have you ever Googled your partners ex more than once?'),
  ('couple','mild','en','Have you ever blamed traffic when you were just running late from your couch?'),
  ('couple','mild','en','Have you ever pretended to enjoy a meal your partner cooked and quietly fed it to the dog?'),
  ('couple','mild','en','Have you ever screenshotted your partners text to send to a friend for translation?'),
  ('couple','mild','en','Have you ever said "Im on my way" while still in the shower?'),
  -- COUPLE PT
  ('couple','mild','pt','Voce ja deu mais de um google no ex do seu parceiro?'),
  ('couple','mild','pt','Voce ja botou a culpa no transito quando tava deitado no sofa?'),
  ('couple','mild','pt','Voce ja fingiu que amou a comida do parceiro e deu escondido pro cachorro?'),
  ('couple','mild','pt','Voce ja deu print numa mensagem do parceiro pra amiga traduzir o que ele quis dizer?'),
  ('couple','mild','pt','Voce ja disse "to chegando" ainda dentro do banho?'),
  -- GROUP EN
  ('group','mild','en','Have you ever clapped at the end of a movie just because everyone else was?'),
  ('group','mild','en','Have you ever faked laughing at a joke you didnt hear?'),
  ('group','mild','en','Have you ever pretended to know a celebrity everyone was talking about?'),
  ('group','mild','en','Have you ever sent a voice note then immediately regretted it but didnt delete?'),
  ('group','mild','en','Have you ever waved back at someone who was waving at the person behind you?'),
  -- GROUP PT
  ('group','mild','pt','Voce ja bateu palma no fim do filme so porque todo mundo bateu?'),
  ('group','mild','pt','Voce ja deu risada de piada que nem ouviu direito?'),
  ('group','mild','pt','Voce ja fingiu que conhecia uma famosa que todo mundo tava comentando?'),
  ('group','mild','pt','Voce ja mandou audio, se arrependeu na hora, mas deixou la mesmo assim?'),
  ('group','mild','pt','Voce ja acenou de volta pra alguem que tava acenando pra pessoa atras de voce?')
on conflict do nothing;

-- ============================================================================
-- Helper view: per-room cost usage (joins api_cost_log via round->room).
-- ============================================================================
create or replace view public.room_cost_summary as
select
  rr.room_id,
  count(*) filter (where rr.sus_level is not null) as analyzed_rounds,
  sum(rr.sus_level) filter (where rr.sus_level is not null) as sus_total
from public.room_rounds rr
group by rr.room_id;

-- ============================================================================
-- Done. Total questions now: 30 seed + 42 = 72 in question_packs.
-- ============================================================================
