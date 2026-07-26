/**
 * CO-ARCH-001-I5a — Dual-read Reference Master port (constants + PostgreSQL cache).
 * Constants win on code collision until I6 port swap.
 */
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import { isReferenceMasterPortRuntimeActive } from "@/constants/enterprise-master-data/dual-read";
import type {
  ReferenceMasterPort,
  ReferenceMasterPortOption,
} from "@/types/reference-master-port";
import { constantsReferenceMasterPort } from "./constants-port";
import { getReferenceMasterDomainCache } from "./cache-store";

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

function mergeOptions(
  constants: ReferenceMasterPortOption[],
  database: ReferenceMasterPortOption[],
  runtimeActive: boolean,
): ReferenceMasterPortOption[] {
  const byCode = new Map<string, ReferenceMasterPortOption>();
  const primary = runtimeActive ? database : constants;
  const secondary = runtimeActive ? constants : database;

  for (const option of primary) {
    byCode.set(normalizeCode(option.id), {
      ...option,
      source: runtimeActive ? "database" : "constants",
    });
  }
  for (const option of secondary) {
    const key = normalizeCode(option.id);
    if (!byCode.has(key)) {
      byCode.set(key, option);
    }
  }

  const merged = Array.from(byCode.values());
  merged.sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label),
  );
  return merged.map((option) => ({
    ...option,
    source: option.source === "constants" || option.source === "database" ? "merged" : option.source,
  }));
}

function filterByParent(
  options: ReferenceMasterPortOption[],
  domain: ReferenceMasterDomainCode,
  parentId?: string,
): ReferenceMasterPortOption[] {
  if (domain === "occupation" && !parentId) return [];
  if (!parentId) return options.filter((o) => !o.parentId);
  const normalizedParent = normalizeCode(parentId);
  return options.filter(
    (o) => o.parentId && normalizeCode(o.parentId) === normalizedParent,
  );
}

export const dualReadReferenceMasterPort: ReferenceMasterPort = {
  listOptions(domain, parentId) {
    const runtimeActive = isReferenceMasterPortRuntimeActive();
    const constants = constantsReferenceMasterPort.listOptions(domain, parentId);
    const database = filterByParent(getReferenceMasterDomainCache(domain), domain, parentId);
    return mergeOptions(
      Array.isArray(constants) ? constants : [],
      database,
      runtimeActive,
    );
  },
  getLabel(domain, id) {
    const runtimeActive = isReferenceMasterPortRuntimeActive();
    if (runtimeActive && id) {
      const key = normalizeCode(id);
      const fromDb = getReferenceMasterDomainCache(domain).find(
        (o) => normalizeCode(o.id) === key,
      );
      if (fromDb) return fromDb.label;
    }
    return constantsReferenceMasterPort.getLabel(domain, id) || id || "";
  },
  getOption(domain, id) {
    if (!id) return undefined;
    const runtimeActive = isReferenceMasterPortRuntimeActive();
    const key = normalizeCode(id);
    if (runtimeActive) {
      const fromDb = getReferenceMasterDomainCache(domain).find(
        (o) => normalizeCode(o.id) === key,
      );
      if (fromDb) return fromDb;
    }
    const fromConstants = constantsReferenceMasterPort.getOption(domain, id);
    if (fromConstants) return { ...fromConstants, source: "merged" };
    return getReferenceMasterDomainCache(domain).find(
      (o) => normalizeCode(o.id) === key,
    );
  },
};
