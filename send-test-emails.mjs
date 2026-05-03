// Truth or Cap - send 11 viral email templates to your inbox.
//
//   set RESEND_KEY=re_...
//   set TO_EMAIL=danielrodovalho228@gmail.com
//   node send-test-emails.mjs
//
// Sender: noreply@truthorcapapp.com (domain verified on Resend).

const RESEND_KEY = process.env.RESEND_KEY;
const TO = process.env.TO_EMAIL;
const FROM = process.env.EMAIL_FROM ?? 'Truth or Cap <noreply@truthorcapapp.com>';
const SITE = 'https://truthorcapapp.com';

if (!RESEND_KEY) { console.error('Set RESEND_KEY env var'); process.exit(1); }
if (!TO) { console.error('Set TO_EMAIL env var'); process.exit(1); }

const brand = { bg:'#fde9f3', bgCard:'#ffffff', fg:'#3d0066', accent:'#ff3d8b', accent2:'#9d3bff', muted:'#6b3a85' };

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 64" width="280" height="64"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3d0066"/><stop offset="55%" stop-color="#9d3bff"/><stop offset="100%" stop-color="#ff3d8b"/></linearGradient></defs><text x="0" y="42" font-family="Georgia, serif" font-size="38" font-weight="900" fill="url(#g)">truth</text><text x="118" y="42" font-family="Georgia, serif" font-size="30" font-style="italic" fill="#9d3bff">or</text><text x="158" y="42" font-family="Georgia, serif" font-size="38" font-weight="900" fill="#ff3d8b">cap</text><circle cx="252" cy="38" r="6" fill="#ff3d8b"/><path d="M236 30 Q252 18 268 30 L268 34 L236 34 Z" fill="#3d0066"/><rect x="234" y="34" width="36" height="3" fill="#3d0066"/><ellipse cx="251" cy="32" rx="4" ry="2" fill="#fff8e7"/></svg>';
const LOGO_URL = 'data:image/svg+xml;utf8,' + encodeURIComponent(LOGO_SVG);

const HERO_THEMES = {
  rosa:    { bg: 'linear-gradient(135deg, #ff3d8b 0%, #ff7eb6 50%, #ffb3d1 100%)', emojiShadow: '0 8px 0 rgba(61, 0, 102, 0.25)' },
  violet:  { bg: 'linear-gradient(135deg, #9d3bff 0%, #b975ff 50%, #d4a8ff 100%)', emojiShadow: '0 8px 0 rgba(61, 0, 102, 0.3)' },
  mint:    { bg: 'linear-gradient(135deg, #00d09c 0%, #4dd9b5 50%, #a3e9d4 100%)', emojiShadow: '0 8px 0 rgba(0, 80, 60, 0.25)' },
  mustard: { bg: 'linear-gradient(135deg, #ffc73d 0%, #ffe59c 50%, #fff3c7 100%)', emojiShadow: '0 8px 0 rgba(102, 70, 0, 0.25)' },
};

