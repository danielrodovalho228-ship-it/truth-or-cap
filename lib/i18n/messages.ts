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
};

const dictionaries: Record<Lang, Dict> = { en, pt };

export function t(lang: Lang | undefined, key: string): string {
  const lng: Lang = lang && LANGS.includes(lang) ? lang : DEFAULT_LANG;
  return dictionaries[lng][key] ?? dictionaries[DEFAULT_LANG][key] ?? key;
}

/** Detect language from cookie / Accept-Language header / fallback. */
export function pickLang(input: { cookieLang?: string; acceptLanguage?: string | null }): Lang {
  if (input.cookieLang && LANGS.includes(input.cookieLang as Lang)) return input.cookieLang as Lang;
  const al = (input.acceptLanguage ?? '').toLowerCase();
  if (al.startsWith('pt')) return 'pt';
  return DEFAULT_LANG;
}
