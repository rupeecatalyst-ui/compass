/**
 * In-memory EAF adapters — default Sprint 1 implementation.
 * Replace via configureEafPorts() when persistence layer arrives.
 */

import {
  EAF_DEFAULT_ASSET_CAPABILITY_DECLARATIONS,
  EAF_DEFAULT_CAPABILITY_DEFINITIONS,
} from "@/constants/enterprise-asset-framework/capabilities";
import { EAF_DEFAULT_ENGINE_REGISTRATIONS } from "@/constants/enterprise-asset-framework/engines";
import {
  EAF_DEFAULT_ASSET_TYPE_DEFINITIONS,
  EAF_DEFAULT_LIFECYCLE_DEFINITION,
  EAF_DEFAULT_RELATIONSHIP_TYPES,
  EAF_EMPTY_METADATA_HOOKS,
  EAF_EMPTY_PERMISSION_HOOKS,
} from "@/constants/enterprise-asset-framework";
import type {
  EafAiHookDefinition,
  EafAiMetadata,
  EafAssetRelationship,
  EafAssetTypeDefinition,
  EafAssetVersionRecord,
  EafAuditEntry,
  EafBaseAsset,
  EafLifecycleDefinition,
  EafMetadataHookBundle,
  EafPermissionHookBundle,
  EafRelationshipTypeDefinition,
  EafSearchIndexFieldDefinition,
  EafSearchMetadata,
} from "@/types/enterprise-asset-framework";
import type {
  EafAssetCapabilityDeclaration,
  EafCapabilityDefinition,
} from "@/types/enterprise-asset-framework-capabilities";
import type { EafAssetHealthRecord } from "@/types/enterprise-asset-framework-definition";
import type { EafEngineRegistration } from "@/types/enterprise-asset-framework-engines";
import type {
  EafAssetFeatureFlagState,
  EafFeatureFlagHook,
} from "@/types/enterprise-asset-framework-feature-flags";
import type { EafPorts } from "@/types/enterprise-asset-framework-ports";

function createMutableListStore<T>(): {
  list: () => T[];
  replaceAll: (items: T[]) => void;
  append: (item: T) => void;
  upsert: (item: T, key: (item: T) => string) => void;
} {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next) => {
      items = next;
    },
    append: (item) => {
      items = [item, ...items];
    },
    upsert: (item, key) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

