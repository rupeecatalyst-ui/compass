/**
 * CO-ARCH-001 Wave 4 — Tier 2 registry seed catalog (Infrastructure SSOT).
 * Derives Product / Document / Lender registry rows from existing TypeScript constants.
 */
import type {
  DocumentRegistryCategory,
  LenderInstitutionCategory,
  ProductLifecycleStatus,
  ProductOperationalStatus,
} from "@prisma/client";
import { listEcmMasterOptionsFromCatalog } from "@/constants/enterprise-contact-master/masters";
import { LENDER_MASTER_SEED_CATALOG } from "@/constants/enterprise-lender-registry/master-seed-catalog";
import {
  ORG_DOC_CATEGORIES,
  ORG_DOC_SYSTEM_TYPES,
} from "@/constants/organization-documents";
import { DEFAULT_PRODUCT_CATEGORIES } from "@/data/catalyst-one/product-library/product-categories-seed";
import { DEFAULT_PRODUCT_DEFINITIONS } from "@/data/catalyst-one/product-library/product-definitions-seed";
import { DEFAULT_PRODUCT_GROUPS } from "@/data/catalyst-one/product-library/product-groups-seed";
import { normalizeLenderRegistryCode } from "@server/repositories/lender-registry/mappers";
import { normalizeProductRegistryCode } from "@server/repositories/product-registry/mappers";
import type { ProductDefinition } from "@/types/product-library";

export interface ProductCategorySeed {
  code: string;
  label: string;
  description?: string;
  sortOrder: number;
}

export interface ProductGroupSeed {
  code: string;
  label: string;
  categoryCode: string;
  description?: string;
  sortOrder: number;
}

export interface ProductSeed {
  code: string;
  label: string;
  categoryCode: string;
  groupCode: string;
  description?: string;
  shortDescription?: string;
  lifecycleStatus: ProductLifecycleStatus;
  operationalStatus: ProductOperationalStatus;
  majorVersion: number;
  minorVersion: number;
  tags?: string[];
  productOwner?: string;
}

export interface DocumentTypeSeed {
  code: string;
  label: string;
  category: DocumentRegistryCategory;
  description?: string;
  sortOrder: number;
}

export interface DocumentDefinitionSeed {
  code: string;
  label: string;
  typeCode: string;
  category: DocumentRegistryCategory;
  sortOrder: number;
}

export interface LenderCategorySeed {
  code: string;
  label: string;
  sortOrder: number;
}

export interface LenderSeed {
  code: string;
  label: string;
  legalName?: string;
  displayName?: string;
  shortName?: string;
  categoryCode: string;
  institutionCategory: LenderInstitutionCategory;
  classification?: string;
  sortOrder: number;
  website?: string;
  headquartersLabel?: string;
  productsSupported?: string[];
  aliases?: string[];
}

export interface LenderProgramSeed {
  code: string;
  label: string;
  lenderCode: string;
  sortOrder: number;
}

const ORG_DOC_CATEGORY_MAP: Record<string, DocumentRegistryCategory> = {
  legal: "legal",
  banking_finance: "financial",
  compliance: "compliance",
  branding: "general",
  templates: "operational",
  others: "general",
};

const LENDER_CATEGORIES: LenderCategorySeed[] = [
  { code: "bank", label: "Bank", sortOrder: 1 },
  { code: "nbfc", label: "NBFC", sortOrder: 2 },
  { code: "hfc", label: "HFC", sortOrder: 3 },
  { code: "fintech", label: "Fintech", sortOrder: 4 },
  { code: "cooperative", label: "Cooperative", sortOrder: 5 },
  { code: "other", label: "Other", sortOrder: 6 },
];

function lifecycleRank(status: string): number {
  switch (status) {
    case "published":
      return 50;
    case "approved":
      return 40;
    case "review":
      return 30;
    case "draft":
      return 20;
    case "deprecated":
      return 10;
    case "archived":
      return 0;
    default:
      return 15;
  }
}

