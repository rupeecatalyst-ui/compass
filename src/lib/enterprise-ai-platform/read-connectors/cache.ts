/**
 * Enterprise Read Cache — framework only (CO-AI-104).
 * Disabled by default. No production cache backend.
 */

import {
  EAI_DEFAULT_READ_CACHE_POLICY,
} from "@/constants/enterprise-ai-platform/read-connectors";
import type {
  EaiReadCachePolicy,
  EaiReadProjection,
} from "@/types/enterprise-ai-read-connectors";

interface CacheEntry {
  key: string;
  projection: EaiReadProjection;
  storedAtMs: number;
}

let policy: EaiReadCachePolicy = { ...EAI_DEFAULT_READ_CACHE_POLICY };
const store = new Map<string, CacheEntry>();

export function getEaiReadCachePolicy(): EaiReadCachePolicy {
  return { ...policy };
}

export function configureEaiReadCachePolicy(next: Partial<EaiReadCachePolicy>): void {
  policy = { ...policy, ...next };
}

export function resetEaiReadCache(): void {
  store.clear();
  policy = { ...EAI_DEFAULT_READ_CACHE_POLICY };
}

export function buildEaiReadCacheKey(parts: {
  connectorId: string;
  sessionId: string;
  entityKey?: string;
  hintHash?: string;
}): string {
  return [parts.connectorId, parts.sessionId, parts.entityKey ?? "-", parts.hintHash ?? "-"].join(
    "|",
  );
}

export function getEaiReadCache(key: string): EaiReadProjection | undefined {
  if (!policy.enabled) return undefined;
  const entry = store.get(key);
  if (!entry) return undefined;
  const ageSec = (Date.now() - entry.storedAtMs) / 1000;
  if (ageSec > policy.ttlSeconds) {
    store.delete(key);
    return undefined;
  }
  return entry.projection;
}

export function setEaiReadCache(key: string, projection: EaiReadProjection): void {
  if (!policy.enabled) return;
  if (store.size >= policy.maxEntries) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(key, { key, projection, storedAtMs: Date.now() });
}
