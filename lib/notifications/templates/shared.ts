// Shared HTML wrapper used by every email template.
// Self-contained, table-based, mobile-first, inline styles.
// Logo + hero are inline SVG (data: URL) so they render even when external
// images are blocked by Gmail/Outlook (default for first-time senders).

export interface BrandColors {
  bg: string;
  bgCard: string;
  fg: string;
  accent: string;
  accent2: string;
  muted: string;
  cream: string;
}

export const brand: BrandColors = {
  bg: '#fde9f3',       // soft rosa
  bgCard: '#ffffff',
  fg: '#3d0066',       // deep violet
  accent: '#ff3d8b',   // hot rosa
  accent2: '#9d3bff',  // violet
  muted: '#6b3a85',
  cream: '#fff8e7',
};

export interface Layout {
  preheader?: string;
  /** Hero section: huge emoji + gradient background (the visual "punch"). */
  heroEmoji: string;
  /** Optional second decorative emoji floating in the hero. */
  heroAccent?: string;
  /** Color theme for the hero gradient: 'rosa' (default), 'violet', 'mint', 'mustard'. */
  heroTheme?: 'rosa' | 'violet' | 'mint' | 'mustard';
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryUrl?: string;
  footnote?: string;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://truthorcapapp.com';

// Inline SVG logo as a data URL. Renders in 99% of email clients.
const LOGO_SVG_DATA_URL = (() => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 64" width="280" height="64">' +
    '<defs>' +
      '<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">' +
        '<stop offset="0%" stop-color="#3d0066"/>' +
        '<stop offset="55%" stop-color="#9d3bff"/>' +
        '<stop offset="100%" stop-color="#ff3d8b"/>' +
      '</linearGradient>' +
    '</defs>' +
    '<text x="0" y="42" font-family="Georgia, serif" font-size="38" font-weight="900" fill="url(#g)">truth</text>' +
    '<text x="118" y="42" font-family="Georgia, serif" font-size="30" font-style="italic" fill="#9d3bff">or</text>' +
    '<text x="158" y="42" font-family="Georgia, serif" font-size="38" font-weight="900" fill="#ff3d8b">cap</text>' +
    // Cap (baseball hat) sticker on the period
    '<circle cx="252" cy="38" r="6" fill="#ff3d8b"/>' +
    '<path d="M236 30 Q252 18 268 30 L268 34 L236 34 Z" fill="#3d0066"/>' +
    '<rect x="234" y="34" width="36" height="3" fill="#3d0066"/>' +
    '<ellipse cx="251" cy="32" rx="4" ry="2" fill="#fff8e7"/>' +
    '</svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
})();

const HERO_THEMES: Record<string, { bg: string; emojiShadow: string; pattern: string }> = {
  rosa: {
    bg: 'linear-gradient(135deg, #ff3d8b 0%, #ff7eb6 50%, #ffb3d1 100%)',
    emojiShadow: '0 8px 0 rgba(61, 0, 102, 0.25)',
    pattern: '#ff3d8b',
  },
  violet: {
    bg: 'linear-gradient(135deg, #9d3bff 0%, #b975ff 50%, #d4a8ff 100%)',
    emojiShadow: '0 8px 0 rgba(61, 0, 102, 0.3)',
    pattern: '#9d3bff',
  },
  mint: {
    bg: 'linear-gradient(135deg, #00d09c 0%, #4dd9b5 50%, #a3e9d4 100%)',
    emojiShadow: '0 8px 0 rgba(0, 80, 60, 0.25)',
    pattern: '#00d09c',
  },
  mustard: {
    bg: 'linear-gradient(135deg, #ffc73d 0%, #ffe59c 50%, #fff3c7 100%)',
    emojiShadow: '0 8px 0 rgba(102, 70, 0, 0.25)',
    pattern: '#ffc73d',
  },
};

