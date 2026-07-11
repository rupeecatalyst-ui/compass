/**
 * EAF Enterprise Asset Registry — central configuration and asset index.
 */

import { EAF_FRAMEWORK_VERSION } from "@/constants/enterprise-asset-framework";
import type {
  EafAssetRegistryEntry,
  EafAssetTypeCode,
  EafAssetTypeDefinition,
  EafAssetVersionRecord,
  EafBaseAsset,
  EafFrameworkRegistrySnapshot,
  EafInternalId,
  EafLifecycleDefinition,
  EafRelationshipTypeDefinition,
} from "@/types/enterprise-asset-framework";
import { recordEafAssetCreated, recordEafAssetModified } from "./audit-engine";
import { createEafAssetDraft, type CreateEafAssetDraftInput } from "./base-asset";
import { getEafConfigurationProvider } from "./configuration-provider";
import { getEafEventPublisher, getEafPorts } from "./composition";
import {
  buildEafAiMetadata,
  buildEafSearchMetadata,
  getEafAiHooks,
  getEafAiMetadataStore,
  getEafMetadataHooks,
  getEafPermissionHooks,
  getEafSearchIndexFields,
  getEafSearchMetadataStore,
  upsertEafAiMetadata,
  upsertEafSearchMetadata,
} from "./hook-registry";
import { assessEafAssetHealth } from "./health-model";
import { getEafRelationshipsForAsset } from "./relationship-engine";
import { createEafVersionRecord, getCurrentEafVersionRecord } from "./version-engine";

export function resetEafRegistry(): void {
  const ports = getEafPorts();
  ports.assets.replaceAll([]);
  ports.versions.replaceAll([]);
}

export function getEafAssetTypeDefinitions(): EafAssetTypeDefinition[] {
  return getEafConfigurationProvider().listAssetTypes();
}

export function getEafAssetTypeDefinition(assetTypeCode: EafAssetTypeCode): EafAssetTypeDefinition | undefined {
  return getEafConfigurationProvider().findAssetType(assetTypeCode);
}

export function registerEafAssetTypeDefinition(definition: EafAssetTypeDefinition): void {
  getEafConfigurationProvider().saveAssetType(definition);
}

export function getEafLifecycleDefinitions(): EafLifecycleDefinition[] {
  return getEafConfigurationProvider().listLifecycleDefinitions();
}

export function getEafLifecycleDefinitionById(id: string): EafLifecycleDefinition | undefined {
  return getEafConfigurationProvider().findLifecycleDefinitionById(id);
}

export function getEafLifecycleForAssetType(assetTypeCode: EafAssetTypeCode): EafLifecycleDefinition | undefined {
  const typeDef = getEafAssetTypeDefinition(assetTypeCode);
  if (!typeDef) return undefined;
  return getEafLifecycleDefinitionById(typeDef.lifecycleDefinitionId);
}

export function registerEafLifecycleDefinition(definition: EafLifecycleDefinition): void {
  getEafConfigurationProvider().saveLifecycleDefinition(definition);
}

export function getEafRelationshipTypeDefinitions(): EafRelationshipTypeDefinition[] {
  return getEafConfigurationProvider().listRelationshipTypes();
}

export function registerEafRelationshipTypeDefinition(definition: EafRelationshipTypeDefinition): void {
  getEafConfigurationProvider().saveRelationshipType(definition);
}

export function getEafAssets(): EafBaseAsset[] {
  return getEafPorts().assets.list();
}

export function getEafAssetById(id: EafInternalId): EafBaseAsset | undefined {
  return getEafPorts().assets.findById(id);
}

