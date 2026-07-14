/**
 * Session memory for greeting anti-repetition (CF-CHANAKYA-002).
 * Browser sessionStorage when available; in-memory fallback for SSR / tests.
 */

const STORAGE_KEY = "chanakya.greeting.used.v1";
const SURFACE_KEY = "chanakya.greeting.surface.v1";

const memoryUsed = new Set<string>();
const memorySurfaces = new Map<string, { greetingId: string; text: string; expiresAt: number }>();

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function listUsedChanakyaGreetingIds(): string[] {
  if (!canUseStorage()) return [...memoryUsed];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [...memoryUsed];
  }
}

export function markChanakyaGreetingUsed(id: string): void {
  memoryUsed.add(id);
  if (!canUseStorage()) return;
  try {
    const next = new Set(listUsedChanakyaGreetingIds());
    next.add(id);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearUsedChanakyaGreetings(): void {
  memoryUsed.clear();
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Sticky greeting per surface for ~12 minutes to avoid flicker on re-render. */
const SURFACE_TTL_MS = 12 * 60 * 1000;

export function getStickyChanakyaGreeting(
  surfaceKey: string,
): { greetingId: string; text: string } | null {
  const now = Date.now();
  if (!canUseStorage()) {
    const hit = memorySurfaces.get(surfaceKey);
    if (!hit || hit.expiresAt < now) return null;
    return { greetingId: hit.greetingId, text: hit.text };
  }
  try {
    const raw = window.sessionStorage.getItem(SURFACE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, { greetingId: string; text: string; expiresAt: number }>;
    const hit = map[surfaceKey];
    if (!hit || hit.expiresAt < now) return null;
    return { greetingId: hit.greetingId, text: hit.text };
  } catch {
    return null;
  }
}

export function setStickyChanakyaGreeting(
  surfaceKey: string,
  greetingId: string,
  text: string,
): void {
  const entry = { greetingId, text, expiresAt: Date.now() + SURFACE_TTL_MS };
  memorySurfaces.set(surfaceKey, entry);
  if (!canUseStorage()) return;
  try {
    const raw = window.sessionStorage.getItem(SURFACE_KEY);
    const map = raw
      ? (JSON.parse(raw) as Record<string, { greetingId: string; text: string; expiresAt: number }>)
      : {};
    map[surfaceKey] = entry;
    window.sessionStorage.setItem(SURFACE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
