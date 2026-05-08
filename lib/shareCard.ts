// Renders a viral share card as a 1080x1350 PNG using the Canvas 2D API.
// No third-party dependency — small bundle, font-faithful via document.fonts.

export interface ShareCardInput {
  username: string;
  question: string;
  susLevel: number;
  declaredAnswer: 'truth' | 'cap';
  lang: 'en' | 'pt';
}

const W = 1080;
const H = 1350;

const FRAUNCES = '"Fraunces", "Times New Roman", serif';
const MANROPE = '"Manrope", "Helvetica Neue", Arial, sans-serif';
const MONO = '"JetBrains Mono", "Courier New", monospace';

// Verdict copy mirrors SusLevelReveal (English source) with PT translations.
function verdictText(sus: number, lang: 'en' | 'pt'): string {
  if (lang === 'pt') {
    if (sus >= 85) return 'Pegou.';
    if (sus >= 70) return 'Provavelmente cap.';
    if (sus >= 40) return 'Tá em cima do muro.';
    if (sus >= 15) return 'Provavelmente verdade.';
    return 'Convenceu a IA.';
  }
  if (sus >= 85) return 'Busted.';
  if (sus >= 70) return 'Probably capping.';
  if (sus >= 40) return 'On the fence.';
  if (sus >= 15) return 'Probably truth.';
  return 'Convinced the AI.';
}

function tagFor(sus: number, lang: 'en' | 'pt'): { text: string; color: string } {
  const isCap = sus >= 50;
  if (lang === 'pt') {
    return isCap
      ? { text: 'CAP DETECTADO 🧢', color: '#f87171' }
      : { text: 'VERDADE 💚', color: '#14b8a6' };
  }
  return isCap
    ? { text: 'CAP DETECTED 🧢', color: '#f87171' }
    : { text: 'TRUTH 💚', color: '#14b8a6' };
}

function declaredLabel(lang: 'en' | 'pt'): string {
  return lang === 'pt' ? 'Declarou' : 'Declared';
}

function brandLine(lang: 'en' | 'pt'): string {
  return lang === 'pt' ? 'Você pega o cap?' : 'Can you spot the cap?';
}

