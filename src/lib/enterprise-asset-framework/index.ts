export {
  applyEafBasePatch,
  bumpEafAssetVersion,
  createEafAssetDraft,
  createEafExtendedAssetDraft,
} from "./base-asset";
export type { CreateEafAssetDraftInput } from "./base-asset";

export {
  appendEafAuditEntry,
  getEafAuditTrail,
  getEafAuditTrailForAsset,
  recordEafAssetCreated,
  recordEafAssetDeleted,
  recordEafAssetModified,
  recordEafAssetRestored,
  resetEafAuditTrail,
} from "./audit-engine";

export {
  buildEafAiMetadata,
  getEafAiHooks,
  getEafAiMetadataStore,
  getEafFieldsForAssetType,
  getEafMetadataHooks,
  getEafPermissionHooks,
  getEafSearchIndexFields,
  getEafSearchMetadataStore,
  registerEafAiHook,
  registerEafDynamicField,
  registerEafDynamicForm,
  registerEafDynamicLayout,
  registerEafRolePermission,
  registerEafSearchIndexField,
  registerEafValidationRule,
  registerEafVisibilityRule,
  registerEafWorkspaceProfile,
  resetEafHookRegistries,
  upsertEafAiMetadata,
  upsertEafSearchMetadata,
  buildEafSearchMetadata,
} from "./hook-registry";

export {
  getAllowedEafLifecycleTargets,
  transitionEafLifecycle,
} from "./lifecycle-engine";

export {
  createEafRelationship,
  deactivateEafRelationship,
  getEafIncomingRelationships,
  getEafOutgoingRelationships,
  getEafRelationships,
  getEafRelationshipsForAsset,
  isEafRelationshipTypeAllowed,
  resetEafRelationships,
} from "./relationship-engine";

export {
  getEafAssetById,
  getEafAssetGraph,
  getEafAssetTypeDefinition,
  getEafAssetTypeDefinitions,
  getEafAssets,
  getEafFrameworkSnapshot,
  getEafFrameworkVersion,
  getEafLifecycleDefinitionById,
  getEafLifecycleDefinitions,
  getEafLifecycleForAssetType,
  getEafRegistryEntry,
  getEafRelationshipTypeDefinitions,
  getEafVersionRecords,
  registerEafAsset,
  registerEafAssetTypeDefinition,
  registerEafLifecycleDefinition,
  registerEafRelationshipTypeDefinition,
  resetEafRegistry,
  searchEafRegistry,
  updateEafAsset,
} from "./registry";

export {
  compareEafVersions,
  createEafVersionRecord,
  formatEafVersion,
  getCurrentEafVersionRecord,
  markEafVersionAsCurrent,
  parseEafVersion,
} from "./version-engine";
export type { EafSemanticVersion } from "./version-engine";

export {
  configureEafEventPublisher,
  configureEafPorts,
  getEafEventPublisher,
  getEafPorts,
  resetEafComposition,
} from "./composition";

export {
  findEafDomainExtension,
  listEafDomainExtensions,
  registerEafDomainExtension,
  resetEafExtensionRegistry,
} from "./extension-registry";

export { createInMemoryEafPorts } from "./repositories/in-memory";
export { createInProcessEafEventPublisher } from "./events/in-process-event-publisher";

export {
  getEafAssetDefinition,
  listEafAssetDefinitions,
  resolveEafAssetDefinition,
} from "./asset-definition-resolver";

export {
  assetTypeSupportsEafCapability,
  declareEafAssetCapabilities,
  findEafCapabilityDefinition,
  getEafCapabilitiesForAssetType,
  listEafAssetCapabilityDeclarations,
  listEafCapabilityDefinitions,
  registerEafCapabilityDefinition,
  resetEafCapabilityRegistry,
} from "./capability-registry";

export { getEafConfigurationProvider } from "./configuration-provider";

export {
  findEafEngineRegistration,
  listEafEngineRegistrations,
  listEnabledEafEngines,
  registerEafEngine,
  resetEafEngineRegistry,
} from "./engine-registry";

export {
  createEafVersionedEvent,
  wrapEafDomainEvent,
} from "./event-versioning";

export {
  getEafFeatureFlagHooksForAssetType,
  listEafAssetFeatureFlagStates,
  listEafFeatureFlagHooks,
  registerEafFeatureFlagHook,
  resolveEafFeatureFlagDefault,
  resetEafFeatureFlagHooks,
  upsertEafAssetFeatureFlagState,
} from "./feature-flag-hooks";

export {
  assessEafAssetHealth,
  getEafAssetHealth,
  getEafHealthSummaryByAssetType,
  listEafAssetHealthRecords,
  resetEafHealthRecords,
  upsertEafAssetHealth,
} from "./health-model";

export {
  buildEafAssetManifest,
  listEafAssetManifests,
} from "./manifest-builder";
