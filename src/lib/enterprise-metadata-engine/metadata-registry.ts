/**
 * EME metadata registry — stores definitions per enterprise asset.
 */

import type { EafAssetTypeCode } from "@/types/enterprise-asset-framework";
import type { EmeMetadataDefinition } from "@/types/enterprise-metadata-engine";
import { recordEmeMetadataAudit } from "./audit-integration";
import { getEmePorts } from "./composition";
import { createEmeMetadataVersionRecord } from "./version-engine";

export function resetEmeMetadataRegistry(): void {
  getEmePorts().metadataRegistry.replaceAll([]);
  getEmePorts().versions.replaceAll([]);
}

export function listEmeMetadataDefinitions(): EmeMetadataDefinition[] {
  return getEmePorts().metadataRegistry.list();
}

export function getEmeMetadataDefinitionById(id: string): EmeMetadataDefinition | undefined {
  return getEmePorts().metadataRegistry.findById(id);
}

export function getEmeMetadataDefinitionByAssetType(
  assetTypeCode: EafAssetTypeCode,
): EmeMetadataDefinition | undefined {
  return getEmePorts().metadataRegistry.findByAssetTypeCode(assetTypeCode);
}

export function getEmeMetadataDefinitionBySchemaCode(
  schemaCode: string,
): EmeMetadataDefinition | undefined {
  return getEmePorts().metadataRegistry.findBySchemaCode(schemaCode);
}

export function registerEmeMetadataDefinition(
  input: Omit<
    EmeMetadataDefinition,
    "id" | "version" | "fieldDefinitionIds" | "createdOn" | "modifiedOn"
  > & { id?: string; fieldDefinitionIds?: string[] },
): EmeMetadataDefinition {
  const existingByAsset = getEmePorts().metadataRegistry.findByAssetTypeCode(input.assetTypeCode);
  const existingBySchema = getEmePorts().metadataRegistry.findBySchemaCode(input.schemaCode);
  if (existingByAsset && existingByAsset.id !== input.id) {
    throw new Error(
      `EME: metadata definition already exists for asset type "${input.assetTypeCode}".`,
    );
  }
  if (existingBySchema && existingBySchema.id !== input.id) {
    throw new Error(`EME: metadata schema code "${input.schemaCode}" is already registered.`);
  }

  const now = new Date().toISOString();
  const isNew = !input.id || !getEmePorts().metadataRegistry.findById(input.id);
  const definition: EmeMetadataDefinition = {
    id: input.id ?? crypto.randomUUID(),
    assetTypeCode: input.assetTypeCode,
    schemaCode: input.schemaCode,
    displayName: input.displayName,
    description: input.description,
    version: isNew ? "1.0.0" : (getEmePorts().metadataRegistry.findById(input.id!)?.version ?? "1.0.0"),
    categoryCodes: input.categoryCodes,
    fieldDefinitionIds: input.fieldDefinitionIds ?? [],
    enabled: input.enabled,
    createdBy: input.createdBy,
    createdOn: isNew ? now : (getEmePorts().metadataRegistry.findById(input.id!)?.createdOn ?? now),
    modifiedBy: input.modifiedBy,
    modifiedOn: now,
  };

  getEmePorts().metadataRegistry.save(definition);

  if (isNew) {
    getEmePorts().versions.append(
      createEmeMetadataVersionRecord({
        metadataDefinitionId: definition.id,
        schemaCode: definition.schemaCode,
        version: definition.version,
        changeSummary: "Initial metadata schema",
        snapshotRef: definition.id,
        createdBy: input.createdBy,
        isCurrent: true,
      }),
    );
    recordEmeMetadataAudit({
      metadataDefinitionId: definition.id,
      action: "metadata_created",
      actorId: input.createdBy,
      remarks: `Registered metadata schema ${definition.schemaCode}`,
    });
  } else {
    recordEmeMetadataAudit({
      metadataDefinitionId: definition.id,
      action: "metadata_modified",
      actorId: input.modifiedBy,
      remarks: `Updated metadata schema ${definition.schemaCode}`,
    });
  }

  return definition;
}

export function updateEmeMetadataDefinition(
  id: string,
  patch: Partial<
    Pick<
      EmeMetadataDefinition,
      "displayName" | "description" | "categoryCodes" | "enabled" | "fieldDefinitionIds"
    >
  >,
  modifiedBy: string,
): EmeMetadataDefinition | undefined {
  const existing = getEmeMetadataDefinitionById(id);
  if (!existing) return undefined;

  const updated: EmeMetadataDefinition = {
    ...existing,
    ...patch,
    modifiedBy,
    modifiedOn: new Date().toISOString(),
  };

  getEmePorts().metadataRegistry.save(updated);
  recordEmeMetadataAudit({
    metadataDefinitionId: id,
    action: "metadata_modified",
    actorId: modifiedBy,
    changeSetRef: Object.keys(patch).join(","),
  });

  return updated;
}