function wrap(o) {
  const { preheader, heroEmoji, heroAccent, heroTheme = 'rosa', title, body, ctaLabel, ctaUrl, ctaSecondaryLabel, ctaSecondaryUrl, footnote } = o;
  const theme = HERO_THEMES[heroTheme] ?? HERO_THEMES.rosa;
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>' + esc(title) + '</title></head>'
    + '<body style="margin:0;padding:0;background:' + brand.bg + ';font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:' + brand.fg + ';">'
    + (preheader ? '<div style="display:none;max-height:0;overflow:hidden;color:transparent;font-size:1px;line-height:1px;">' + esc(preheader) + '</div>' : '')
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + brand.bg + ';"><tr><td align="center" style="padding:24px 12px;">'
    +   '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">'
    +     '<tr><td align="center" style="padding:8px 0 18px;"><a href="' + SITE + '" style="text-decoration:none;display:inline-block;"><img src="' + LOGO_URL + '" width="220" height="50" alt="Truth or Cap" style="display:block;border:0;outline:none;height:50px;width:220px;"></a></td></tr>'
    +     '<tr><td style="background:' + brand.bgCard + ';border-radius:24px 24px 0 0;border:2px solid ' + brand.accent + ';border-bottom:0;padding:0;overflow:hidden;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background:' + theme.bg + ';padding:36px 20px 28px;text-align:center;"><div style="font-size:96px;line-height:1;text-shadow:' + theme.emojiShadow + ';margin:4px 0;">' + heroEmoji + '</div>' + (heroAccent ? '<div style="font-size:32px;line-height:1;margin-top:6px;opacity:0.85;">' + heroAccent + '</div>' : '') + '</td></tr></table></td></tr>'
    +     '<tr><td style="background:' + brand.bgCard + ';border-radius:0 0 24px 24px;border:2px solid ' + brand.accent + ';border-top:0;padding:32px 28px 28px;box-shadow:0 6px 0 ' + brand.accent2 + ';"><h1 style="margin:0 0 14px 0;font-size:28px;font-weight:900;line-height:1.18;color:' + brand.fg + ';letter-spacing:-0.5px;">' + esc(title) + '</h1><div style="font-size:16px;line-height:1.6;color:' + brand.muted + ';">' + body + '</div>'
    +       (ctaUrl && ctaLabel ? '<div style="text-align:center;margin:28px 0 8px;"><a href="' + ctaUrl + '" style="display:inline-block;background:' + brand.accent + ';color:#ffffff;text-decoration:none;font-weight:900;font-size:18px;padding:18px 32px;border-radius:14px;border:2px solid ' + brand.fg + ';box-shadow:0 5px 0 ' + brand.fg + ';">' + esc(ctaLabel) + ' &rarr;</a></div>' : '')
    +       (ctaSecondaryUrl && ctaSecondaryLabel ? '<div style="text-align:center;margin:14px 0 0;"><a href="' + ctaSecondaryUrl + '" style="display:inline-block;color:' + brand.accent2 + ';text-decoration:underline;font-weight:700;font-size:14px;">' + esc(ctaSecondaryLabel) + '</a></div>' : '')
    +       (footnote ? '<p style="font-size:12px;color:' + brand.muted + ';margin-top:24px;line-height:1.5;border-top:1px solid #f0d6e6;padding-top:16px;">' + footnote + '</p>' : '')
    +     '</td></tr>'
    +     '<tr><td align="center" style="padding:18px 16px 4px;"><p style="font-size:13px;color:' + brand.fg + ';margin:0 0 6px;font-weight:700;">Compartilha com a galera 🔗</p><p style="font-size:12px;color:' + brand.muted + ';margin:0;">Família, casal ou grupo &middot; <a href="' + SITE + '/online" style="color:' + brand.accent + ';text-decoration:none;font-weight:700;">Joga agora</a></p></td></tr>'
    +     '<tr><td align="center" style="padding:18px 12px 4px;font-size:11px;color:' + brand.muted + ';line-height:1.6;">Truth or Cap &mdash; AI lie detector party game.<br><a href="' + SITE + '/settings/notifications" style="color:' + brand.accent2 + ';text-decoration:underline;">Manage notifications</a> &middot; <a href="' + SITE + '" style="color:' + brand.accent2 + ';text-decoration:underline;">Open app</a></td></tr>'
    +   '</table></td></tr></table></body></html>';
}

