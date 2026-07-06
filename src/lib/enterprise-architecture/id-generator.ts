/**
 * Reusable Enterprise ID Generator.
 * Prefixes are metadata-driven — never hardcoded in consumer modules.
 */

import { DEFAULT_ENTERPRISE_ID_PREFIXES } from "@/constants/enterprise-id-prefixes";
import type { EnterpriseIdPrefixConfig } from "@/types/enterprise-architecture";

let prefixRegistry: Map<string, EnterpriseIdPrefixConfig> = new Map(
  DEFAULT_ENTERPRISE_ID_PREFIXES.map((p) => [p.code.toUpperCase(), p]),
);

let sequenceCounters: Record<string, number> = {};

/** Register or override a prefix at design-time bootstrap. */
export function registerEnterpriseIdPrefix(config: EnterpriseIdPrefixConfig): void {
  prefixRegistry.set(config.code.toUpperCase(), config);
  if (sequenceCounters[config.code.toUpperCase()] === undefined) {
    sequenceCounters[config.code.toUpperCase()] = 0;
  }
}

export function getEnterpriseIdPrefixes(): EnterpriseIdPrefixConfig[] {
  return Array.from(prefixRegistry.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export function getEnterpriseIdPrefix(code: string): EnterpriseIdPrefixConfig | undefined {
  return prefixRegistry.get(code.toUpperCase());
}

/** Format an enterprise ID from prefix code and sequence number. */
export function formatEnterpriseId(
  prefixCode: string,
  sequence: number,
  padLength?: number,
): string {
  const prefix = getEnterpriseIdPrefix(prefixCode);
  const code = prefixCode.toUpperCase();
  const pad = padLength ?? prefix?.padLength ?? 6;
  return `${code}-${String(sequence).padStart(pad, "0")}`;
}

/** Generate next sequential ID for a registered prefix. Design-time / admin use only. */
export function generateEnterpriseId(prefixCode: string): string {
  const code = prefixCode.toUpperCase();
  if (!prefixRegistry.has(code)) {
    throw new Error(`Unknown enterprise ID prefix: ${prefixCode}. Register via registerEnterpriseIdPrefix().`);
  }
  const next = (sequenceCounters[code] ?? 0) + 1;
  sequenceCounters[code] = next;
  return formatEnterpriseId(code, next);
}

/** Seed sequence counters from existing registry records — design-time sync only. */
export function seedEnterpriseIdSequences(existingIds: string[]): void {
  for (const id of existingIds) {
    const parsed = parseEnterpriseId(id);
    if (!parsed) continue;
    const current = sequenceCounters[parsed.prefix] ?? 0;
    if (parsed.sequence > current) {
      sequenceCounters[parsed.prefix] = parsed.sequence;
    }
  }
}

export function parseEnterpriseId(
  id: string,
): { prefix: string; sequence: number } | null {
  const match = /^([A-Z]+)-(\d+)$/.exec(id.trim().toUpperCase());
  if (!match) return null;
  return { prefix: match[1]!, sequence: parseInt(match[2]!, 10) };
}

export function resetEnterpriseIdGenerator(): void {
  prefixRegistry = new Map(DEFAULT_ENTERPRISE_ID_PREFIXES.map((p) => [p.code.toUpperCase(), p]));
  sequenceCounters = {};
}