function mapLifecycleStatus(status: string): ProductLifecycleStatus {
  const allowed: ProductLifecycleStatus[] = [
    "draft",
    "review",
    "approved",
    "published",
    "deprecated",
    "archived",
  ];
  if (allowed.includes(status as ProductLifecycleStatus)) {
    return status as ProductLifecycleStatus;
  }
  return "published";
}

function mapOperationalStatus(status: string): ProductOperationalStatus {
  const allowed: ProductOperationalStatus[] = [
    "active",
    "inactive",
    "pilot",
    "coming_soon",
    "retired",
  ];
  return allowed.includes(status as ProductOperationalStatus)
    ? (status as ProductOperationalStatus)
    : "active";
}

function preferProductDefinition(
  a: ProductDefinition,
  b: ProductDefinition,
): ProductDefinition {
  const rankDiff = lifecycleRank(b.lifecycleStatus) - lifecycleRank(a.lifecycleStatus);
  if (rankDiff !== 0) return rankDiff > 0 ? b : a;
  if (b.majorVersion !== a.majorVersion) return b.majorVersion > a.majorVersion ? b : a;
  if (b.minorVersion !== a.minorVersion) return b.minorVersion > a.minorVersion ? b : a;
  return a;
}

function buildUniquePublishedProducts(): ProductDefinition[] {
  const byCode = new Map<string, ProductDefinition>();
  for (const def of DEFAULT_PRODUCT_DEFINITIONS) {
    const code = normalizeProductRegistryCode(def.productCode || def.productId);
    if (!code) continue;
    const existing = byCode.get(code);
    if (!existing) {
      byCode.set(code, def);
      continue;
    }
    byCode.set(code, preferProductDefinition(existing, def));
  }
  return Array.from(byCode.values());
}

function inferLenderInstitutionCategory(
  lenderId: string,
  label: string,
  meta?: Record<string, string>,
): LenderInstitutionCategory {
  const hay = `${lenderId} ${label} ${meta?.category ?? ""}`.toLowerCase();
  if (hay.includes("hfc") || hay.includes("housing")) return "hfc";
  if (hay.includes("nbfc") || hay.includes("finance")) return "nbfc";
  if (hay.includes("cooperative")) return "cooperative";
  if (hay.includes("other")) return "other";
  return "bank";
}

export function getProductCategorySeeds(): ProductCategorySeed[] {
  return DEFAULT_PRODUCT_CATEGORIES.map((c) => ({
    code: normalizeProductRegistryCode(c.categoryCode),
    label: c.categoryName,
    description: c.description,
    sortOrder: c.sortOrder,
  }));
}

export function getProductGroupSeeds(): ProductGroupSeed[] {
  const categoryIdToCode = new Map(
    DEFAULT_PRODUCT_CATEGORIES.map((c) => [
      c.id,
      normalizeProductRegistryCode(c.categoryCode),
    ]),
  );
  return DEFAULT_PRODUCT_GROUPS.map((g) => ({
    code: normalizeProductRegistryCode(g.groupCode),
    label: g.groupName,
    categoryCode: categoryIdToCode.get(g.categoryId) ?? "LENDING",
    description: g.description,
    sortOrder: g.sortOrder,
  }));
}