const T = [
  { name: '01 magic_link', subject: '[TESTE 1] Seu link mágico chegou 🪄', layout: { preheader:'Toca aqui pra entrar — válido por 1h.', heroEmoji:'🪄', heroAccent:'✨', heroTheme:'violet', title:'Bem-vindo de volta!', body:'<p style="margin:0 0 12px;">Cola aqui dentro de <strong>1 hora</strong>. Se passar disso, vira abóbora 🎃.</p><p style="margin:0;font-size:14px;color:#9d3bff;">Não pediu? Ignora — ninguém entra na sua conta a não ser você.</p>', ctaLabel:'Entrar agora', ctaUrl:SITE+'/auth/callback?code=fake', footnote:'Link expira em 1 hora. Se já foi usado, é só pedir outro.' }},
  { name: '02 confirm_signup', subject: '[TESTE 2] Confirma seu email — bora desmascarar a galera 👀', layout: { preheader:'Confirma seu email pra começar.', heroEmoji:'👀', heroAccent:'🎤', heroTheme:'rosa', title:'Falta um clique', body:'<p style="margin:0 0 14px;">Cadastro feito! Falta confirmar seu email pra começar a desmascarar a galera.</p><p style="margin:0;">Truth or Cap detecta <strong>voz, rosto e o jeito que você fala</strong> — em <strong>30 segundos</strong> a gente revela quem está falando a real 🤥</p>', ctaLabel:'Confirmar email', ctaUrl:SITE+'/auth/confirm', footnote:'Não foi você que se cadastrou? Ignora esse email.' }},
  { name: '03 reset_password', subject: '[TESTE 3] 🔑 Reset da senha — Truth or Cap', layout: { preheader:'Toca pra criar nova senha. Válido por 1h.', heroEmoji:'🔑', heroAccent:'🛡️', heroTheme:'violet', title:'Resetar senha', body:'<p style="margin:0 0 14px;">Pediu pra resetar sua senha? Toca abaixo pra criar uma nova em segundos.</p><p style="margin:0;font-size:14px;color:#9d3bff;">Se não foi você, ignora — sua conta está segura.</p>', ctaLabel:'Criar nova senha', ctaUrl:SITE+'/auth/reset-password', footnote:'Link expira em 1 hora.' }},
  { name: '04 friend_joined', subject: '[TESTE 4] Larissa entrou na sua sala 🚪', layout: { preheader:'Larissa chegou. Bora?', heroEmoji:'🚪', heroAccent:'👋', heroTheme:'mint', title:'Tem gente esperando', body:'<p style="margin:0 0 14px;font-size:18px;"><strong>Larissa</strong> está esperando você na sala</p><div style="text-align:center;margin:18px 0;"><span style="display:inline-block;background:#fde9f3;border:2px dashed #ff3d8b;padding:14px 28px;border-radius:14px;font-family:monospace;font-weight:900;font-size:32px;color:#ff3d8b;letter-spacing:6px;">XYZ4</span></div><p style="margin:14px 0 0;text-align:center;">Não deixa começarem sem você 🏃‍♀️💨</p>', ctaLabel:'Entrar na sala', ctaUrl:SITE+'/room/XYZ4' }},
  { name: '05a voted_truth', subject: '[TESTE 5a] Marina acreditou ✅', layout: { preheader:'Marina votou no seu round.', heroEmoji:'✅', heroAccent:'💚', heroTheme:'mint', title:'Marina acreditou em você', body:'<p style="margin:0;"><strong>Marina</strong> acreditou na sua versão. Bora ver o veredicto da galera toda?</p>', ctaLabel:'Ver round + share', ctaUrl:SITE+'/share/round/abc' }},
  { name: '05b voted_cap', subject: '[TESTE 5b] Pedro chamou de cap 🧢', layout: { preheader:'Pedro votou no seu round.', heroEmoji:'🧢', heroAccent:'👀', heroTheme:'rosa', title:'Pedro chamou de cap', body:'<p style="margin:0;"><strong>Pedro</strong> desconfiou e botou cap em você. Aceita o desafio?</p>', ctaLabel:'Ver round + share', ctaUrl:SITE+'/share/round/abc' }},
  { name: '06a high_sus', subject: '[TESTE 6a] Resultado: 87/100 — Sai pra lá, mentiroso confesso 🚨', layout: { preheader:'Você tirou 87/100 no detector.', heroEmoji:'🚨', heroAccent:'📊', heroTheme:'rosa', title:'Resultado liberado', body:'<div style="text-align:center;margin:0 0 18px;background:linear-gradient(135deg,#fff,#fde9f3);border:2px solid #ff3d8b;border-radius:18px;padding:22px 12px;"><div style="font-size:88px;font-weight:900;color:#ff3d8b;line-height:1;letter-spacing:-3px;">87<span style="font-size:30px;color:#9d3bff;">/100</span></div><p style="font-size:18px;font-weight:900;color:#3d0066;margin:10px 0 0;">Sai pra lá, mentiroso confesso 🚨</p></div><p style="margin:0 0 8px;">Teu round acabou de ser revelado. <strong>Compartilha com quem te conhece</strong> e vê quem cai pra te roastar 🔥</p>', ctaLabel:'Ver e compartilhar', ctaUrl:SITE+'/share/round/abc', ctaSecondaryLabel:'Jogar de novo', ctaSecondaryUrl:SITE+'/online' }},
  { name: '06b low_sus', subject: '[TESTE 6b] Resultado: 23/100 — Pedra fria, ninguém te pega 🧊', layout: { preheader:'Você tirou 23/100 no detector.', heroEmoji:'🧊', heroAccent:'📊', heroTheme:'violet', title:'Resultado liberado', body:'<div style="text-align:center;margin:0 0 18px;background:linear-gradient(135deg,#fff,#fde9f3);border:2px solid #ff3d8b;border-radius:18px;padding:22px 12px;"><div style="font-size:88px;font-weight:900;color:#9d3bff;line-height:1;letter-spacing:-3px;">23<span style="font-size:30px;color:#9d3bff;">/100</span></div><p style="font-size:18px;font-weight:900;color:#3d0066;margin:10px 0 0;">Pedra fria, ninguém te pega 🧊</p></div><p style="margin:0;">Teu round acabou de ser revelado. <strong>Compartilha com quem te conhece</strong>.</p>', ctaLabel:'Ver e compartilhar', ctaUrl:SITE+'/share/round/xyz', ctaSecondaryLabel:'Jogar de novo', ctaSecondaryUrl:SITE+'/online' }},
  { name: '07 qotd', subject: '[TESTE 7] 👀 Pergunta do dia — você tem coragem?', layout: { preheader:'Voce ja deu unmatch no Tinder e fingiu que o app bugou?', heroEmoji:'👀', heroAccent:'🎤', heroTheme:'mustard', title:'Pergunta do dia', body:'<div style="background:linear-gradient(135deg,#fff8e7,#ffe59c);border-radius:14px;padding:22px 24px;border:2px dashed #ffc73d;margin:0 0 18px;"><p style="font-size:20px;font-weight:900;line-height:1.35;margin:0;color:#3d0066;font-style:italic;">"Voce ja deu unmatch no Tinder e fingiu que o app bugou?"</p></div><p style="margin:0;">Grava 30s respondendo e manda pra família, casal, grupo. A IA diz se você tava com cap 🧢 ou na real ✅.</p>', ctaLabel:'Responder agora', ctaUrl:SITE+'/challenge' }},
  { name: '08 streak', subject: '[TESTE 8] Cadê você? 7 dias sem desmascarar ninguém 😢', layout: { preheader:'Bora voltar — tem perguntas novas.', heroEmoji:'😢', heroAccent:'🔥', heroTheme:'violet', title:'A gente sente sua falta', body:'<p style="margin:0 0 14px;">Daniel, faz <strong>7 dias</strong> que ninguém te ouve mentir aqui.</p><p style="margin:0 0 14px;">Tem <strong>200+ perguntas novas</strong> pra família, casal e grupos esperando.</p><p style="margin:0;color:#ff3d8b;font-weight:700;">Tua streak vai morrer 🔥</p>', ctaLabel:'Voltar pro jogo', ctaUrl:SITE+'/' }},
  { name: '09 room_invite', subject: '[TESTE 9] Tia Cida te chamou pra família 🎉', layout: { preheader:'Tia Cida está esperando.', heroEmoji:'👨‍👩‍👧‍👦', heroAccent:'🎤', heroTheme:'rosa', title:'Você foi chamado', body:'<p style="margin:0 0 14px;font-size:17px;"><strong>Tia Cida</strong> abriu uma sala pra família e quer ver se você tem cara de quem mente bem 🤥</p><div style="text-align:center;margin:18px 0;"><span style="display:inline-block;background:#fde9f3;border:2px dashed #ff3d8b;padding:14px 28px;border-radius:14px;font-family:monospace;font-weight:900;font-size:32px;color:#ff3d8b;letter-spacing:6px;">FAM7</span></div>', ctaLabel:'Entrar agora', ctaUrl:SITE+'/room/FAM7' }},
  { name: '10 weekly_digest', subject: '[TESTE 10] Semana no Truth or Cap 📊 — você jogou 4x', layout: { preheader:'Recap rápido da galera essa semana.', heroEmoji:'📊', heroAccent:'🏆', heroTheme:'mustard', title:'Sua semana em Truth or Cap', body:'<ul style="padding:0;margin:0;list-style:none;"><li style="padding:10px 0;border-bottom:1px solid #f0d6e6;font-size:16px;">🏆 <strong>Junior</strong> tava mais sus essa semana (<strong style="color:#ff3d8b;">89/100</strong>)</li><li style="padding:10px 0;border-bottom:1px solid #f0d6e6;font-size:16px;">🎤 Você jogou <strong>4</strong> rounds</li><li style="padding:10px 0;font-size:16px;">🔥 Streak ativa? <a href="'+SITE+'/" style="color:#ff3d8b;font-weight:700;">Manter o foguinho</a></li></ul>', ctaLabel:'Abrir app', ctaUrl:SITE }},
  { name: '11 premium', subject: '[TESTE 11] 🔥 Você é oficialmente VICIADO no Truth or Cap', layout: { preheader:'Voce ta jogando muito. Premium combina.', heroEmoji:'💎', heroAccent:'🔥', heroTheme:'violet', title:'Bora pro próximo nível?', body:'<p style="margin:0 0 14px;">Daniel, 5 jogos em uma semana? Respect 🫡</p><p style="margin:0 0 12px;font-weight:700;color:#3d0066;">Premium libera:</p><ul style="padding-left:18px;margin:0;line-height:1.9;"><li>🎯 Categoria <strong>SPICY</strong> (perguntas adultas)</li><li>📈 Histórico ilimitado dos seus rounds</li><li>🏆 Stats avançadas (qual emoção te denuncia mais)</li><li>💎 Selo Premium no perfil</li></ul>', ctaLabel:'Ver Premium', ctaUrl:SITE+'/premium' }},
];

const results = [];
for (const t of T) {
  try {
    const html = wrap(t.layout);
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], subject: t.subject, html }),
    });
    const j = await r.json();
    results.push((r.ok ? 'OK   ' : 'FAIL ') + t.name + ' -> ' + (j.id ?? JSON.stringify(j)));
    await new Promise(res => setTimeout(res, 700));
  } catch (e) {
    results.push('ERR  ' + t.name + ' -> ' + e.message);
  }
}
console.log(results.join('\n'));
