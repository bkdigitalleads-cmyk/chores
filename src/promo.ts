/**
 * Launch offers ("Chores Pro is free this week") without shipping a new build.
 *
 * On launch the app reads a tiny JSON file from the Chores website. If the current
 * time falls inside the offer window, Pro is unlocked on this iPhone and stays
 * unlocked (the grant is stored locally, like a purchase would be). Nothing about
 * the user is sent: the request is a plain GET for a static file.
 *
 * promo.json on the site looks like:
 *   {"proFree": {"start": "2026-10-09T04:00:00Z", "end": "2026-10-11T04:00:00Z", "label": "Launch week"}}
 * An empty object ({}), a missing file, or no network means no offer.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PROMO_URL = 'https://bkdigitalleads-cmyk.github.io/chores/promo.json';
const GRANT_KEY = 'chores.promoGrant.v1';

export interface PromoGrant {
  label: string;
  grantedAt: string;
}

interface PromoFile {
  proFree?: { start?: string; end?: string; label?: string };
}

export async function getStoredGrant(): Promise<PromoGrant | null> {
  try {
    const raw = await AsyncStorage.getItem(GRANT_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw);
    return g && typeof g.grantedAt === 'string' ? { label: String(g.label ?? 'Launch offer'), grantedAt: g.grantedAt } : null;
  } catch {
    return null;
  }
}

async function fetchPromo(timeoutMs: number): Promise<PromoFile | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${PROMO_URL}?v=${Date.now()}`, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === 'object' ? (json as PromoFile) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Returns a window that is open right now, or null. Exported for tests. */
export function openWindow(file: PromoFile | null, now = Date.now()): { label: string } | null {
  const w = file?.proFree;
  if (!w || !w.start || !w.end) return null;
  const start = Date.parse(w.start);
  const end = Date.parse(w.end);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (now < start || now >= end) return null;
  return { label: String(w.label ?? 'Launch offer') };
}

/**
 * Checks the site for an open offer. If there is one, stores a grant and returns it.
 * Returns null when there is no offer, no network, or the request takes too long.
 */
export async function checkPromo(timeoutMs = 3000): Promise<PromoGrant | null> {
  const file = await fetchPromo(timeoutMs);
  const win = openWindow(file);
  if (!win) return null;
  const grant: PromoGrant = { label: win.label, grantedAt: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(GRANT_KEY, JSON.stringify(grant));
  } catch {
    // if we can't persist, still unlock for this session
  }
  return grant;
}
