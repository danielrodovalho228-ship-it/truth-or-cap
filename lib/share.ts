// Share message templates per channel. Keep copy short — OG image carries
// the visual punch, the message just nudges the click.

export type ShareChannel = 'native' | 'whatsapp' | 'twitter' | 'copy';

export interface ShareInput {
  username: string;
  susLevel: number;
  question: string;
  url: string;
}

function emojiFor(susLevel: number): string {
  if (susLevel >= 70) return '🚨';
  if (susLevel >= 40) return '🤔';
  return '😎';
}

export function buildShareText({ username, susLevel, question, url }: ShareInput): string {
  const e = emojiFor(susLevel);
  return `@${username} hit ${susLevel}% SUS on Truth or Cap ${e}\n\n"${question}"\n\nCan you spot the cap?\n${url}`;
}

export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function twitterIntent(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
