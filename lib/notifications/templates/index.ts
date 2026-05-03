/**
 * Email templates for Truth or Cap.
 * Cartoon rosa/violet brand, viral hooks, hero gradients, big emojis.
 */

import { wrap, _esc } from './shared';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://truthorcapapp.com';

export interface TemplateOutput {
  subject: string;
  html: string;
  text: string;
}

// 1. Magic link
export function magicLinkEmail(args: { magicUrl: string }): TemplateOutput {
  const subject = 'Seu link mágico chegou 🪄';
  return {
    subject,
    html: wrap({
      preheader: 'Toca aqui pra entrar — válido por 1h.',
      heroEmoji: '🪄',
      heroAccent: '✨',
      heroTheme: 'violet',
      title: 'Bem-vindo de volta!',
      body: '<p style="margin:0 0 12px;">Cola aqui dentro de <strong>1 hora</strong>. Se passar disso, vira abóbora 🎃.</p>' +
            '<p style="margin:0;font-size:14px;color:#9d3bff;">Não pediu? Ignora — ninguém entra na sua conta a não ser você.</p>',
      ctaLabel: 'Entrar agora',
      ctaUrl: args.magicUrl,
      footnote: 'Link expira em 1 hora. Se já foi usado, é só pedir outro.',
    }),
    text: 'Cola aqui pra entrar: ' + args.magicUrl + '\n\nLink válido por 1 hora.',
  };
}

// 2. Confirm signup
export function confirmSignupEmail(args: { confirmUrl: string }): TemplateOutput {
  const subject = 'Confirma seu email — bora desmascarar a galera 👀';
  return {
    subject,
    html: wrap({
      preheader: 'Confirma seu email pra começar.',
      heroEmoji: '👀',
      heroAccent: '🎤',
      heroTheme: 'rosa',
      title: 'Falta um clique',
      body: '<p style="margin:0 0 14px;">Cadastro feito! Falta confirmar seu email pra começar a desmascarar a galera.</p>' +
            '<p style="margin:0;">Truth or Cap detecta <strong>voz, rosto e o jeito que você fala</strong> — em <strong>30 segundos</strong> a gente revela quem está falando a real 🤥</p>',
      ctaLabel: 'Confirmar email',
      ctaUrl: args.confirmUrl,
      footnote: 'Não foi você que se cadastrou? Ignora esse email.',
    }),
    text: 'Confirma seu email: ' + args.confirmUrl,
  };
}

// 3. Reset password
export function resetPasswordEmail(args: { resetUrl: string }): TemplateOutput {
  const subject = '🔑 Reset da senha — Truth or Cap';
  return {
    subject,
    html: wrap({
      preheader: 'Toca pra criar nova senha. Válido por 1h.',
      heroEmoji: '🔑',
      heroAccent: '🛡️',
      heroTheme: 'violet',
      title: 'Resetar senha',
      body: '<p style="margin:0 0 14px;">Pediu pra resetar sua senha? Toca abaixo pra criar uma nova em segundos.</p>' +
            '<p style="margin:0;font-size:14px;color:#9d3bff;">Se não foi você, ignora — sua conta está segura.</p>',
      ctaLabel: 'Criar nova senha',
      ctaUrl: args.resetUrl,
      footnote: 'Link expira em 1 hora.',
    }),
    text: 'Reset: ' + args.resetUrl,
  };
}

