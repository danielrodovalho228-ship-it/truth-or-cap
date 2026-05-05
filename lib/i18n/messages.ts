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

  // Feed (shared)
  'feed.back': '← truthorcap',

  // Game select (/jogo/select)
  'select.label': 'Pick a mode',
  'select.title.line1': "Who's",
  'select.title.line2': 'playing?',
  'select.subtitle':
    'Filter games by audience. We tone questions accordingly — family stays PG, couples gets honest, friends gets spicy.',
  'select.audience.family': 'Family',
  'select.audience.family.tag': 'PG. Kids welcome.',
  'select.audience.friends': 'Friends',
  'select.audience.friends.tag': 'Group nights. Default.',
  'select.audience.couples': 'Couples',
  'select.audience.couples.tag': 'Date-night honesty.',
  'select.questionsSuffix': 'questions',

  // Friends (/amigos)
  'friends.back': '← Home',
  'friends.label': 'Network',
  'friends.title.line1': 'Your',
  'friends.title.line2': 'circle.',
  'friends.empty.title': 'No friends yet.',
  'friends.empty.subtitle': 'Be the first in your circle. Invite 5 to unlock the leaderboard.',
  'friends.empty.cta': 'Find friends',
};

const pt: Dict = {
  'home.tagline.spot': 'Pega o cap.',
  'home.tagline.become': 'Vira o cap.',
  'home.subtitle': 'Detector de mentira com voz + vídeo via IA. Grava. Manda. Vê os amigos falharem.',
  'home.cta.newGame': '+ Novo jogo',
  'home.cta.signin': 'Já tem conta? Entrar',
  'home.nav.feed': 'Feed',
  'home.nav.friends': 'Amigos',
  'home.nav.rank': 'Rank',
  'home.nav.settings': 'Ajustes',
  'home.nav.daily': 'Hoje',
  'home.nav.detector': 'Detector',

  'auth.signin.title.line1': 'Volta',
  'auth.signin.title.line2': 'pro jogo.',
  'auth.signin.subtitle': 'Cola seu email. A gente manda um link mágico — clicou, entrou.',
  'auth.signup.title.line1': 'Pega um',
  'auth.signup.title.line2': 'arroba.',
  'auth.label.email': 'Email',
  'auth.label.username': 'Username',
  'auth.cta.signup': 'Criar conta · Magic link',
  'auth.cta.signin': 'Entrar · Magic link',
  'auth.cta.usePassword': 'Usar senha',
  'auth.cta.useMagicLink': 'Usar magic link',

  'game.declared.label': 'Sua resposta',
  'game.declared.truth': 'Verdade',
  'game.declared.cap': 'Cap',
  'game.cta.record': 'Gravar · 30s',
  'game.cta.pickFirst': 'Escolhe verdade ou cap →',
  'game.cta.differentQuestion': 'Outra pergunta',
  'game.disclaimer': 'Entretenimento · Não é um detector de verdade',

  'daily.qotd.label': 'Pergunta do dia',
  'daily.qotd.cta': 'Vota e vê o que o mundo pensa.',
  'daily.qotd.yes': 'Sim',
  'daily.qotd.no': 'Não',
  'daily.challenge.label': 'Desafio do dia',
  'daily.challenge.cta': 'Abrir desafio',

  'feed.back': '← truthorcap',

  'select.label': 'Escolhe o modo',
  'select.title.line1': 'Quem',
  'select.title.line2': 'tá jogando?',
  'select.subtitle':
    'Filtra os jogos por público. A gente ajusta as perguntas — família fica leve, casal fica honesto, amigos fica picante.',
  'select.audience.family': 'Família',
  'select.audience.family.tag': 'PG. Pode levar criança.',
  'select.audience.friends': 'Amigos',
  'select.audience.friends.tag': 'Noite de grupo. Padrão.',
  'select.audience.couples': 'Casais',
  'select.audience.couples.tag': 'Honestidade de casal.',
  'select.questionsSuffix': 'perguntas',

  'friends.back': '← Início',
  'friends.label': 'Rede',
  'friends.title.line1': 'Seu',
  'friends.title.line2': 'círculo.',
  'friends.empty.title': 'Sem amigos ainda.',
  'friends.empty.subtitle': 'Seja o primeiro do seu círculo. Convida 5 pra liberar o ranking.',
  'friends.empty.cta': 'Procurar amigos',
};

const dictionaries: Record<Lang, Dict> = { en, pt };

export function t(lang: Lang | undefined, key: string): string {
  const lng: Lang = lang && LANGS.includes(lang) ? lang : DEFAULT_LANG;
  return dictionaries[lng][key] ?? dictionaries[DEFAULT_LANG][key] ?? key;
}

/**
 * Resolve the active language.
 *
 * English is the unconditional default. We only honor an explicit user choice
 * persisted in the `lang` cookie (set by Settings → Language). The browser's
 * Accept-Language header is intentionally ignored so first-time visitors
 * always land in English regardless of OS locale.
 */
export function pickLang(input: { cookieLang?: string; acceptLanguage?: string | null }): Lang {
  if (input.cookieLang && LANGS.includes(input.cookieLang as Lang)) return input.cookieLang as Lang;
  return DEFAULT_LANG;
}