export function registerEafAsset(input: CreateEafAssetDraftInput): EafBaseAsset {
  const typeDef = getEafAssetTypeDefinition(input.assetType);
  if (!typeDef) {
    throw new Error(`EAF: unregistered asset type "${input.assetType}"`);
  }

  const asset = createEafAssetDraft({
    ...input,
    lifecycleDefinitionId: typeDef.lifecycleDefinitionId,
    category: input.category ?? typeDef.defaultCategory ?? "",
  });

  getEafPorts().assets.save(asset);
  getEafPorts().versions.append(
    createEafVersionRecord({
      assetId: asset.id,
      version: asset.version,
      changeSummary: "Initial draft",
      snapshotRef: asset.id,
      createdBy: input.createdBy,
      isCurrent: true,
    }),
  );

  recordEafAssetCreated(asset.id, input.createdBy);

  upsertEafSearchMetadata(
    buildEafSearchMetadata({
      assetId: asset.id,
      assetType: asset.assetType,
      searchableText: `${asset.assetName} ${asset.description}`.trim(),
      facetCodes: [asset.category, ...asset.tags].filter(Boolean),
    }),
  );

  upsertEafAiMetadata(
    buildEafAiMetadata({
      assetId: asset.id,
      aiTags: asset.tags,
    }),
  );

  getEafEventPublisher().publish({
    eventId: crypto.randomUUID(),
    eventType: "asset.created",
    timestamp: asset.createdOn,
    actorId: input.createdBy,
    assetId: asset.id,
    asset,
  });

  assessEafAssetHealth(asset);

  return asset;
}

export function updateEafAsset(
  assetId: EafInternalId,
  patch: Partial<Pick<EafBaseAsset, "assetName" | "description" | "category" | "tags" | "owner" | "remarks">>,
  modifiedBy: string,
): EafBaseAsset | undefined {
  const existing = getEafAssetById(assetId);
  if (!existing) return undefined;

  const updated: EafBaseAsset = {
    ...existing,
    ...patch,
    modifiedBy,
    modifiedOn: new Date().toISOString(),
  };

  getEafPorts().assets.save(updated);
  recordEafAssetModified(assetId, modifiedBy);

  upsertEafSearchMetadata(
    buildEafSearchMetadata({
      assetId: updated.id,
      assetType: updated.assetType,
      searchableText: `${updated.assetName} ${updated.description}`.trim(),
      facetCodes: [updated.category, ...updated.tags].filter(Boolean),
    }),
  );

  getEafEventPublisher().publish({
    eventId: crypto.randomUUID(),
    eventType: "asset.updated",
    timestamp: updated.modifiedOn,
    actorId: modifiedBy,
    assetId: updated.id,
    asset: updated,
  });

  assessEafAssetHealth(updated);

  return updated;
}

export function getEafVersionRecords(): EafAssetVersionRecord[] {
  return getEafPorts().versions.list();
}

export function getEafRegistryEntry(assetId: EafInternalId): EafAssetRegistryEntry | undefined {
  const asset = getEafAssetById(assetId);
  if (!asset) return undefined;

  return {
    asset,
    searchMetadata: getEafSearchMetadataStore().find((m) => m.assetId === assetId),
    aiMetadata: getEafAiMetadataStore().find((m) => m.assetId === assetId),
  };
}

export function searchEafRegistry(query: string): EafAssetRegistryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return getEafAssets().map((a) => getEafRegistryEntry(a.id)!).filter(Boolean);

  return getEafSearchMetadataStore()
    .filter((m) => m.searchableText.toLowerCase().includes(q))
    .map((m) => getEafRegistryEntry(m.assetId))
    .filter((e): e is EafAssetRegistryEntry => Boolean(e));
}

export function getEafFrameworkSnapshot(): EafFrameworkRegistrySnapshot {
  return {
    assetTypes: getEafAssetTypeDefinitions(),
    lifecycleDefinitions: getEafLifecycleDefinitions(),
    relationshipTypes: getEafRelationshipTypeDefinitions(),
    metadataHooks: getEafMetadataHooks(),
    permissionHooks: getEafPermissionHooks(),
    searchIndexFields: getEafSearchIndexFields(),
    aiHooks: getEafAiHooks(),
  };
}

export function getEafFrameworkVersion(): string {
  return EAF_FRAMEWORK_VERSION;
}

export function getEafAssetGraph(assetId: EafInternalId) {
  return {
    asset: getEafAssetById(assetId),
    relationships: getEafRelationshipsForAsset(assetId),
    currentVersion: getCurrentEafVersionRecord(getEafVersionRecords(), assetId),
  };
}
