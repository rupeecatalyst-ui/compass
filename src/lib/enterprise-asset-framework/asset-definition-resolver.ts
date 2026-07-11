/**
 * EAF Asset Definition resolver — derives metadata from configuration registries.
 */

import type { EafAssetTypeCode } from "@/types/enterprise-asset-framework";
import type { EafAssetDefinition } from "@/types/enterprise-asset-framework-definition";
import { EAF_CAPABILITY_CODES } from "@/constants/enterprise-asset-framework/capabilities";
import { getEafCapabilitiesForAssetType } from "./capability-registry";
import { getEafConfigurationProvider } from "./configuration-provider";
import { getEafPorts } from "./composition";

function filterByAssetType<T extends { applicableAssetTypeCodes?: EafAssetTypeCode[]; assetTypeCodes?: EafAssetTypeCode[]; assetTypeCode?: EafAssetTypeCode; enabled: boolean }>(
  items: T[],
  assetTypeCode: EafAssetTypeCode,
  typeKey: "applicableAssetTypeCodes" | "assetTypeCodes" | "assetTypeCode",
): T[] {
  return items.filter((item) => {
    if (!item.enabled) return false;
    if (typeKey === "assetTypeCode") {
      return !item.assetTypeCode || item.assetTypeCode === assetTypeCode;
    }
    const codes = item[typeKey] as EafAssetTypeCode[] | undefined;
    return !codes || codes.length === 0 || codes.includes(assetTypeCode);
  });
}

export function resolveEafAssetDefinition(assetTypeCode: EafAssetTypeCode): EafAssetDefinition | undefined {
  const config = getEafConfigurationProvider();
  const typeDef = config.findAssetType(assetTypeCode);
  if (!typeDef?.enabled) return undefined;

  const lifecycle = config.findLifecycleDefinitionById(typeDef.lifecycleDefinitionId);
  if (!lifecycle?.enabled) return undefined;

  const ports = getEafPorts();
  const metadataBundle = ports.metadataHooks.getBundle();
  const permissionBundle = ports.permissionHooks.getBundle();

  const relationshipTypes = config
    .listRelationshipTypes()
    .filter(
      (r) =>
        r.enabled &&
        (r.sourceAssetTypeCodes.length === 0 ||
          r.sourceAssetTypeCodes.includes(assetTypeCode) ||
          r.targetAssetTypeCodes.includes(assetTypeCode)),
    )
    .map((r) => r.relationshipTypeCode);

  const aiHooks = ports.aiHooks.listHooks();
  const applicableAiHooks = filterByAssetType(aiHooks, assetTypeCode, "applicableAssetTypeCodes");
  const aiCapabilities = [
    ...new Set(applicableAiHooks.flatMap((h) => h.capabilities)),
  ] as EafAssetDefinition["supportedAiCapabilities"]["capabilities"];

  const searchFields = ports.searchHooks.listIndexFields();
  const applicableSearchFields = filterByAssetType(searchFields, assetTypeCode, "assetTypeCodes");

  const rolePermissions = filterByAssetType(
    permissionBundle.rolePermissions,
    assetTypeCode,
    "assetTypeCode",
  );
  const visibilityRules = filterByAssetType(
    permissionBundle.visibilityRules,
    assetTypeCode,
    "applicableAssetTypeCodes",
  );
  const workspaceProfiles = permissionBundle.workspaceProfiles.filter((w) => w.enabled);

  const declaredCapabilities = getEafCapabilitiesForAssetType(assetTypeCode).map(
    (c) => c.capabilityCode,
  );

  return {
    assetTypeCode,
    displayName: typeDef.label,
    description: typeDef.description,
    supportedLifecycle: {
      lifecycleDefinitionId: lifecycle.id,
      lifecycleCode: lifecycle.lifecycleCode,
      stateCodes: lifecycle.states.map((s) => s.stateCode),
      defaultStateCode: lifecycle.defaultStateCode,
    },
    supportedRelationships: relationshipTypes,
    supportedMetadata: {
      fieldCodes: metadataBundle.fieldDefinitions.filter((f) => f.enabled).map((f) => f.fieldCode),
      layoutCodes: metadataBundle.layoutDefinitions
        .filter(
          (l) =>
            l.enabled &&
            (l.applicableAssetTypeCodes.length === 0 ||
              l.applicableAssetTypeCodes.includes(assetTypeCode)),
        )
        .map((l) => l.layoutCode),
      formCodes: metadataBundle.formDefinitions
        .filter(
          (f) =>
            f.enabled &&
            (f.applicableAssetTypeCodes.length === 0 ||
              f.applicableAssetTypeCodes.includes(assetTypeCode)),
        )
        .map((f) => f.formCode),
      validationRuleCodes: metadataBundle.validationRules
        .filter((r) => r.enabled)
        .map((r) => r.ruleCode),
    },
    supportedAiCapabilities: {
      hookCodes: applicableAiHooks.map((h) => h.hookCode),
      capabilities: aiCapabilities,
    },
    supportedSearchCapabilities: {
      indexFieldCodes: applicableSearchFields.map((f) => f.fieldCode),
      supportsFacets: declaredCapabilities.includes(EAF_CAPABILITY_CODES.SEARCH),
      supportsFullText: declaredCapabilities.includes(EAF_CAPABILITY_CODES.SEARCH),
    },
    supportedPermissions: {
      permissionCodes: rolePermissions.flatMap((r) => r.permissionCodes),
      visibilityRuleCodes: visibilityRules.map((r) => r.ruleCode),
      workspaceProfileCodes: workspaceProfiles.map((w) => w.profileCode),
    },
    supportedWorkspaces: workspaceProfiles.map((w) => w.profileCode),
    declaredCapabilities,
    enabled: typeDef.enabled,
  };
}

export function listEafAssetDefinitions(): EafAssetDefinition[] {
  return getEafConfigurationProvider()
    .listAssetTypes()
    .filter((t) => t.enabled)
    .map((t) => resolveEafAssetDefinition(t.assetTypeCode))
    .filter((d): d is EafAssetDefinition => Boolean(d));
}

export function getEafAssetDefinition(assetTypeCode: EafAssetTypeCode): EafAssetDefinition | undefined {
  return resolveEafAssetDefinition(assetTypeCode);
}