export function createInMemoryEafPorts(): EafPorts {
  const assetTypes = createMutableListStore<EafAssetTypeDefinition>();
  assetTypes.replaceAll([...EAF_DEFAULT_ASSET_TYPE_DEFINITIONS]);

  const lifecycles = createMutableListStore<EafLifecycleDefinition>();
  lifecycles.replaceAll([EAF_DEFAULT_LIFECYCLE_DEFINITION]);

  const relationshipTypes = createMutableListStore<EafRelationshipTypeDefinition>();
  relationshipTypes.replaceAll([...EAF_DEFAULT_RELATIONSHIP_TYPES]);

  const assets = createMutableListStore<EafBaseAsset>();
  const versions = createMutableListStore<EafAssetVersionRecord>();
  const audit = createMutableListStore<EafAuditEntry>();
  const relationships = createMutableListStore<EafAssetRelationship>();
  const searchMetadata = createMutableListStore<EafSearchMetadata>();
  const aiMetadata = createMutableListStore<EafAiMetadata>();

  let metadataBundle: EafMetadataHookBundle = { ...EAF_EMPTY_METADATA_HOOKS };
  let permissionBundle: EafPermissionHookBundle = { ...EAF_EMPTY_PERMISSION_HOOKS };
  let searchIndexFields: EafSearchIndexFieldDefinition[] = [];
  let aiHooks: EafAiHookDefinition[] = [];

  let capabilityDefinitions: EafCapabilityDefinition[] = [...EAF_DEFAULT_CAPABILITY_DEFINITIONS];
  let assetCapabilityDeclarations: EafAssetCapabilityDeclaration[] = [
    ...EAF_DEFAULT_ASSET_CAPABILITY_DECLARATIONS,
  ];
  let engineRegistrations: EafEngineRegistration[] = [...EAF_DEFAULT_ENGINE_REGISTRATIONS];
  const healthRecords = createMutableListStore<EafAssetHealthRecord>();
  let featureFlagHooks: EafFeatureFlagHook[] = [];
  let featureFlagStates: EafAssetFeatureFlagState[] = [];

  return {
    configuration: {
      listAssetTypes: () => assetTypes.list(),
      findAssetType: (code) =>
        assetTypes.list().find((t) => t.assetTypeCode === code && t.enabled),
      saveAssetType: (definition) => {
        assetTypes.replaceAll([
          ...assetTypes.list().filter((t) => t.id !== definition.id),
          definition,
        ]);
      },
      listLifecycleDefinitions: () => lifecycles.list(),
      findLifecycleDefinitionById: (id) =>
        lifecycles.list().find((d) => d.id === id && d.enabled),
      saveLifecycleDefinition: (definition) => {
        lifecycles.replaceAll([
          ...lifecycles.list().filter((d) => d.id !== definition.id),
          definition,
        ]);
      },
      listRelationshipTypes: () => relationshipTypes.list(),
      saveRelationshipType: (definition) => {
        relationshipTypes.replaceAll([
          ...relationshipTypes.list().filter((d) => d.id !== definition.id),
          definition,
        ]);
      },
    },
    capabilities: {
      listDefinitions: () => capabilityDefinitions,
      findDefinition: (code) => capabilityDefinitions.find((d) => d.capabilityCode === code && d.enabled),
      saveDefinition: (definition) => {
        capabilityDefinitions = [
          ...capabilityDefinitions.filter((d) => d.capabilityCode !== definition.capabilityCode),
          definition,
        ];
      },
      listAssetDeclarations: () => assetCapabilityDeclarations,
      findAssetDeclaration: (assetTypeCode) =>
        assetCapabilityDeclarations.find((d) => d.assetTypeCode === assetTypeCode && d.enabled),
      saveAssetDeclaration: (declaration) => {
        assetCapabilityDeclarations = [
          ...assetCapabilityDeclarations.filter((d) => d.assetTypeCode !== declaration.assetTypeCode),
          declaration,
        ];
      },
      reset: () => {
        capabilityDefinitions = [...EAF_DEFAULT_CAPABILITY_DEFINITIONS];
        assetCapabilityDeclarations = [...EAF_DEFAULT_ASSET_CAPABILITY_DECLARATIONS];
      },
    },
    engines: {
      list: () => engineRegistrations,
      find: (engineCode) => engineRegistrations.find((e) => e.engineCode === engineCode && e.enabled),
      register: (registration) => {
        engineRegistrations = [
          ...engineRegistrations.filter((e) => e.engineCode !== registration.engineCode),
          registration,
        ];
      },
      reset: () => {
        engineRegistrations = [...EAF_DEFAULT_ENGINE_REGISTRATIONS];
      },
    },
    health: {
      list: () => healthRecords.list(),
      findByAssetId: (assetId) => healthRecords.list().find((r) => r.assetId === assetId),
      upsert: (record) => healthRecords.upsert(record, (r) => r.assetId),
      replaceAll: (records) => healthRecords.replaceAll(records),
    },
    featureFlags: {
      listHooks: () => featureFlagHooks,
      saveHook: (hook) => {
        featureFlagHooks = [...featureFlagHooks.filter((h) => h.id !== hook.id), hook];
      },
      listAssetStates: () => featureFlagStates,
      upsertAssetState: (state) => {
        featureFlagStates = [
          ...featureFlagStates.filter(
            (s) => !(s.assetId === state.assetId && s.flagCode === state.flagCode),
          ),
          state,
        ];
      },
      reset: () => {
        featureFlagHooks = [];
        featureFlagStates = [];
      },
    },
    assets: {
      list: () => assets.list(),
      findById: (id) => assets.list().find((a) => a.id === id),
      save: (asset) => assets.upsert(asset, (a) => a.id),
      replaceAll: (items) => assets.replaceAll(items),
    },
    versions: {
      list: () => versions.list(),
      append: (record) => versions.append(record),
      replaceAll: (records) => versions.replaceAll(records),
    },
    audit: {
      list: () => audit.list(),
      append: (entry) => audit.append(entry),
      findByAssetId: (assetId) =>
        audit
          .list()
          .filter((e) => e.assetId === assetId)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      replaceAll: (entries) => audit.replaceAll(entries),
    },
    relationships: {
      list: () => relationships.list(),
      save: (relationship) => relationships.append(relationship),
      replaceAll: (items) => relationships.replaceAll(items),
    },
    searchMetadata: {
      list: () => searchMetadata.list(),
      upsert: (metadata) => searchMetadata.upsert(metadata, (m) => m.assetId),
      replaceAll: (items) => searchMetadata.replaceAll(items),
    },
    aiMetadata: {
      list: () => aiMetadata.list(),
      upsert: (metadata) => aiMetadata.upsert(metadata, (m) => m.assetId),
      replaceAll: (items) => aiMetadata.replaceAll(items),
    },
    metadataHooks: {
      getBundle: () => metadataBundle,
      saveField: (definition) => {
        metadataBundle = {
          ...metadataBundle,
          fieldDefinitions: [
            ...metadataBundle.fieldDefinitions.filter((d) => d.id !== definition.id),
            definition,
          ],
        };
      },
      saveLayout: (definition) => {
        metadataBundle = {
          ...metadataBundle,
          layoutDefinitions: [
            ...metadataBundle.layoutDefinitions.filter((d) => d.id !== definition.id),
            definition,
          ],
        };
      },
      saveForm: (definition) => {
        metadataBundle = {
          ...metadataBundle,
          formDefinitions: [
            ...metadataBundle.formDefinitions.filter((d) => d.id !== definition.id),
            definition,
          ],
        };
      },
      saveValidationRule: (definition) => {
        metadataBundle = {
          ...metadataBundle,
          validationRules: [
            ...metadataBundle.validationRules.filter((d) => d.id !== definition.id),
            definition,
          ],
        };
      },
      reset: (bundle) => {
        metadataBundle = bundle ?? { ...EAF_EMPTY_METADATA_HOOKS };
      },
    },
    permissionHooks: {
      getBundle: () => permissionBundle,
      saveRolePermission: (hook) => {
        permissionBundle = {
          ...permissionBundle,
          rolePermissions: [
            ...permissionBundle.rolePermissions.filter((h) => h.id !== hook.id),
            hook,
          ],
        };
      },
      saveVisibilityRule: (hook) => {
        permissionBundle = {
          ...permissionBundle,
          visibilityRules: [
            ...permissionBundle.visibilityRules.filter((h) => h.id !== hook.id),
            hook,
          ],
        };
      },
      saveWorkspaceProfile: (hook) => {
        permissionBundle = {
          ...permissionBundle,
          workspaceProfiles: [
            ...permissionBundle.workspaceProfiles.filter((h) => h.id !== hook.id),
            hook,
          ],
        };
      },
      reset: (bundle) => {
        permissionBundle = bundle ?? { ...EAF_EMPTY_PERMISSION_HOOKS };
      },
    },
    searchHooks: {
      listIndexFields: () => searchIndexFields,
      saveIndexField: (field) => {
        searchIndexFields = [...searchIndexFields.filter((f) => f.id !== field.id), field];
      },
      reset: (fields) => {
        searchIndexFields = fields ?? [];
      },
    },
    aiHooks: {
      listHooks: () => aiHooks,
      saveHook: (hook) => {
        aiHooks = [...aiHooks.filter((h) => h.id !== hook.id), hook];
      },
      reset: (hooks) => {
        aiHooks = hooks ?? [];
      },
    },
  };
}
