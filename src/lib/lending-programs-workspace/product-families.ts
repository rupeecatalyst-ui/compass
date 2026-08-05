/**
 * CO-LW-004 — Product Family presentation helpers (UI only).
 * Does not mutate Enterprise Product Registry.
 */

import {
  LP_PRODUCT_FAMILY_DEFINITIONS,
  type LpProductFamilyDefinition,
} from "@/constants/lending-programs-workspace";
import {
  getCanonicalProductByCode,
  normalizeProductCodeKey,
} from "@/constants/enterprise-product-master/canonical-catalog";
import { DEFAULT_PRODUCT_GROUPS } from "@/data/catalyst-one/product-library/product-groups-seed";
import type { ProductMasterOption } from "@/lib/enterprise-product-master/options";

export type LpProductFamilyMember = {
  code: string;
  label: string;
};

export type LpProductFamily = {
  id: string;
  label: string;
  sortOrder: number;
  members: LpProductFamilyMember[];
  programmeHintCount: number;
};

function groupLabel(groupCode: string): string {
  return (
    DEFAULT_PRODUCT_GROUPS.find((g) => g.groupCode === groupCode)?.groupName ??
    groupCode
  );
}

function resolveFamilyForProduct(
  product: ProductMasterOption,
): LpProductFamilyDefinition {
  const canonical = getCanonicalProductByCode(product.code);
  const codeKey = normalizeProductCodeKey(
    canonical?.code ?? product.code,
  );
  const groupCode = canonical?.groupCode ?? "";

  for (const family of LP_PRODUCT_FAMILY_DEFINITIONS) {
    if (
      family.canonicalCodes?.some(
        (c) => normalizeProductCodeKey(c) === codeKey,
      )
    ) {
      return family;
    }
  }

  const uniqueGroupFamilies = LP_PRODUCT_FAMILY_DEFINITIONS.filter(
    (f) =>
      f.id !== "other" &&
      !f.canonicalCodes?.length &&
      f.groupCodes.includes(groupCode),
  );
  if (uniqueGroupFamilies.length === 1) return uniqueGroupFamilies[0]!;

  if (groupCode === "HOUSING_LOANS") {
    return LP_PRODUCT_FAMILY_DEFINITIONS.find((f) => f.id === "home_loan")!;
  }
  if (groupCode === "PROFESSIONAL_LOANS") {
    return LP_PRODUCT_FAMILY_DEFINITIONS.find((f) => f.id === "professional")!;
  }

  return (
    LP_PRODUCT_FAMILY_DEFINITIONS.find((f) => f.id === "other") ??
    LP_PRODUCT_FAMILY_DEFINITIONS[LP_PRODUCT_FAMILY_DEFINITIONS.length - 1]!
  );
}

/**
 * Group Product Master options into presentation families for Product View navigation.
 */
export function buildLpProductFamilies(
  products: ProductMasterOption[],
  programmeCountsByProduct?: Record<string, number>,
): LpProductFamily[] {
  const buckets = new Map<string, LpProductFamily>();

  for (const def of LP_PRODUCT_FAMILY_DEFINITIONS) {
    buckets.set(def.id, {
      id: def.id,
      label: def.label,
      sortOrder: def.sortOrder,
      members: [],
      programmeHintCount: 0,
    });
  }

  for (const product of products) {
    const familyDef = resolveFamilyForProduct(product);
    const bucket = buckets.get(familyDef.id);
    if (!bucket) continue;
    const already = bucket.members.some(
      (m) => normalizeProductCodeKey(m.code) === normalizeProductCodeKey(product.code),
    );
    if (already) continue;
    bucket.members.push({
      code: product.code,
      label: product.label || getCanonicalProductByCode(product.code)?.label || product.code,
    });
    const prog =
      programmeCountsByProduct?.[product.code] ??
      programmeCountsByProduct?.[normalizeProductCodeKey(product.code)] ??
      0;
    bucket.programmeHintCount += prog;
  }

  return [...buckets.values()]
    .filter((f) => f.members.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function familyLabelForProductCode(code: string): string {
  const canonical = getCanonicalProductByCode(code);
  if (canonical?.groupCode) return groupLabel(canonical.groupCode);
  return "Other Products";
}
