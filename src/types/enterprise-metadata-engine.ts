/**
 * Enterprise Metadata Engine (EME) — Sprint 2 Foundation.
 *
 * Metadata-driven field, category, validation, and formula definitions
 * for every Enterprise Asset. No runtime evaluation, no UI rendering.
 */

import type { EafAssetTypeCode } from "@/types/enterprise-asset-framework";

// ---------------------------------------------------------------------------
// Field data types — extensible without redesign
// ---------------------------------------------------------------------------

export type EmeFieldDataType =
  | "single_line_text"
  | "long_text"
  | "rich_text"
  | "number"
  | "decimal"
  | "currency"
  | "percentage"
  | "boolean"
  | "date"
  | "date_time"
  | "time"
  | "email"
  | "mobile_number"
  | "phone_number"
  | "url"
  | "dropdown"
  | "multi_select"
  | "radio_button"
  | "checkbox_group"
  | "lookup"
  | "multi_lookup"
  | "formula"
  | "auto_number"
  | "file_reference"
  | "image_reference"
  | "json"
  | "system_field";

export type EmeFieldValue = string | number | boolean | string[] | null;

// ---------------------------------------------------------------------------
// Metadata registry — one definition per enterprise asset schema
// ---------------------------------------------------------------------------

export interface EmeMetadataDefinition {
  id: string;
  assetTypeCode: EafAssetTypeCode;
  schemaCode: string;
  displayName: string;
  description: string;
  version: string;
  categoryCodes: string[];
  fieldDefinitionIds: string[];
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Field definition framework
// ---------------------------------------------------------------------------

export interface EmeFieldDefinition {
  id: string;
  metadataDefinitionId: string;
  assetTypeCode: EafAssetTypeCode;
  fieldName: string;
  displayLabel: string;
  internalCode: string;
  description: string;
  dataType: EmeFieldDataType;
  required: boolean;
  readOnly: boolean;
  hidden: boolean;
  defaultValue?: EmeFieldValue;
  placeholder?: string;
  helpText?: string;
  validationRuleIds: string[];
  displayOrder: number;
  categoryCode: string;
  enabled: boolean;
  /** Lookup target reference — resolved by future sprints. */
  lookupRef?: string;
  /** Formula expression reference — metadata only, no evaluation. */
  formulaRef?: string;
  /** Option values for dropdown, multi-select, radio, checkbox group. */
  optionValues?: EmeFieldOption[];
  /** Marks platform-managed system fields. */
  systemFieldFlag: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EmeFieldOption {
  optionCode: string;
  label: string;
  sortOrder: number;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Metadata categories
// ---------------------------------------------------------------------------

export interface EmeMetadataCategory {
  id: string;
  categoryCode: string;
  label: string;
  description: string;
  displayOrder: number;
  isSystem: boolean;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Validation framework — metadata only
// ---------------------------------------------------------------------------

export type EmeValidationRuleType =
  | "required"
  | "minimum"
  | "maximum"
  | "regex"
  | "length"
  | "custom";

export interface EmeValidationRuleMetadata {
  id: string;
  ruleCode: string;
  ruleType: EmeValidationRuleType;
  label: string;
  description: string;
  parameters: Record<string, string | number | boolean>;
  /** Placeholder for future custom validation expression. */
  expressionRef?: string;
  severity: "error" | "warning" | "info";
  applicableFieldTypes: EmeFieldDataType[];
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Formula foundation — operator metadata only
// ---------------------------------------------------------------------------

export type EmeFormulaOperatorCategory =
  | "arithmetic"
  | "comparison"
  | "logical"
  | "grouping";

export interface EmeFormulaOperator {
  id: string;
  operatorCode: string;
  symbol: string;
  label: string;
  description: string;
  category: EmeFormulaOperatorCategory;
  operandCount: number | "variadic";
  enabled: boolean;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Metadata versioning
// ---------------------------------------------------------------------------

export interface EmeMetadataVersionRecord {
  id: string;
  metadataDefinitionId: string;
  schemaCode: string;
  version: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  changeSummary: string;
  snapshotRef: string;
  createdBy: string;
  createdOn: string;
  isCurrent: boolean;
}

// ---------------------------------------------------------------------------
// Registry snapshots
// ---------------------------------------------------------------------------

export interface EmeMetadataRegistrySnapshot {
  definitions: EmeMetadataDefinition[];
  fields: EmeFieldDefinition[];
  categories: EmeMetadataCategory[];
  validationRules: EmeValidationRuleMetadata[];
  formulaOperators: EmeFormulaOperator[];
  versions: EmeMetadataVersionRecord[];
}
