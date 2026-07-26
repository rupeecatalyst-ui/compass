/**
 * CO-ARCH-001-I5b — In-memory cache for Tier 2 PostgreSQL registry rows.
 */
import type {
  EnterpriseDocumentDefinitionRecord,
  EnterpriseDocumentTypeRecord,
} from "@/types/enterprise-document-registry";
import type {
  EnterpriseLenderCategoryRecord,
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
} from "@/types/enterprise-lender-registry";
import type {
  EnterpriseProductCategoryRecord,
  EnterpriseProductGroupRecord,
  EnterpriseProductRecord,
} from "@/types/enterprise-product-registry";
import type {
  DocumentRegistryPortOption,
  LenderRegistryPortOption,
  ProductRegistryPortOption,
} from "@/types/tier2-registry-port";

const productCategories = new Map<string, ProductRegistryPortOption[]>();
const productGroups = new Map<string, ProductRegistryPortOption[]>();
const products = new Map<string, ProductRegistryPortOption[]>();

const documentTypes: DocumentRegistryPortOption[] = [];
const documentDefinitions = new Map<string, DocumentRegistryPortOption[]>();

const lenderCategories: LenderRegistryPortOption[] = [];
const lenders = new Map<string, LenderRegistryPortOption[]>();
const lenderPrograms = new Map<string, LenderRegistryPortOption[]>();

function toProductOption(
  record: { code: string; label: string; enabled: boolean; sortOrder?: number },
): ProductRegistryPortOption {
  return {
    id: record.code,
    label: record.label,
    sortOrder: record.sortOrder ?? 0,
    enabled: record.enabled,
    source: "database",
  };
}

function toDocumentTypeOption(
  record: Pick<EnterpriseDocumentTypeRecord, "code" | "label" | "sortOrder" | "enabled" | "category">,
): DocumentRegistryPortOption {
  return {
    id: record.code,
    label: record.label,
    sortOrder: record.sortOrder,
    enabled: record.enabled,
    category: record.category,
    source: "database",
  };
}

function toLenderOption(
  record: Pick<
    EnterpriseLenderRecord,
    "code" | "label" | "sortOrder" | "enabled" | "categoryId" | "institutionCategory"
  >,
  categoryCode?: string,
): LenderRegistryPortOption {
  return {
    id: record.code,
    label: record.label,
    sortOrder: record.sortOrder,
    enabled: record.enabled,
    categoryId: categoryCode,
    institutionCategory: record.institutionCategory,
    source: "database",
  };
}

export function setProductRegistryCache(input: {
  categories: EnterpriseProductCategoryRecord[];
  groups: EnterpriseProductGroupRecord[];
  products: EnterpriseProductRecord[];
}): void {
  productCategories.clear();
  productGroups.clear();
  products.clear();

  const categoryIdToCode = new Map(input.categories.map((c) => [c.id, c.code]));
  const groupIdToCode = new Map(input.groups.map((g) => [g.id, g.code]));

  productCategories.set(
    "all",
    input.categories
      .filter((c) => !c.isDeleted && c.status === "active" && c.enabled)
      .map(toProductOption),
  );

  for (const group of input.groups.filter((g) => !g.isDeleted && g.status === "active" && g.enabled)) {
    const categoryCode = categoryIdToCode.get(group.categoryId) ?? group.categoryId;
    const bucket = productGroups.get(categoryCode) ?? [];
    bucket.push({
      ...toProductOption(group),
      categoryId: categoryCode,
      parentId: categoryCode,
    });
    productGroups.set(categoryCode, bucket);
  }

  for (const product of input.products.filter((p) => !p.isDeleted && p.status === "active" && p.enabled)) {
    const groupCode = groupIdToCode.get(product.groupId) ?? product.groupId;
    const categoryCode = categoryIdToCode.get(product.categoryId) ?? product.categoryId;
    const bucket = products.get(groupCode) ?? [];
    bucket.push({
      ...toProductOption(product),
      categoryId: categoryCode,
      groupId: groupCode,
      parentId: groupCode,
      lifecycleStatus: product.lifecycleStatus,
    });
    products.set(groupCode, bucket);
  }
}

export function getProductCategoryCache(): ProductRegistryPortOption[] {
  return productCategories.get("all") ?? [];
}

export function getProductGroupCache(categoryId?: string): ProductRegistryPortOption[] {
  if (!categoryId) return [];
  return productGroups.get(categoryId) ?? [];
}

export function getProductCache(groupId?: string): ProductRegistryPortOption[] {
  if (!groupId) return [];
  return products.get(groupId) ?? [];
}