export function wrap(layout: Layout): string {
  const {
    preheader,
    heroEmoji,
    heroAccent,
    heroTheme = 'rosa',
    title,
    body,
    ctaLabel,
    ctaUrl,
    ctaSecondaryLabel,
    ctaSecondaryUrl,
    footnote,
  } = layout;
  const theme = HERO_THEMES[heroTheme] ?? HERO_THEMES.rosa;

  return '<!doctype html>' +
'<html lang="pt-BR">' +
'<head>' +
'<meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<meta name="color-scheme" content="light only">' +
'<title>' + esc(title) + '</title>' +
'</head>' +
'<body style="margin:0;padding:0;background:' + brand.bg + ';font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;color:' + brand.fg + ';">' +
(preheader ? '<div style="display:none;max-height:0;overflow:hidden;color:transparent;font-size:1px;line-height:1px;">' + esc(preheader) + '</div>' : '') +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + brand.bg + ';">' +
  '<tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">' +

      // Logo header
      '<tr><td align="center" style="padding:8px 0 18px;">' +
        '<a href="' + SITE + '" style="text-decoration:none;display:inline-block;">' +
          '<img src="' + LOGO_SVG_DATA_URL + '" width="220" height="50" alt="Truth or Cap" style="display:block;border:0;outline:none;text-decoration:none;height:50px;width:220px;">' +
        '</a>' +
      '</td></tr>' +

      // Hero banner (gradient + emoji XL)
      '<tr><td style="background:' + brand.bgCard + ';border-radius:24px 24px 0 0;border:2px solid ' + brand.accent + ';border-bottom:0;padding:0;overflow:hidden;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
          '<tr><td align="center" style="background:' + theme.bg + ';padding:36px 20px 28px;text-align:center;">' +
            '<div style="font-size:96px;line-height:1;text-shadow:' + theme.emojiShadow + ';margin:4px 0;">' + heroEmoji + '</div>' +
            (heroAccent ? '<div style="font-size:32px;line-height:1;margin-top:6px;opacity:0.85;">' + heroAccent + '</div>' : '') +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Card body
      '<tr><td style="background:' + brand.bgCard + ';border-radius:0 0 24px 24px;border:2px solid ' + brand.accent + ';border-top:0;padding:32px 28px 28px;box-shadow:0 6px 0 ' + brand.accent2 + ';">' +
        '<h1 style="margin:0 0 14px 0;font-size:28px;font-weight:900;line-height:1.18;color:' + brand.fg + ';letter-spacing:-0.5px;">' + esc(title) + '</h1>' +
        '<div style="font-size:16px;line-height:1.6;color:' + brand.muted + ';">' + body + '</div>' +
        (ctaUrl && ctaLabel ?
          '<div style="text-align:center;margin:28px 0 8px;">' +
            '<a href="' + ctaUrl + '" style="display:inline-block;background:' + brand.accent + ';color:#ffffff;text-decoration:none;font-weight:900;font-size:18px;padding:18px 32px;border-radius:14px;border:2px solid ' + brand.fg + ';box-shadow:0 5px 0 ' + brand.fg + ';letter-spacing:-0.2px;">' + esc(ctaLabel) + ' &rarr;</a>' +
          '</div>' : '') +
        (ctaSecondaryUrl && ctaSecondaryLabel ?
          '<div style="text-align:center;margin:14px 0 0;">' +
            '<a href="' + ctaSecondaryUrl + '" style="display:inline-block;color:' + brand.accent2 + ';text-decoration:underline;font-weight:700;font-size:14px;">' + esc(ctaSecondaryLabel) + '</a>' +
          '</div>' : '') +
        (footnote ? '<p style="font-size:12px;color:' + brand.muted + ';margin-top:24px;line-height:1.5;border-top:1px solid #f0d6e6;padding-top:16px;">' + footnote + '</p>' : '') +
      '</td></tr>' +

      // Social proof + viral nudge
      '<tr><td align="center" style="padding:18px 16px 4px;">' +
        '<p style="font-size:13px;color:' + brand.fg + ';margin:0 0 6px;font-weight:700;">' +
          'Compartilha com a galera 🔗' +
        '</p>' +
        '<p style="font-size:12px;color:' + brand.muted + ';margin:0;line-height:1.5;">' +
          'Família, casal ou grupo &middot; <a href="' + SITE + '/online" style="color:' + brand.accent + ';text-decoration:none;font-weight:700;">Joga agora</a>' +
        '</p>' +
      '</td></tr>' +

      // Footer
      '<tr><td align="center" style="padding:18px 12px 4px;font-size:11px;color:' + brand.muted + ';line-height:1.6;">' +
        'Truth or Cap &mdash; AI lie detector party game.<br>' +
        '<a href="' + SITE + '/settings/notifications" style="color:' + brand.accent2 + ';text-decoration:underline;">Manage notifications</a>' +
        ' &middot; ' +
        '<a href="' + SITE + '" style="color:' + brand.accent2 + ';text-decoration:underline;">Open app</a>' +
      '</td></tr>' +

    '</table>' +
  '</td></tr>' +
'</table>' +
'</body></html>';
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const _esc = esc;
