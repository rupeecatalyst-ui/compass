/**
 * EME field definition engine.
 */

import type { EafAssetTypeCode } from "@/types/enterprise-asset-framework";
import type { EmeFieldDataType, EmeFieldDefinition } from "@/types/enterprise-metadata-engine";
import { EME_FIELD_DATA_TYPE_LIST } from "@/constants/enterprise-metadata-engine";
import { recordEmeMetadataAudit } from "./audit-integration";
import { getEmePorts } from "./composition";
import { getEmeMetadataDefinitionById } from "./metadata-registry";
import { bumpEmeMetadataVersion, createEmeMetadataVersionRecord } from "./version-engine";

export function listEmeFieldDataTypes(): EmeFieldDataType[] {
  return [...EME_FIELD_DATA_TYPE_LIST];
}

export function listEmeFieldDefinitions(): EmeFieldDefinition[] {
  return getEmePorts().fields.list();
}

export function getEmeFieldDefinitionById(id: string): EmeFieldDefinition | undefined {
  return getEmePorts().fields.findById(id);
}

export function getEmeFieldsForMetadataDefinition(metadataDefinitionId: string): EmeFieldDefinition[] {
  return getEmePorts().fields.listByMetadataDefinitionId(metadataDefinitionId);
}

export function getEmeFieldsForAssetType(assetTypeCode: EafAssetTypeCode): EmeFieldDefinition[] {
  return getEmePorts().fields.listByAssetTypeCode(assetTypeCode);
}

export function registerEmeFieldDefinition(
  input: Omit<EmeFieldDefinition, "id" | "createdOn" | "modifiedOn"> & { id?: string },
): EmeFieldDefinition {
  const metadataDef = getEmeMetadataDefinitionById(input.metadataDefinitionId);
  if (!metadataDef) {
    throw new Error(`EME: metadata definition "${input.metadataDefinitionId}" not found.`);
  }
  if (metadataDef.assetTypeCode !== input.assetTypeCode) {
    throw new Error(
      `EME: field asset type "${input.assetTypeCode}" does not match metadata definition.`,
    );
  }

  const existingCode = getEmePorts()
    .fields.list()
    .find(
      (f) =>
        f.metadataDefinitionId === input.metadataDefinitionId &&
        f.internalCode === input.internalCode &&
        f.id !== input.id,
    );
  if (existingCode) {
    throw new Error(
      `EME: internal code "${input.internalCode}" already exists in this metadata schema.`,
    );
  }

  const now = new Date().toISOString();
  const isNew = !input.id || !getEmePorts().fields.findById(input.id);
  const field: EmeFieldDefinition = {
    id: input.id ?? crypto.randomUUID(),
    metadataDefinitionId: input.metadataDefinitionId,
    assetTypeCode: input.assetTypeCode,
    fieldName: input.fieldName,
    displayLabel: input.displayLabel,
    internalCode: input.internalCode,
    description: input.description,
    dataType: input.dataType,
    required: input.required,
    readOnly: input.readOnly,
    hidden: input.hidden,
    defaultValue: input.defaultValue,
    placeholder: input.placeholder,
    helpText: input.helpText,
    validationRuleIds: input.validationRuleIds,
    displayOrder: input.displayOrder,
    categoryCode: input.categoryCode,
    enabled: input.enabled,
    lookupRef: input.lookupRef,
    formulaRef: input.formulaRef,
    optionValues: input.optionValues,
    systemFieldFlag: input.systemFieldFlag,
    createdBy: input.createdBy,
    createdOn: isNew ? now : (getEmePorts().fields.findById(input.id!)?.createdOn ?? now),
    modifiedBy: input.modifiedBy,
    modifiedOn: now,
  };

  getEmePorts().fields.save(field);

  const fieldIds = new Set(metadataDef.fieldDefinitionIds);
  fieldIds.add(field.id);
  const nextVersion = bumpEmeMetadataVersion(metadataDef.version, "minor");

  const updatedMetadata = {
    ...metadataDef,
    fieldDefinitionIds: [...fieldIds],
    version: nextVersion,
    modifiedBy: input.modifiedBy,
    modifiedOn: now,
  };
  getEmePorts().metadataRegistry.save(updatedMetadata);

  getEmePorts().versions.append(
    createEmeMetadataVersionRecord({
      metadataDefinitionId: metadataDef.id,
      schemaCode: metadataDef.schemaCode,
      version: nextVersion,
      changeSummary: isNew ? `Added field ${field.internalCode}` : `Updated field ${field.internalCode}`,
      snapshotRef: field.id,
      createdBy: input.modifiedBy,
      isCurrent: true,
    }),
  );

  recordEmeMetadataAudit({
    metadataDefinitionId: metadataDef.id,
    action: isNew ? "field_created" : "field_modified",
    actorId: input.modifiedBy,
    changeSetRef: field.id,
    remarks: `${isNew ? "Created" : "Updated"} field ${field.internalCode}`,
  });

  return field;
}
