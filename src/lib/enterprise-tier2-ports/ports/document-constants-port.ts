/**
 * CO-ARCH-001-I5b — Constants-backed Document Registry port (legacy SSOT).
 */
import { ORG_DOC_CATEGORIES, ORG_DOC_SYSTEM_TYPES } from "@/constants/organization-documents";
import type { DocumentRegistryPort, DocumentRegistryPortOption } from "@/types/tier2-registry-port";

function mapCategoryToType(category: (typeof ORG_DOC_CATEGORIES)[number]): DocumentRegistryPortOption {
  return {
    id: category.id,
    label: category.label,
    sortOrder: category.sortOrder,
    enabled: true,
    source: "constants",
  };
}

export const constantsDocumentRegistryPort: DocumentRegistryPort = {
  listTypes() {
    return ORG_DOC_CATEGORIES.map(mapCategoryToType);
  },
  listDefinitions(typeId) {
    const filtered = typeId
      ? ORG_DOC_SYSTEM_TYPES.filter((t) => t.categoryId === typeId)
      : ORG_DOC_SYSTEM_TYPES;
    return filtered.map((t) => ({
      id: t.id,
      label: t.label,
      typeId: t.categoryId,
      parentId: t.categoryId,
      sortOrder: t.sortOrder,
      enabled: true,
      source: "constants" as const,
    }));
  },
  getDefinitionLabel(id) {
    if (!id) return "";
    return ORG_DOC_SYSTEM_TYPES.find((t) => t.id === id)?.label ?? id;
  },
};