// Wrap text into lines that fit within `maxWidth`, breaking on word boundaries.
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // Truncate the last line if it's still too long.
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth) {
      while (last.length && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

async function ensureFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  // Trigger load of the specific weights/sizes we'll draw with.
  await Promise.all([
    document.fonts.load('900 220px "Fraunces"'),
    document.fonts.load('900 76px "Fraunces"'),
    document.fonts.load('italic 300 64px "Fraunces"'),
    document.fonts.load('700 38px "Manrope"'),
    document.fonts.load('500 28px "JetBrains Mono"'),
  ]).catch(() => {
    /* fonts may be blocked; canvas falls back to system serif */
  });
  // Wait until all in-progress font loads settle.
  await document.fonts.ready.catch(() => {});
}

export async function renderShareCard(
  input: ShareCardInput
): Promise<{ blob: Blob; dataUrl: string } | null> {
  if (typeof document === 'undefined') return null;
  await ensureFontsReady();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const isCap = input.susLevel >= 50;
  const accent = isCap ? '#f87171' : '#14b8a6';
  const accentSoft = isCap ? '#fda4af' : '#5eead4';

  // ── Background: deep navy with two radial accents for drama. ───────────
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, W, H);

  const radialA = ctx.createRadialGradient(W * 0.2, H * 0.15, 0, W * 0.2, H * 0.15, W * 0.7);
  radialA.addColorStop(0, isCap ? 'rgba(248,113,113,0.35)' : 'rgba(20,184,166,0.35)');
  radialA.addColorStop(1, 'rgba(10,14,26,0)');
  ctx.fillStyle = radialA;
  ctx.fillRect(0, 0, W, H);

  const radialB = ctx.createRadialGradient(W * 0.85, H * 0.85, 0, W * 0.85, H * 0.85, W * 0.7);
  radialB.addColorStop(0, 'rgba(91,108,246,0.35)');
  radialB.addColorStop(1, 'rgba(10,14,26,0)');
  ctx.fillStyle = radialB;
  ctx.fillRect(0, 0, W, H);

  // Subtle film grain via noise dots.
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillRect(x, y, 1, 1);
  }

  // ── Top tape stripe ────────────────────────────────────────────────────
  const tape = ctx.createLinearGradient(0, 0, W, 0);
  tape.addColorStop(0, '#5b6cf6');
  tape.addColorStop(1, '#14b8a6');
  ctx.fillStyle = tape;
  ctx.fillRect(0, 0, W, 12);

  // ── Brand bar ──────────────────────────────────────────────────────────
  ctx.font = `500 28px ${MONO}`;
  ctx.fillStyle = '#94a3b8';
  ctx.textBaseline = 'top';
  ctx.fillText('TRUTH ⊘ CAP', 64, 56);

  ctx.textAlign = 'right';
  ctx.fillText('AI VERDICT', W - 64, 56);
  ctx.textAlign = 'left';

  // ── Top tag (CAP DETECTED / TRUTH) ─────────────────────────────────────
  const tag = tagFor(input.susLevel, input.lang);
  ctx.font = `700 38px ${MANROPE}`;
  ctx.textBaseline = 'middle';
  const tagText = tag.text;
  const tagPad = 32;
  const tagMetrics = ctx.measureText(tagText);
  const tagW = tagMetrics.width + tagPad * 2;
  const tagH = 80;
  const tagX = 64;
  const tagY = 150;
  ctx.fillStyle = tag.color;
  ctx.fillRect(tagX, tagY, tagW, tagH);
  ctx.fillStyle = '#0a0e1a';
  ctx.fillText(tagText, tagX + tagPad, tagY + tagH / 2 + 2);
  ctx.textBaseline = 'top';

  // ── Big SUS LEVEL number ───────────────────────────────────────────────
  ctx.font = `500 28px ${MONO}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('SUS LEVEL', 64, 280);

  ctx.font = `900 280px ${FRAUNCES}`;
  ctx.fillStyle = accent;
  // Soft glow for the number.
  ctx.shadowColor = accent;
  ctx.shadowBlur = 60;
  ctx.fillText(`${Math.round(input.susLevel)}%`, 56, 320);
  ctx.shadowBlur = 0;

  // ── Verdict line (italic display) ──────────────────────────────────────
  ctx.font = `italic 300 64px ${FRAUNCES}`;
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(verdictText(input.susLevel, input.lang), 64, 640);

  // ── Question card ──────────────────────────────────────────────────────
  const cardX = 64;
  const cardY = 760;
  const cardW = W - 128;

  // Border-only card with accent left bar.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;

  ctx.font = `500 24px ${MONO}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('QUESTION', cardX + 28, cardY + 24);

  ctx.font = `900 44px ${FRAUNCES}`;
  ctx.fillStyle = '#f8fafc';
  const questionText = `“${input.question}”`;
  const lines = wrapLines(ctx, questionText, cardW - 56, 4);
  let qY = cardY + 70;
  for (const line of lines) {
    ctx.fillText(line, cardX + 28, qY);
    qY += 56;
  }
  const cardH = Math.max(220, qY - cardY + 24);
  ctx.strokeRect(cardX, cardY, cardW, cardH);
  // Accent left bar
  ctx.fillStyle = accent;
  ctx.fillRect(cardX, cardY, 6, cardH);

  // ── Player attribution ─────────────────────────────────────────────────
  const playerY = cardY + cardH + 60;
  ctx.font = `500 26px ${MONO}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${declaredLabel(input.lang).toUpperCase()}:`, 64, playerY);

  ctx.font = `700 34px ${MANROPE}`;
  ctx.fillStyle = input.declaredAnswer === 'truth' ? '#14b8a6' : '#f87171';
  ctx.fillText(input.declaredAnswer.toUpperCase(), 220, playerY - 4);

  ctx.font = `700 42px ${MANROPE}`;
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`@${input.username}`, 64, playerY + 50);

  // ── Footer hook ────────────────────────────────────────────────────────
  ctx.font = `italic 300 38px ${FRAUNCES}`;
  ctx.fillStyle = accentSoft;
  ctx.fillText(brandLine(input.lang), 64, H - 140);

  ctx.font = `500 24px ${MONO}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('truthorcapapp.com', 64, H - 80);

  // Bottom tape stripe.
  ctx.fillStyle = tape;
  ctx.fillRect(0, H - 12, W, 12);

  // Encode.
  const dataUrl = canvas.toDataURL('image/png', 0.95);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
  );
  if (!blob) return null;
  return { blob, dataUrl };
}

export function shareCardFilename(username: string): string {
  const safe = username.replace(/[^a-z0-9-_]/gi, '').toLowerCase() || 'verdict';
  return `truthorcap-${safe}.png`;
}
