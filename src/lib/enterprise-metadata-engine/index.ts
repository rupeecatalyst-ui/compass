export {
  configureEmePorts,
  getEmePorts,
  resetEmeComposition,
} from "./composition";

export { createInMemoryEmePorts } from "./repositories/in-memory";

export {
  getEmeMetadataDefinitionByAssetType,
  getEmeMetadataDefinitionById,
  getEmeMetadataDefinitionBySchemaCode,
  listEmeMetadataDefinitions,
  registerEmeMetadataDefinition,
  resetEmeMetadataRegistry,
  updateEmeMetadataDefinition,
} from "./metadata-registry";

export {
  getEmeFieldDefinitionById,
  getEmeFieldsForAssetType,
  getEmeFieldsForMetadataDefinition,
  listEmeFieldDataTypes,
  listEmeFieldDefinitions,
  registerEmeFieldDefinition,
} from "./field-definition-engine";

export {
  getEmeMetadataCategory,
  listEmeMetadataCategories,
  registerEmeMetadataCategory,
  resetEmeMetadataCategories,
} from "./category-registry";

export {
  getEmeValidationRuleByCode,
  listEmeValidationRuleMetadata,
  registerEmeValidationRuleMetadata,
} from "./validation-metadata";

export {
  getEmeFormulaOperator,
  listEmeFormulaOperators,
  listEmeFormulaOperatorsByCategory,
} from "./formula-metadata";

export {
  bumpEmeMetadataVersion,
  createEmeMetadataVersionRecord,
  formatEmeVersion,
  getCurrentEmeMetadataVersion,
  parseEmeVersion,
} from "./version-engine";
export type { EmeSemanticVersion } from "./version-engine";

export {
  getEmeFrameworkVersion,
  getEmeMetadataRegistrySnapshot,
  getEmeMetadataVersions,
} from "./registry-snapshot";

export { syncEmeFieldToEafHooks, toEafDynamicFieldDefinition } from "./eaf-bridge";

export type { EmeMetadataAuditAction } from "./audit-integration";