// 4. Friend joined room (FOMO)
export function friendJoinedRoomEmail(args: { friendName: string; roomCode: string }): TemplateOutput {
  const subject = args.friendName + ' entrou na sua sala 🚪';
  return {
    subject,
    html: wrap({
      preheader: args.friendName + ' chegou. Bora?',
      heroEmoji: '🚪',
      heroAccent: '👋',
      heroTheme: 'mint',
      title: 'Tem gente esperando',
      body: '<p style="margin:0 0 14px;font-size:18px;"><strong>' + _esc(args.friendName) + '</strong> está esperando você na sala</p>' +
            '<div style="text-align:center;margin:18px 0;">' +
              '<span style="display:inline-block;background:#fde9f3;border:2px dashed #ff3d8b;padding:14px 28px;border-radius:14px;font-family:monospace;font-weight:900;font-size:32px;color:#ff3d8b;letter-spacing:6px;">' + _esc(args.roomCode) + '</span>' +
            '</div>' +
            '<p style="margin:14px 0 0;text-align:center;">Não deixa começarem sem você 🏃‍♀️💨</p>',
      ctaLabel: 'Entrar na sala',
      ctaUrl: SITE + '/room/' + args.roomCode,
    }),
    text: args.friendName + ' entrou na sala ' + args.roomCode + ': ' + SITE + '/room/' + args.roomCode,
  };
}

// 5. Voted on you
export function votedOnYouEmail(args: { voterName: string; vote: 'truth' | 'cap'; roundUrl: string }): TemplateOutput {
  const isTruth = args.vote === 'truth';
  const verdict = isTruth ? 'acreditou em você' : 'chamou de cap';
  const emoji = isTruth ? '✅' : '🧢';
  const accent = isTruth ? '💚' : '👀';
  const theme = isTruth ? 'mint' : 'rosa';
  const subject = '[' + (isTruth ? 'TRUTH' : 'CAP') + '] ' + args.voterName + ' votou no seu round ' + emoji;
  return {
    subject,
    html: wrap({
      preheader: args.voterName + ' acabou de votar no seu round.',
      heroEmoji: emoji,
      heroAccent: accent,
      heroTheme: theme,
      title: args.voterName + ' ' + verdict,
      body: '<p style="margin:0 0 14px;">' +
              '<strong>' + _esc(args.voterName) + '</strong> ' +
              (isTruth ? 'acreditou na sua versão. Bora ver o veredicto da galera toda?' : 'desconfiou e botou cap em você. Aceita o desafio?') +
            '</p>',
      ctaLabel: 'Ver round + share',
      ctaUrl: args.roundUrl,
    }),
    text: args.voterName + ' ' + verdict + ': ' + args.roundUrl,
  };
}

// 6. Result revealed
export function resultRevealedEmail(args: { susLevel: number; shareUrl: string }): TemplateOutput {
  const tone =
    args.susLevel >= 80
      ? 'Sai pra lá, mentiroso confesso 🚨'
      : args.susLevel >= 60
      ? 'Sus level alto 👀'
      : args.susLevel >= 40
      ? 'Em cima do muro 🤔'
      : 'Pedra fria, ninguém te pega 🧊';
  const heroEmoji = args.susLevel >= 60 ? '🚨' : '🧊';
  const theme = args.susLevel >= 60 ? 'rosa' : 'violet';
  const subject = 'Resultado: ' + args.susLevel + '/100 — ' + tone;
  return {
    subject,
    html: wrap({
      preheader: 'Você tirou ' + args.susLevel + '/100 no detector.',
      heroEmoji,
      heroAccent: '📊',
      heroTheme: theme,
      title: 'Resultado liberado',
      body:
        '<div style="text-align:center;margin:0 0 18px;background:linear-gradient(135deg,#fff,#fde9f3);border:2px solid #ff3d8b;border-radius:18px;padding:22px 12px;">' +
          '<div style="font-size:88px;font-weight:900;color:' + (args.susLevel >= 60 ? '#ff3d8b' : '#9d3bff') + ';line-height:1;letter-spacing:-3px;">' + args.susLevel + '<span style="font-size:30px;color:#9d3bff;">/100</span></div>' +
          '<p style="font-size:18px;font-weight:900;color:#3d0066;margin:10px 0 0;">' + _esc(tone) + '</p>' +
        '</div>' +
        '<p style="margin:0 0 8px;">Teu round acabou de ser revelado. <strong>Compartilha com quem te conhece</strong> e vê quem cai pra te roastar 🔥</p>',
      ctaLabel: 'Ver e compartilhar',
      ctaUrl: args.shareUrl,
      ctaSecondaryLabel: 'Jogar de novo',
      ctaSecondaryUrl: SITE + '/online',
    }),
    text: 'Resultado: ' + args.susLevel + '/100 — ' + args.shareUrl,
  };
}

