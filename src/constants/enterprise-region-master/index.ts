/**
 * CO-MASTER-REGION-001 — Enterprise Region Master (Geography SSOT).
 * Frozen constitutional values for Catalyst One. Exactly four regions — no Other, no free text.
 *
 * Admin surface: Administration → Masters → Geography → Regions
 */

export const ENTERPRISE_REGION_MASTER_IDS = [
  "north",
  "south",
  "east",
  "west",
] as const;

export type EnterpriseRegionMasterId = (typeof ENTERPRISE_REGION_MASTER_IDS)[number];

export interface EnterpriseRegionMasterOption {
  id: EnterpriseRegionMasterId;
  label: "North" | "South" | "East" | "West";
  sortOrder: number;
  /** Indian state codes typically covered (city cascade aid). */
  stateCodes: readonly string[];
  enabled: true;
}

/**
 * Single Source of Truth — Region dropdown values.
 * Do not extend without Product Architecture approval.
 */
export const ENTERPRISE_REGION_MASTER: readonly EnterpriseRegionMasterOption[] = [
  {
    id: "north",
    label: "North",
    sortOrder: 1,
    stateCodes: ["DL", "HR", "PB", "UP", "UK", "HP", "JK", "CH", "LD"],
    enabled: true,
  },
  {
    id: "south",
    label: "South",
    sortOrder: 2,
    stateCodes: ["KA", "TN", "KL", "TG", "AP", "PY"],
    enabled: true,
  },
  {
    id: "east",
    label: "East",
    sortOrder: 3,
    stateCodes: ["WB", "OR", "BH", "JH", "AS", "NL", "MN", "ML", "TR", "MZ", "SK", "AR"],
    enabled: true,
  },
  {
    id: "west",
    label: "West",
    sortOrder: 4,
    stateCodes: ["MH", "GJ", "RJ", "GA", "DD", "DN", "MP"],
    enabled: true,
  },
] as const;

/** Legacy ECM lender-scoped region ids → canonical Enterprise Region Master id (display / remap only). */
export const LEGACY_REGION_ID_ALIASES: Readonly<Record<string, EnterpriseRegionMasterId>> = {
  "hdfc-west": "west",
  "hdfc-south": "south",
  "sbi-west": "west",
  "icici-west": "west",
  "axis-west": "west",
  "kotak-west": "west",
  "bajaj-west": "west",
  west: "west",
  south: "south",
  north: "north",
  east: "east",
};

export function listEnterpriseRegionMasterOptions(): EnterpriseRegionMasterOption[] {
  return [...ENTERPRISE_REGION_MASTER].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function normalizeEnterpriseRegionId(
  id?: string | null,
): EnterpriseRegionMasterId | "" {
  const raw = (id ?? "").trim().toLowerCase();
  if (!raw) return "";
  if ((ENTERPRISE_REGION_MASTER_IDS as readonly string[]).includes(raw)) {
    return raw as EnterpriseRegionMasterId;
  }
  const alias = LEGACY_REGION_ID_ALIASES[raw];
  if (alias) return alias;
  // Label fallback
  if (raw === "north" || raw === "south" || raw === "east" || raw === "west") {
    return raw;
  }
  return "";
}

export function getEnterpriseRegionLabel(id?: string | null): string {
  const normalized = normalizeEnterpriseRegionId(id);
  if (!normalized) {
    // Preserve unknown historical values as Not Specified for display — do not invent.
    return id?.trim() ? "Not Specified" : "";
  }
  return ENTERPRISE_REGION_MASTER.find((r) => r.id === normalized)?.label ?? normalized;
}

export function getEnterpriseRegionStateCodes(
  regionId?: string | null,
): readonly string[] {
  const normalized = normalizeEnterpriseRegionId(regionId);
  if (!normalized) return [];
  return (
    ENTERPRISE_REGION_MASTER.find((r) => r.id === normalized)?.stateCodes ?? []
  );
}

export function isEnterpriseRegionMasterId(
  id?: string | null,
): id is EnterpriseRegionMasterId {
  return Boolean(normalizeEnterpriseRegionId(id));
}
