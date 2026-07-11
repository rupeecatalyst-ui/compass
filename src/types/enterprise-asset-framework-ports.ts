/**
 * EAF Ports — repository and provider contracts.
 *
 * Hexagonal architecture boundary. Sprint 1 ships in-memory adapters.
 * Sprint 2+ swaps implementations (Prisma, event bus) without changing engines.
 */

import type {
  EafAiHookDefinition,
  EafAiMetadata,
  EafAssetRelationship,
  EafAssetTypeCode,
  EafAssetTypeDefinition,
  EafAssetVersionRecord,
  EafAuditEntry,
  EafBaseAsset,
  EafDynamicFieldDefinition,
  EafDynamicFormDefinition,
  EafDynamicLayoutDefinition,
  EafInternalId,
  EafLifecycleDefinition,
  EafMetadataHookBundle,
  EafPermissionHookBundle,
  EafRelationshipTypeDefinition,
  EafRolePermissionHook,
  EafSearchIndexFieldDefinition,
  EafSearchMetadata,
  EafValidationRuleDefinition,
  EafVisibilityRuleHook,
  EafWorkspaceProfileHook,
} from "./enterprise-asset-framework";
import type {
  EafAssetCapabilityDeclaration,
  EafCapabilityDefinition,
} from "./enterprise-asset-framework-capabilities";
import type { EafAssetHealthRecord } from "./enterprise-asset-framework-definition";
import type { EafEngineRegistration } from "./enterprise-asset-framework-engines";
import type {
  EafAssetFeatureFlagState,
  EafFeatureFlagHook,
} from "./enterprise-asset-framework-feature-flags";

// ---------------------------------------------------------------------------
// Configuration provider — metadata-driven registries
// ---------------------------------------------------------------------------

export interface EafConfigurationProvider {
  listAssetTypes(): EafAssetTypeDefinition[];
  findAssetType(assetTypeCode: EafAssetTypeCode): EafAssetTypeDefinition | undefined;
  saveAssetType(definition: EafAssetTypeDefinition): void;

  listLifecycleDefinitions(): EafLifecycleDefinition[];
  findLifecycleDefinitionById(id: string): EafLifecycleDefinition | undefined;
  saveLifecycleDefinition(definition: EafLifecycleDefinition): void;

  listRelationshipTypes(): EafRelationshipTypeDefinition[];
  saveRelationshipType(definition: EafRelationshipTypeDefinition): void;
}

// ---------------------------------------------------------------------------
// Sprint 1A registries — capability, engine, health, feature flags
// ---------------------------------------------------------------------------

export interface EafCapabilityRegistryPort {
  listDefinitions(): EafCapabilityDefinition[];
  findDefinition(capabilityCode: string): EafCapabilityDefinition | undefined;
  saveDefinition(definition: EafCapabilityDefinition): void;
  listAssetDeclarations(): EafAssetCapabilityDeclaration[];
  findAssetDeclaration(assetTypeCode: EafAssetTypeCode): EafAssetCapabilityDeclaration | undefined;
  saveAssetDeclaration(declaration: EafAssetCapabilityDeclaration): void;
  reset(): void;
}

export interface EafEngineRegistryPort {
  list(): EafEngineRegistration[];
  find(engineCode: string): EafEngineRegistration | undefined;
  register(registration: EafEngineRegistration): void;
  reset(): void;
}

export interface EafHealthRepositoryPort {
  list(): EafAssetHealthRecord[];
  findByAssetId(assetId: EafInternalId): EafAssetHealthRecord | undefined;
  upsert(record: EafAssetHealthRecord): void;
  replaceAll(records: EafAssetHealthRecord[]): void;
}

export interface EafFeatureFlagHookRegistryPort {
  listHooks(): EafFeatureFlagHook[];
  saveHook(hook: EafFeatureFlagHook): void;
  listAssetStates(): EafAssetFeatureFlagState[];
  upsertAssetState(state: EafAssetFeatureFlagState): void;
  reset(): void;
}

// ---------------------------------------------------------------------------
// Persistence ports — swap for database adapters in future sprints
// ---------------------------------------------------------------------------

export interface EafAssetRepository {
  list(): EafBaseAsset[];
  findById(id: EafInternalId): EafBaseAsset | undefined;
  save(asset: EafBaseAsset): void;
  replaceAll(assets: EafBaseAsset[]): void;
}

export interface EafVersionRepository {
  list(): EafAssetVersionRecord[];
  append(record: EafAssetVersionRecord): void;
  replaceAll(records: EafAssetVersionRecord[]): void;
}

export interface EafAuditRepository {
  list(): EafAuditEntry[];
  append(entry: EafAuditEntry): void;
  findByAssetId(assetId: EafInternalId): EafAuditEntry[];
  replaceAll(entries: EafAuditEntry[]): void;
}

export interface EafRelationshipRepository {
  list(): EafAssetRelationship[];
  save(relationship: EafAssetRelationship): void;
  replaceAll(relationships: EafAssetRelationship[]): void;
}

export interface EafSearchMetadataRepository {
  list(): EafSearchMetadata[];
  upsert(metadata: EafSearchMetadata): void;
  replaceAll(metadata: EafSearchMetadata[]): void;
}

export interface EafAiMetadataRepository {
  list(): EafAiMetadata[];
  upsert(metadata: EafAiMetadata): void;
  replaceAll(metadata: EafAiMetadata[]): void;
}

// ---------------------------------------------------------------------------
// Hook registries — extensibility without code changes
// ---------------------------------------------------------------------------

export interface EafMetadataHookRegistry {
  getBundle(): EafMetadataHookBundle;
  saveField(definition: EafDynamicFieldDefinition): void;
  saveLayout(definition: EafDynamicLayoutDefinition): void;
  saveForm(definition: EafDynamicFormDefinition): void;
  saveValidationRule(definition: EafValidationRuleDefinition): void;
  reset(bundle?: EafMetadataHookBundle): void;
}

export interface EafPermissionHookRegistry {
  getBundle(): EafPermissionHookBundle;
  saveRolePermission(hook: EafRolePermissionHook): void;
  saveVisibilityRule(hook: EafVisibilityRuleHook): void;
  saveWorkspaceProfile(hook: EafWorkspaceProfileHook): void;
  reset(bundle?: EafPermissionHookBundle): void;
}

export interface EafSearchHookRegistry {
  listIndexFields(): EafSearchIndexFieldDefinition[];
  saveIndexField(field: EafSearchIndexFieldDefinition): void;
  reset(fields?: EafSearchIndexFieldDefinition[]): void;
}

export interface EafAiHookRegistry {
  listHooks(): EafAiHookDefinition[];
  saveHook(hook: EafAiHookDefinition): void;
  reset(hooks?: EafAiHookDefinition[]): void;
}

// ---------------------------------------------------------------------------
// Composition root contract
// ---------------------------------------------------------------------------

export interface EafPorts {
  configuration: EafConfigurationProvider;
  capabilities: EafCapabilityRegistryPort;
  engines: EafEngineRegistryPort;
  health: EafHealthRepositoryPort;
  featureFlags: EafFeatureFlagHookRegistryPort;
  assets: EafAssetRepository;
  versions: EafVersionRepository;
  audit: EafAuditRepository;
  relationships: EafRelationshipRepository;
  searchMetadata: EafSearchMetadataRepository;
  aiMetadata: EafAiMetadataRepository;
  metadataHooks: EafMetadataHookRegistry;
  permissionHooks: EafPermissionHookRegistry;
  searchHooks: EafSearchHookRegistry;
  aiHooks: EafAiHookRegistry;
}

export type PartialEafPorts = Partial<EafPorts>;
