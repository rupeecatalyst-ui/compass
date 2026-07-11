/**
 * EME metadata category registry.
 */

import type { EmeMetadataCategory } from "@/types/enterprise-metadata-engine";
import { recordEmeMetadataAudit } from "./audit-integration";
import { getEmePorts } from "./composition";

export function resetEmeMetadataCategories(): void {
  getEmePorts().categories.replaceAll([]);
}

export function listEmeMetadataCategories(): EmeMetadataCategory[] {
  return getEmePorts()
    .categories.list()
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getEmeMetadataCategory(categoryCode: string): EmeMetadataCategory | undefined {
  return getEmePorts().categories.findByCode(categoryCode);
}

export function registerEmeMetadataCategory(
  input: Omit<EmeMetadataCategory, "id"> & { id?: string },
  actorId: string,
): EmeMetadataCategory {
  const duplicate = getEmePorts()
    .categories.list()
    .find((c) => c.categoryCode === input.categoryCode && c.id !== input.id);
  if (duplicate) {
    throw new Error(`EME: category code "${input.categoryCode}" is already registered.`);
  }

  const isNew = !input.id || !getEmePorts().categories.list().find((c) => c.id === input.id);
  const category: EmeMetadataCategory = {
    id: input.id ?? crypto.randomUUID(),
    categoryCode: input.categoryCode,
    label: input.label,
    description: input.description,
    displayOrder: input.displayOrder,
    isSystem: input.isSystem,
    enabled: input.enabled,
  };

  getEmePorts().categories.save(category);

  recordEmeMetadataAudit({
    metadataDefinitionId: category.id,
    action: isNew ? "category_created" : "category_modified",
    actorId,
    changeSetRef: category.categoryCode,
    remarks: `${isNew ? "Created" : "Updated"} category ${category.label}`,
  });

  return category;
}
