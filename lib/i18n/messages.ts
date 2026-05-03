// Lightweight i18n. We avoid next-intl/react-intl for now and use a plain
// dictionary keyed by language, fetched from the user's preferred locale.
// English is the default; Portuguese covers the BR launch market.
//
// Usage:
//   import { t } from '@/lib/i18n/messages';
//   const lang = await getLang();
//   t(lang, 'home.cta.newGame'); // → "+ New game" or "+ Nova rodada"
//
// Add new strings as `dictionary.<lang>.<dotted.key>`. When a string is
// missing in a non-default lang, we fall back to English.

export type Lang = 'en' | 'pt';
export const LANGS: Lang[] = ['en', 'pt'];
export const DEFAULT_LANG: Lang = 'en';

type Dict = Record<string, string>;

const en: Dict = {
  // Home
  'home.tagline.spot': 'Spot the cap.',
  'home.tagline.become': 'Become the cap.',
  'home.subtitle': 'AI-powered voice + video lie detector. Record. Send. Watch friends fail.',
  'home.cta.newGame': '+ New game',
  'home.cta.signin': 'Have an account? Sign in',
  'home.nav.feed': 'Feed',
  'home.nav.friends': 'Friends',
  'home.nav.rank': 'Rank',
  'home.nav.settings': 'Settings',
  'home.nav.daily': 'Daily',
  'home.nav.detector': 'Detector',
  'home.label.gameBy': '— A game by truthorcap —',
  'home.cta.startPlaying': 'Start playing',
  'home.footer.comingSoon': 'Coming soon · 90 sec setup · Free forever',

  // Feed (signed-in home)
  'feed.label': 'Feed',
  'feed.title.line1': "Who's",
  'feed.title.line2': 'on trial?',
  'feed.empty.title': 'No friend games yet.',
  'feed.empty.subtitle': 'Add friends to see their plays here. Or record your own to start.',
  'feed.empty.record': 'Record a game',
  'feed.empty.find': 'Find friends',
  'feed.item.claims': 'Claims',
  'feed.item.tapToVote': 'Tap to vote',
  'feed.back': '← truthorcap',

  // Select / pick game
  'select.label': 'Pick a mode',
  'select.title.line1': "Who's",
  'select.title.line2': 'playing?',
  'select.subtitle': 'Filter games by audience. We tone questions accordingly — family stays PG, couples gets honest, friends gets spicy.',
  'select.audience.family': 'Family',
  'select.audience.family.tag': 'PG. Kids welcome.',
  'select.audience.friends': 'Friends',
  'select.audience.friends.tag': 'Group nights. Default.',
  'select.audience.couples': 'Couples',
  'select.audience.couples.tag': 'Date-night honesty.',
  'select.questionsSuffix': 'questions',

  // Friends / amigos
  'friends.label': 'Network',
  'friends.title.line1': 'Your',
  'friends.title.line2': 'circle.',
  'friends.empty.title': 'No friends yet.',
  'friends.empty.subtitle': 'Be the first in your circle. Invite 5 to unlock the leaderboard.',
  'friends.empty.cta': 'Find friends',
  'friends.back': '← Home',

  // Settings
  'settings.label': 'Settings',
  'settings.title.line1': 'Your',
  'settings.title.line2': 'controls.',
  'settings.row.username': 'Username',
  'settings.row.email': 'Email',
  'settings.row.streak': 'Streak',
  'settings.row.streakUnit': 'days',
  'settings.back': '← Home',

  // Auth
  'auth.signin.title.line1': 'Pick up',
  'auth.signin.title.line2': 'where you left.',
  'auth.signin.subtitle': "Drop your email. We'll send a magic link — clicking it logs you in.",
  'auth.signup.title.line1': 'Pick a',
  'auth.signup.title.line2': 'handle.',
  'auth.label.email': 'Email',
  'auth.label.username': 'Username',
  'auth.cta.signup': 'Create account · Magic link',
  'auth.cta.signin': 'Sign in · Magic link',
  'auth.cta.usePassword': 'Use password instead',
  'auth.cta.useMagicLink': 'Use magic link instead',

  // Game / detector
  'game.declared.label': 'Your declared answer',
  'game.declared.truth': 'Truth',
  'game.declared.cap': 'Cap',
  'game.cta.record': 'Record · 30 sec',
  'game.cta.pickFirst': 'Pick truth or cap →',
  'game.cta.differentQuestion': 'Different question',
  'game.disclaimer': 'Entertainment only · Not a real lie detector',

  // Daily
  'daily.qotd.label': 'Question of the day',
  'daily.qotd.cta': 'Vote and see what the world thinks.',
  'daily.qotd.yes': 'Yes',
  'daily.qotd.no': 'No',
  'daily.challenge.label': "Today's challenge",
  'daily.challenge.cta': 'Open challenge',
};

const pt: Dict = {
  'home.tagline.spot': 'Pega o cap.',
  'home.tagline.become': 'Vira o cap.',
  'home.subtitle': 'Detector de mentira com voz + vídeo via IA. Grava. Manda. Vê os amigos falharem.',
  'home.cta.newGame': '+ Novo jogo',
  'home.cta.signin': 'Já tem conta? Entrar',
  'home.nav.feed': 'Feed',
  'home.nav.friends': 'Amigos',
  'home.nav.rank': 