/**
 * EME Ports — repository contracts for metadata engine adapters.
 */

import type {
  EmeFieldDefinition,
  EmeFormulaOperator,
  EmeMetadataCategory,
  EmeMetadataDefinition,
  EmeMetadataVersionRecord,
  EmeValidationRuleMetadata,
} from "./enterprise-metadata-engine";
import type { EafAssetTypeCode } from "@/types/enterprise-asset-framework";

export interface EmeMetadataRegistryPort {
  list(): EmeMetadataDefinition[];
  findById(id: string): EmeMetadataDefinition | undefined;
  findByAssetTypeCode(assetTypeCode: EafAssetTypeCode): EmeMetadataDefinition | undefined;
  findBySchemaCode(schemaCode: string): EmeMetadataDefinition | undefined;
  save(definition: EmeMetadataDefinition): void;
  replaceAll(definitions: EmeMetadataDefinition[]): void;
}

export interface EmeFieldDefinitionRepositoryPort {
  list(): EmeFieldDefinition[];
  findById(id: string): EmeFieldDefinition | undefined;
  listByMetadataDefinitionId(metadataDefinitionId: string): EmeFieldDefinition[];
  listByAssetTypeCode(assetTypeCode: EafAssetTypeCode): EmeFieldDefinition[];
  save(field: EmeFieldDefinition): void;
  replaceAll(fields: EmeFieldDefinition[]): void;
}

export interface EmeCategoryRegistryPort {
  list(): EmeMetadataCategory[];
  findByCode(categoryCode: string): EmeMetadataCategory | undefined;
  save(category: EmeMetadataCategory): void;
  replaceAll(categories: EmeMetadataCategory[]): void;
}

export interface EmeValidationRuleRepositoryPort {
  list(): EmeValidationRuleMetadata[];
  findById(id: string): EmeValidationRuleMetadata | undefined;
  findByCode(ruleCode: string): EmeValidationRuleMetadata | undefined;
  save(rule: EmeValidationRuleMetadata): void;
  replaceAll(rules: EmeValidationRuleMetadata[]): void;
}

export interface EmeFormulaOperatorRegistryPort {
  list(): EmeFormulaOperator[];
  findByCode(operatorCode: string): EmeFormulaOperator | undefined;
  replaceAll(operators: EmeFormulaOperator[]): void;
}

export interface EmeVersionRepositoryPort {
  list(): EmeMetadataVersionRecord[];
  append(record: EmeMetadataVersionRecord): void;
  findByMetadataDefinitionId(metadataDefinitionId: string): EmeMetadataVersionRecord[];
  replaceAll(records: EmeMetadataVersionRecord[]): void;
}

export interface EmePorts {
  metadataRegistry: EmeMetadataRegistryPort;
  fields: EmeFieldDefinitionRepositoryPort;
  categories: EmeCategoryRegistryPort;
  validationRules: EmeValidationRuleRepositoryPort;
  formulaOperators: EmeFormulaOperatorRegistryPort;
  versions: EmeVersionRepositoryPort;
}

export type PartialEmePorts = Partial<EmePorts>;
