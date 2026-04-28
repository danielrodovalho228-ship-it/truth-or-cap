// Generated avatar helpers. We use DiceBear (open API) for fallback avatars
// — no auth, deterministic by seed, returns SVG. Saves us bundling an SVG
// generator on the client.

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x';

export type AvatarStyle =
  | 'shapes'
  | 'thumbs'
  | 'pixel-art'
  | 'identicon'
  | 'big-smile';

const STYLE_ORDER: AvatarStyle[] = ['shapes', 'thumbs', 'pixel-art', 'identicon', 'big-smile'];

export function generatedAvatarUrl(seed: string, style: AvatarStyle = 'shapes'): string {
  const safeSeed = encodeURIComponent(seed || 'truthorcap');
  return `${DICEBEAR_BASE}/${style}/svg?seed=${safeSeed}&backgroundColor=0a0a0a,fbbf24,a8ff00,fef08a&size=256`;
}

export function generatedAvatarSet(seed: string): Array<{ style: AvatarStyle; url: string }> {
  return STYLE_ORDER.map((style) => ({ style, url: generatedAvatarUrl(seed, style) }));
}

/** Compress an image File client-side before upload (max 512px, JPEG q=0.85). */
export async function compressAvatar(file: File, maxSize = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
