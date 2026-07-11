/**
 * EAF metadata, permission, search, and AI hook registries — architecture only.
 */

import type {
  EafAiHookDefinition,
  EafAiMetadata,
  EafAssetTypeCode,
  EafDynamicFieldDefinition,
  EafDynamicFormDefinition,
  EafDynamicLayoutDefinition,
  EafMetadataHookBundle,
  EafPermissionHookBundle,
  EafRolePermissionHook,
  EafSearchIndexFieldDefinition,
  EafSearchMetadata,
  EafValidationRuleDefinition,
  EafVisibilityRuleHook,
  EafWorkspaceProfileHook,
} from "@/types/enterprise-asset-framework";
import { getEafPorts } from "./composition";

export function resetEafHookRegistries(): void {
  const ports = getEafPorts();
  ports.metadataHooks.reset();
  ports.permissionHooks.reset();
  ports.searchHooks.reset();
  ports.aiHooks.reset();
  ports.searchMetadata.replaceAll([]);
  ports.aiMetadata.replaceAll([]);
}

export function getEafMetadataHooks(): EafMetadataHookBundle {
  return getEafPorts().metadataHooks.getBundle();
}

export function registerEafDynamicField(definition: EafDynamicFieldDefinition): void {
  getEafPorts().metadataHooks.saveField(definition);
}

export function registerEafDynamicLayout(definition: EafDynamicLayoutDefinition): void {
  getEafPorts().metadataHooks.saveLayout(definition);
}

export function registerEafDynamicForm(definition: EafDynamicFormDefinition): void {
  getEafPorts().metadataHooks.saveForm(definition);
}

export function registerEafValidationRule(definition: EafValidationRuleDefinition): void {
  getEafPorts().metadataHooks.saveValidationRule(definition);
}

export function getEafFieldsForAssetType(assetType: EafAssetTypeCode): EafDynamicFieldDefinition[] {
  const bundle = getEafMetadataHooks();
  const formFieldIds = new Set(
    bundle.formDefinitions
      .filter(
        (f) =>
          f.enabled &&
          (f.applicableAssetTypeCodes.length === 0 ||
            f.applicableAssetTypeCodes.includes(assetType)),
      )
      .flatMap((f) => f.fieldDefinitionIds),
  );
  if (formFieldIds.size === 0) {
    return bundle.fieldDefinitions.filter((f) => f.enabled);
  }
  return bundle.fieldDefinitions.filter((f) => f.enabled && formFieldIds.has(f.id));
}

export function getEafPermissionHooks(): EafPermissionHookBundle {
  return getEafPorts().permissionHooks.getBundle();
}

export function registerEafRolePermission(hook: EafRolePermissionHook): void {
  getEafPorts().permissionHooks.saveRolePermission(hook);
}

export function registerEafVisibilityRule(hook: EafVisibilityRuleHook): void {
  getEafPorts().permissionHooks.saveVisibilityRule(hook);
}

export function registerEafWorkspaceProfile(hook: EafWorkspaceProfileHook): void {
  getEafPorts().permissionHooks.saveWorkspaceProfile(hook);
}

export function getEafSearchIndexFields(): EafSearchIndexFieldDefinition[] {
  return getEafPorts().searchHooks.listIndexFields();
}

export function registerEafSearchIndexField(field: EafSearchIndexFieldDefinition): void {
  getEafPorts().searchHooks.saveIndexField(field);
}

export function getEafSearchMetadataStore(): EafSearchMetadata[] {
  return getEafPorts().searchMetadata.list();
}

export function upsertEafSearchMetadata(metadata: EafSearchMetadata): void {
  getEafPorts().searchMetadata.upsert(metadata);
}

export function buildEafSearchMetadata(input: {
  assetId: string;
  assetType: EafAssetTypeCode;
  searchableText: string;
  facetCodes?: string[];
  indexPriority?: number;
}): EafSearchMetadata {
  return {
    assetId: input.assetId,
    assetType: input.assetType,
    searchableText: input.searchableText,
    facetCodes: input.facetCodes ?? [],
    indexPriority: input.indexPriority ?? 1,
    lastIndexedOn: new Date().toISOString(),
  };
}

export function getEafAiHooks(): EafAiHookDefinition[] {
  return getEafPorts().aiHooks.listHooks();
}

export function registerEafAiHook(hook: EafAiHookDefinition): void {
  getEafPorts().aiHooks.saveHook(hook);
}

export function getEafAiMetadataStore(): EafAiMetadata[] {
  return getEafPorts().aiMetadata.list();
}

export function upsertEafAiMetadata(metadata: EafAiMetadata): void {
  getEafPorts().aiMetadata.upsert(metadata);
}

export function buildEafAiMetadata(input: {
  assetId: string;
  aiSummary?: string;
  aiTags?: string[];
  aiIndexRef?: string;
}): EafAiMetadata {
  return {
    assetId: input.assetId,
    aiSummary: input.aiSummary,
    aiTags: input.aiTags ?? [],
    aiIndexRef: input.aiIndexRef,
    lastAiProcessedOn: new Date().toISOString(),
  };
}
