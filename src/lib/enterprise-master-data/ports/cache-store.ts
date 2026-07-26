/**
 * CO-ARCH-001-I5a — In-memory cache for PostgreSQL reference master rows (hydration layer).
 */
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import type { EnterpriseReferenceMasterRecord } from "@/types/enterprise-master-data";
import type { ReferenceMasterPortOption } from "@/types/reference-master-port";

const cache = new Map<ReferenceMasterDomainCode, ReferenceMasterPortOption[]>();

function recordToPortOption(
  record: EnterpriseReferenceMasterRecord,
  idToCode: Map<string, string>,
): ReferenceMasterPortOption {
  return {
    id: record.code,
    label: record.label,
    parentId: record.parentId ? idToCode.get(record.parentId) : undefined,
    meta: record.meta
      ? Object.fromEntries(
          Object.entries(record.meta).map(([k, v]) => [k, String(v)]),
        )
      : undefined,
    enabled: record.enabled,
    sortOrder: record.sortOrder,
    source: "database",
  };
}

export function setReferenceMasterDomainCache(
  domain: ReferenceMasterDomainCode,
  records: EnterpriseReferenceMasterRecord[],
): void {
  const idToCode = new Map(records.map((r) => [r.id, r.code]));
  cache.set(
    domain,
    records
      .filter((r) => !r.isDeleted && r.status === "active" && r.enabled)
      .map((r) => recordToPortOption(r, idToCode))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label)),
  );
}

export function getReferenceMasterDomainCache(
  domain: ReferenceMasterDomainCode,
): ReferenceMasterPortOption[] {
  return cache.get(domain) ?? [];
}

export function clearReferenceMasterPortCache(): void {
  cache.clear();
}

export function getReferenceMasterCacheSize(): number {
  let total = 0;
  for (const rows of cache.values()) total += rows.length;
  return total;
}
