// =============================================================================
// Phone hashing helpers — client-side. Server NEVER sees raw numbers.
// =============================================================================
//
// Privacy is the whole point: we want to find friends in the user's address
// book without ever sending raw phone numbers across the wire. So:
//
//   1. The browser collects phone numbers (manually pasted OR via Web
//      Contacts API on supported devices).
//   2. We normalize each number into something close to E.164 format —
//      stripping spaces, dashes, parentheses, and adding the country code
//      when it's obviously missing.
//   3. We feed the normalized number + a fixed salt into SHA-256 and send
//      ONLY the hex digest to the server.
//   4. The server compares the digest against `profiles.phone_hash`,
//      returning matched users without ever learning the raw number.
//
// PHONE_SALT is permanent — changing it would orphan every existing match
// because users' stored hashes were computed with the old salt. Pick once,
// keep forever. The value below intentionally lives in code (not env), so
// every deploy gets the same salt without risk of misconfiguration.
//
// English-first launch → defaultCountryCode is +1 (US/Canada). Brazilian
// users (and anyone else) need to include their +xx prefix explicitly.
// When we localize, callers can pass a different default per region.
// =============================================================================

export const PHONE_SALT = 'truthorcap_v1_2026';

/**
 * Strip cosmetic characters and add a country code when one is obviously
 * missing. Result is close to E.164 but not strictly validated — Hume +
 * the matching server tolerate a bit of fuzz.
 */
export function normalizePhone(phone: string, defaultCountryCode = '+1'): string {
  // Keep digits and the leading + only.
  let clean = phone.replace(/[^\d+]/g, '');

  if (!clean.startsWith('+')) {
    if (clean.startsWith('00')) {
      // International prefix in the "00xx" form — convert to "+xx".
      clean = '+' + clean.slice(2);
    } else if (clean.length === 10) {
      // 10-digit number → assume US/CA and prepend +1 by default.
      clean = defaultCountryCode + clean;
    } else if (clean.length === 11 && clean.startsWith('1')) {
      // 11-digit number starting with 1 → US/CA with the country code
      // already in there, just missing the +.
      clean = '+' + clean;
    } else {
      // Best effort: stick a + in front and let downstream handle it.
      clean = '+' + clean;
    }
  }

  return clean;
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash a single phone using SHA-256 + the permanent salt. */
export async function hashPhone(phone: string): Promise<string> {
  const normalized = normalizePhone(phone);
  const data = new TextEncoder().encode(normalized + PHONE_SALT);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hash);
}

/** Hash an array of phone numbers, dropping anything obviously invalid. */
export async function hashContacts(phones: string[]): Promise<string[]> {
  const valid = phones.filter((p) => p && p.replace(/[^\d]/g, '').length >= 8);
  return Promise.all(valid.map(hashPhone));
}

export interface MatchedFriend {
  id: string;
  username: string;
  avatar_url: string | null;
}

/**
 * Server endpoint POST /api/contacts/match accepts up to 500 hashes and
 * returns the matched users in one round-trip.
 */
export async function findMatchingUsers(hashes: string[]): Promise<{
  matched: MatchedFriend[];
  unmatchedCount: number;
}> {
  const resp = await fetch('/api/contacts/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hashes }),
  });
  if (!resp.ok) throw new Error('Contact match failed');
  return resp.json();
}

/**
 * Web Contacts API is Android-Chrome-only at the time of writing. Detect
 * before calling so we can fall back to manual entry on iOS / desktop.
 */
export function hasContactsApi(): boolean {
  if (typeof window === 'undefined') return false;
  return 'contacts' in navigator && 'ContactsManager' in window;
}

/** Open the system contact picker; returns the selected phone numbers. */
export async function pickContactsViaApi(): Promise<string[]> {
  if (!hasContactsApi()) return [];
  try {
    // @ts-expect-error - non-standard API not in TS lib
    const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
    return (contacts as Array<{ tel?: string[] }>)
      .flatMap((c) => c.tel ?? [])
      .filter(Boolean);
  } catch {
    return [];
  }
}

// =============================================================================
// END OF FILE — keep the trailing comments here so any future linter or
// OneDrive sync that pads the file with extra characters lands inside the
// comment block instead of corrupting executable code.
// =============================================================================
