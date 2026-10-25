/**
 * Process-local Google Sheets read coalescing + TTL cache.
 * Does not persist rows into CRM / Supabase audience import.
 */

import { MARKETING_SHEETS_READ_CACHE_TTL_MS } from "@/constants/enterprise-marketing-engine/data-source";

type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

let hits = 0;
let misses = 0;
let inflightJoined = 0;
let googleCalls = 0;
let lastSuccessfulSyncAt: string | null = null;

export function getLastSuccessfulSheetsSyncAt(): string | null {
  return lastSuccessfulSyncAt;
}

export function markSuccessfulSheetsSync(at = new Date().toISOString()): void {
  lastSuccessfulSyncAt = at;
}

export function getGoogleSheetsReadCacheStats() {
  return {
    hits,
    misses,
    inflightJoined,
    googleCalls,
    size: cache.size,
    lastSuccessfulSyncAt,
  };
}

export function resetGoogleSheetsReadCache(): void {
  cache.clear();
  inflight.clear();
  hits = 0;
  misses = 0;
  inflightJoined = 0;
  googleCalls = 0;
  lastSuccessfulSyncAt = null;
}

export function rememberGoogleSheetsRead<T>(key: string, value: T): void {
  cache.set(key, { value, storedAt: Date.now() });
}

export function peekGoogleSheetsReadCache<T>(key: string, ttlMs = MARKETING_SHEETS_READ_CACHE_TTL_MS): T | undefined {
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  if (!cached) return undefined;
  if (Date.now() - cached.storedAt >= ttlMs) return undefined;
  return cached.value;
}

export async function coalesceGoogleSheetsRead<T>(input: {
  key: string;
  read: () => Promise<T>;
  ttlMs?: number;
  bypass?: boolean;
}): Promise<T> {
  const ttlMs = input.ttlMs ?? MARKETING_SHEETS_READ_CACHE_TTL_MS;
  const now = Date.now();
  if (!input.bypass) {
    const cached = cache.get(input.key) as CacheEntry<T> | undefined;
    if (cached && now - cached.storedAt < ttlMs) {
      hits += 1;
      return cached.value;
    }
    const pending = inflight.get(input.key) as Promise<T> | undefined;
    if (pending) {
      inflightJoined += 1;
      return pending;
    }
  }

  misses += 1;
  const run = (async () => {
    googleCalls += 1;
    const value = await input.read();
    cache.set(input.key, { value, storedAt: Date.now() });
    markSuccessfulSheetsSync();
    return value;
  })();
  inflight.set(input.key, run);
  try {
    return await run;
  } finally {
    inflight.delete(input.key);
  }
}