export function getProductSeeds(): ProductSeed[] {
  const categoryIdToCode = new Map(
    DEFAULT_PRODUCT_CATEGORIES.map((c) => [
      c.id,
      normalizeProductRegistryCode(c.categoryCode),
    ]),
  );
  const groupIdToCode = new Map(
    DEFAULT_PRODUCT_GROUPS.map((g) => [g.id, normalizeProductRegistryCode(g.groupCode)]),
  );

  const seeds: ProductSeed[] = [];
  const seen = new Set<string>();

  for (const def of buildUniquePublishedProducts()) {
    const code = normalizeProductRegistryCode(def.productCode || def.productId);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    seeds.push({
      code,
      label: def.productName,
      categoryCode: categoryIdToCode.get(def.categoryId) ?? "LENDING",
      groupCode: groupIdToCode.get(def.groupId) ?? "SECURED_RETAIL",
      description: def.description,
      shortDescription: def.shortDescription,
      lifecycleStatus: mapLifecycleStatus(def.lifecycleStatus),
      operationalStatus: mapOperationalStatus(def.operationalStatus),
      majorVersion: def.majorVersion,
      minorVersion: def.minorVersion,
      tags: def.tags,
      productOwner: def.productOwner,
    });
  }

  // Preserve ECM product picker continuity under first lending group
  const lendingGroups = getProductGroupSeeds()
    .filter((g) => g.categoryCode === "LENDING")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const firstLendingGroup = lendingGroups[0];
  if (firstLendingGroup) {
    for (const option of listEcmMasterOptionsFromCatalog("product")) {
      if (option.id === "other" || option.label.trim().toLowerCase() === "other") continue;
      const code = normalizeProductRegistryCode(option.id);
      if (!code || seen.has(code)) continue;
      seen.add(code);
      seeds.push({
        code,
        label: option.label,
        categoryCode: firstLendingGroup.categoryCode,
        groupCode: firstLendingGroup.code,
        lifecycleStatus: "published",
        operationalStatus: "active",
        majorVersion: 1,
        minorVersion: 0,
      });
    }
  }

  return seeds;
}

export function getDocumentTypeSeeds(): DocumentTypeSeed[] {
  return ORG_DOC_CATEGORIES.map((c) => ({
    // Keep org-doc category ids (lowercase) for picker continuity
    code: c.id,
    label: c.label,
    category: ORG_DOC_CATEGORY_MAP[c.id] ?? "general",
    description: c.description,
    sortOrder: c.sortOrder,
  }));
}

export function getDocumentDefinitionSeeds(): DocumentDefinitionSeed[] {
  return ORG_DOC_SYSTEM_TYPES.map((t) => ({
    code: t.id,
    label: t.label,
    typeCode: t.categoryId,
    category: ORG_DOC_CATEGORY_MAP[t.categoryId] ?? "general",
    sortOrder: t.sortOrder,
  }));
}

export function getLenderCategorySeeds(): LenderCategorySeed[] {
  return LENDER_CATEGORIES.map((c) => ({
    code: normalizeLenderRegistryCode(c.code),
    label: c.label,
    sortOrder: c.sortOrder,
  }));
}

/**
 * CO-LENDER-ARCH-001 — Enterprise Lender Registry master catalog (~83 lenders).
 * Published on seed (status/lifecycle/enabled active). Replaces ECM 6-lender list.
 */
export function getLenderSeeds(): LenderSeed[] {
  return LENDER_MASTER_SEED_CATALOG.map((l, index) => ({
    code: normalizeLenderRegistryCode(l.seedKey),
    label: l.displayName,
    legalName: l.legalName,
    displayName: l.displayName,
    shortName: l.shortName,
    categoryCode: normalizeLenderRegistryCode(l.institutionCategory),
    institutionCategory: l.institutionCategory,
    classification: l.classification,
    sortOrder: index + 1,
    website: l.website,
    headquartersLabel: l.headquartersLabel,
    productsSupported: [...l.productsSupported],
    aliases: [...l.aliases],
  }));
}

export function getLenderProgramSeeds(): LenderProgramSeed[] {
  // Commercial programs are managed in Lender Registry admin — not ECM region clones.
  return [];
}

export function countExpectedTier2Seeds(): {
  productCategories: number;
  productGroups: number;
  products: number;
  documentTypes: number;
  documentDefinitions: number;
  lenderCategories: number;
  lenders: number;
  programs: number;
} {
  return {
    productCategories: getProductCategorySeeds().length,
    productGroups: getProductGroupSeeds().length,
    products: getProductSeeds().length,
    documentTypes: getDocumentTypeSeeds().length,
    documentDefinitions: getDocumentDefinitionSeeds().length,
    lenderCategories: getLenderCategorySeeds().length,
    lenders: getLenderSeeds().length,
    programs: getLenderProgramSeeds().length,
  };
}

