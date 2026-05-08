-- ============================================================================
-- Migration 0026: Text-based solo games (no recording).
--
-- Mirrors the multiplayer rework in 0025. Solo games at /game/new are now
-- text-only by default — players type their answer instead of recording. The
-- AI runs linguistic analysis on the typed text (Whisper + Hume voice/face
-- only run when a recording exists).
--
-- Schema changes:
--   * games.recording_url, games.recording_duration_ms made NULLABLE so a
--     game row can exist without an uploaded clip.
--   * games.text_answer added — what the player typed.
--   * games.mode added — 'text' (default) or 'video'. Lets us pick the right
--     analysis pipeline + result-page renderer without sniffing column nulls.
--
-- Existing rows have recording_url/duration set, so they remain valid as
-- 'video' mode. We don't backfill mode to 'video' on old rows because the
-- default 'text' will be wrong for them — instead we backfill explicitly.
-- ============================================================================

alter table public.games
  add column if not exists text_answer text check (char_length(text_answer) <= 1000),
  add column if not exists mode text not null default 'text'
    check (mode in ('text', 'video'));

-- Existing recordings predate this migration → mark them 'video'.
update public.games
   set mode = 'video'
 where mode = 'text'
   and recording_url is not null;

-- Relax the recording columns now that text-mode rows can omit them.
alter table public.games alter column recording_url drop not null;
alter table public.games alter column recording_duration_ms drop not null;

-- Integrity: a row must have either a recording OR a text answer.
alter table public.games drop constraint if exists games_has_answer_chk;
alter table public.games
  add constraint games_has_answer_chk check (
    (mode = 'video' and recording_url is not null and recording_duration_ms is not null)
    or (mode = 'text' and text_answer is not null and char_length(trim(text_answer)) > 0)
  );

comment on column public.games.text_answer is
  'Typed answer for text-mode games. NULL for legacy video-mode rows.';
comment on column public.games.mode is
  'Analysis pipeline: text (Claude linguistic only) or video (Whisper + Hume + Claude).';