export function getAllProductCache(): ProductRegistryPortOption[] {
  return Array.from(products.values()).flat();
}

export function getAllDocumentDefinitionCache(): DocumentRegistryPortOption[] {
  return Array.from(documentDefinitions.values()).flat();
}

export function getAllLenderCache(): LenderRegistryPortOption[] {
  return Array.from(lenders.values()).flat();
}

export function setDocumentRegistryCache(input: {
  types: EnterpriseDocumentTypeRecord[];
  definitions: EnterpriseDocumentDefinitionRecord[];
}): void {
  documentTypes.length = 0;
  documentDefinitions.clear();

  const typeIdToCode = new Map(input.types.map((t) => [t.id, t.code]));

  documentTypes.push(
    ...input.types
      .filter((t) => !t.isDeleted && t.status === "active" && t.enabled)
      .map(toDocumentTypeOption),
  );

  for (const definition of input.definitions.filter(
    (d) => !d.isDeleted && d.status === "active" && d.enabled,
  )) {
    const typeCode = typeIdToCode.get(definition.typeId) ?? definition.typeId;
    const bucket = documentDefinitions.get(typeCode) ?? [];
    bucket.push({
      id: definition.code,
      label: definition.label,
      typeId: typeCode,
      parentId: typeCode,
      category: definition.category,
      enabled: definition.enabled,
      sortOrder: definition.versionNumber,
      source: "database",
    });
    documentDefinitions.set(typeCode, bucket);
  }
}

export function getDocumentTypeCache(): DocumentRegistryPortOption[] {
  return documentTypes;
}

export function getDocumentDefinitionCache(typeId?: string): DocumentRegistryPortOption[] {
  if (!typeId) return [];
  return documentDefinitions.get(typeId) ?? [];
}

export function setLenderRegistryCache(input: {
  categories: EnterpriseLenderCategoryRecord[];
  lenders: EnterpriseLenderRecord[];
  programs: EnterpriseLenderProgramRecord[];
}): void {
  lenderCategories.length = 0;
  lenders.clear();
  lenderPrograms.clear();

  const categoryIdToCode = new Map(input.categories.map((c) => [c.id, c.code]));
  const lenderIdToCode = new Map(input.lenders.map((l) => [l.id, l.code]));

  lenderCategories.push(
    ...input.categories
      .filter((c) => !c.isDeleted && c.status === "active" && c.enabled)
      .map((c) => toProductOption(c) as LenderRegistryPortOption),
  );

  for (const lender of input.lenders.filter((l) => !l.isDeleted && l.status === "active" && l.enabled)) {
    const categoryCode = categoryIdToCode.get(lender.categoryId) ?? lender.categoryId;
    const bucket = lenders.get(categoryCode) ?? [];
    bucket.push(toLenderOption(lender, categoryCode));
    lenders.set(categoryCode, bucket);
  }

  for (const program of input.programs.filter((p) => !p.isDeleted && p.status === "active" && p.enabled)) {
    const lenderCode = lenderIdToCode.get(program.lenderId) ?? program.lenderId;
    const bucket = lenderPrograms.get(lenderCode) ?? [];
    bucket.push({
      id: program.code,
      label: program.label,
      lenderId: lenderCode,
      parentId: lenderCode,
      lifecycleStatus: program.lifecycleStatus,
      enabled: program.enabled,
      source: "database",
    });
    lenderPrograms.set(lenderCode, bucket);
  }
}

export function getLenderCategoryCache(): LenderRegistryPortOption[] {
  return lenderCategories;
}

export function getLenderCache(categoryId?: string): LenderRegistryPortOption[] {
  if (!categoryId) return [];
  return lenders.get(categoryId) ?? [];
}

export function getLenderProgramCache(lenderId?: string): LenderRegistryPortOption[] {
  if (!lenderId) return [];
  return lenderPrograms.get(lenderId) ?? [];
}

export function clearTier2RegistryPortCache(): void {
  productCategories.clear();
  productGroups.clear();
  products.clear();
  documentTypes.length = 0;
  documentDefinitions.clear();
  lenderCategories.length = 0;
  lenders.clear();
  lenderPrograms.clear();
}

export function getTier2RegistryCacheSize(): number {
  let total = getProductCategoryCache().length;
  for (const rows of productGroups.values()) total += rows.length;
  for (const rows of products.values()) total += rows.length;
  total += documentTypes.length;
  for (const rows of documentDefinitions.values()) total += rows.length;
  total += lenderCategories.length;
  for (const rows of lenders.values()) total += rows.length;
  for (const rows of lenderPrograms.values()) total += rows.length;
  return total;
}