// 7. QOTD daily
export function qotdDailyEmail(args: { question: string }): TemplateOutput {
  const subject = '👀 Pergunta do dia — você tem coragem?';
  return {
    subject,
    html: wrap({
      preheader: args.question.slice(0, 90),
      heroEmoji: '👀',
      heroAccent: '🎤',
      heroTheme: 'mustard',
      title: 'Pergunta do dia',
      body:
        '<div style="background:linear-gradient(135deg,#fff8e7,#ffe59c);border-radius:14px;padding:22px 24px;border:2px dashed #ffc73d;margin:0 0 18px;">' +
          '<p style="font-size:20px;font-weight:900;line-height:1.35;margin:0;color:#3d0066;font-style:italic;">"' + _esc(args.question) + '"</p>' +
        '</div>' +
        '<p style="margin:0;">Grava 30s respondendo e manda pra família, casal, grupo. A IA diz se você tava com cap 🧢 ou na real ✅.</p>',
      ctaLabel: 'Responder agora',
      ctaUrl: SITE + '/challenge',
    }),
    text: 'Pergunta do dia: "' + args.question + '"\n\nResponde: ' + SITE + '/challenge',
  };
}

// 8. Streak reminder
export function streakReminderEmail(args: { daysIdle: number; username?: string }): TemplateOutput {
  const subject = 'Cadê você? ' + args.daysIdle + ' dias sem desmascarar ninguém 😢';
  const greet = args.username ? _esc(args.username) + ', ' : '';
  return {
    subject,
    html: wrap({
      preheader: 'Bora voltar — tem perguntas novas.',
      heroEmoji: '😢',
      heroAccent: '🔥',
      heroTheme: 'violet',
      title: 'A gente sente sua falta',
      body:
        '<p style="margin:0 0 14px;">' + greet + 'faz <strong>' + args.daysIdle + ' dias</strong> que ninguém te ouve mentir aqui.</p>' +
        '<p style="margin:0 0 14px;">Tem <strong>200+ perguntas novas</strong> pra família, casal e grupos esperando.</p>' +
        '<p style="margin:0;color:#ff3d8b;font-weight:700;">Tua streak vai morrer 🔥</p>',
      ctaLabel: 'Voltar pro jogo',
      ctaUrl: SITE + '/',
    }),
    text: 'Faz ' + args.daysIdle + ' dias. Volta: ' + SITE + '/',
  };
}

// 9. Room invite
export function roomInviteEmail(args: { inviterName: string; roomCode: string; mode: 'family' | 'couple' | 'group' }): TemplateOutput {
  const modeLabel = args.mode === 'family' ? 'pra família' : args.mode === 'couple' ? 'pra casal' : 'pro grupo';
  const heroEmoji = args.mode === 'family' ? '👨‍👩‍👧‍👦' : args.mode === 'couple' ? '💕' : '🎉';
  const subject = args.inviterName + ' te chamou ' + modeLabel + ' 🎉';
  return {
    subject,
    html: wrap({
      preheader: args.inviterName + ' está esperando.',
      heroEmoji,
      heroAccent: '🎤',
      heroTheme: 'rosa',
      title: 'Você foi chamado',
      body:
        '<p style="margin:0 0 14px;font-size:17px;"><strong>' + _esc(args.inviterName) + '</strong> abriu uma sala ' + modeLabel + ' e quer ver se você tem cara de quem mente bem 🤥</p>' +
        '<div style="text-align:center;margin:18px 0;">' +
          '<span style="display:inline-block;background:#fde9f3;border:2px dashed #ff3d8b;padding:14px 28px;border-radius:14px;font-family:monospace;font-weight:900;font-size:32px;color:#ff3d8b;letter-spacing:6px;">' + _esc(args.roomCode) + '</span>' +
        '</div>',
      ctaLabel: 'Entrar agora',
      ctaUrl: SITE + '/room/' + args.roomCode,
    }),
    text: args.inviterName + ' te chamou: ' + SITE + '/room/' + args.roomCode,
  };
}

// 10. Weekly digest
export function weeklyDigestEmail(args: { topPlayer?: string; topPlayerSus?: number; yourGames: number }): TemplateOutput {
  const subject = 'Semana no Truth or Cap 📊 — você jogou ' + args.yourGames + 'x';
  return {
    subject,
    html: wrap({
      preheader: 'Recap rápido da galera essa semana.',
      heroEmoji: '📊',
      heroAccent: '🏆',
      heroTheme: 'mustard',
      title: 'Sua semana em Truth or Cap',
      body:
        '<ul style="padding:0;margin:0;list-style:none;">' +
          (args.topPlayer ? '<li style="padding:10px 0;border-bottom:1px solid #f0d6e6;font-size:16px;">🏆 <strong>' + _esc(args.topPlayer) + '</strong> tava mais sus essa semana (<strong style="color:#ff3d8b;">' + args.topPlayerSus + '/100</strong>)</li>' : '') +
          '<li style="padding:10px 0;border-bottom:1px solid #f0d6e6;font-size:16px;">🎤 Você jogou <strong>' + args.yourGames + '</strong> rounds</li>' +
          '<li style="padding:10px 0;font-size:16px;">🔥 Streak ativa? <a href="' + SITE + '/" style="color:#ff3d8b;font-weight:700;">Manter o foguinho</a></li>' +
        '</ul>',
      ctaLabel: 'Abrir app',
      ctaUrl: SITE,
    }),
    text: args.yourGames + ' rounds essa semana. Abre: ' + SITE,
  };
}

// 11. Premium upsell
export function premiumUpsellEmail(args: { username?: string }): TemplateOutput {
  const subject = '🔥 Você é oficialmente VICIADO no Truth or Cap';
  const greet = args.username ? _esc(args.username) + ', ' : '';
  return {
    subject,
    html: wrap({
      preheader: 'Voce ta jogando muito. Premium combina.',
      heroEmoji: '💎',
      heroAccent: '🔥',
      heroTheme: 'violet',
      title: 'Bora pro próximo nível?',
      body:
        '<p style="margin:0 0 14px;">' + greet + '5 jogos em uma semana? Respect 🫡</p>' +
        '<p style="margin:0 0 12px;font-weight:700;color:#3d0066;">Premium libera:</p>' +
        '<ul style="padding-left:18px;margin:0;line-height:1.9;">' +
          '<li>🎯 Categoria <strong>SPICY</strong> (perguntas adultas)</li>' +
          '<li>📈 Histórico ilimitado dos seus rounds</li>' +
          '<li>🏆 Stats avançadas (qual emoção te denuncia mais)</li>' +
          '<li>💎 Selo Premium no perfil</li>' +
        '</ul>',
      ctaLabel: 'Ver Premium',
      ctaUrl: SITE + '/premium',
    }),
    text: 'Premium: ' + SITE + '/premium',
  };
}

export const TEMPLATES = {
  magic_link: magicLinkEmail,
  confirm_signup: confirmSignupEmail,
  reset_password: resetPasswordEmail,
  friend_joined: friendJoinedRoomEmail,
  voted_on_you: votedOnYouEmail,
  result_revealed: resultRevealedEmail,
  qotd_daily: qotdDailyEmail,
  streak_reminder: streakReminderEmail,
  room_invite: roomInviteEmail,
  weekly_digest: weeklyDigestEmail,
  premium_upsell: premiumUpsellEmail,
} as const;

export type NotificationKind = keyof typeof TEMPLATES;
