/**
 * EME validation rule type metadata — no runtime engine.
 */

import { EME_FIELD_DATA_TYPES } from "./field-types";
import type { EmeValidationRuleMetadata } from "@/types/enterprise-metadata-engine";

export const EME_VALIDATION_RULE_TYPES = {
  REQUIRED: "required",
  MINIMUM: "minimum",
  MAXIMUM: "maximum",
  REGEX: "regex",
  LENGTH: "length",
  CUSTOM: "custom",
} as const;

export const EME_DEFAULT_VALIDATION_RULES: EmeValidationRuleMetadata[] = [
  {
    id: "eme-val-required",
    ruleCode: "required",
    ruleType: "required",
    label: "Required",
    description: "Field must have a value.",
    parameters: {},
    severity: "error",
    applicableFieldTypes: Object.values(EME_FIELD_DATA_TYPES),
    enabled: true,
  },
  {
    id: "eme-val-minimum",
    ruleCode: "minimum",
    ruleType: "minimum",
    label: "Minimum",
    description: "Minimum numeric or length value.",
    parameters: { min: 0 },
    severity: "error",
    applicableFieldTypes: ["number", "decimal", "currency", "percentage", "single_line_text", "long_text"],
    enabled: true,
  },
  {
    id: "eme-val-maximum",
    ruleCode: "maximum",
    ruleType: "maximum",
    label: "Maximum",
    description: "Maximum numeric or length value.",
    parameters: { max: 0 },
    severity: "error",
    applicableFieldTypes: ["number", "decimal", "currency", "percentage", "single_line_text", "long_text"],
    enabled: true,
  },
  {
    id: "eme-val-regex",
    ruleCode: "regex",
    ruleType: "regex",
    label: "Regex",
    description: "Pattern match validation.",
    parameters: { pattern: "" },
    severity: "error",
    applicableFieldTypes: ["single_line_text", "long_text", "email", "url", "mobile_number", "phone_number"],
    enabled: true,
  },
  {
    id: "eme-val-length",
    ruleCode: "length",
    ruleType: "length",
    label: "Length",
    description: "Minimum and maximum string length.",
    parameters: { minLength: 0, maxLength: 0 },
    severity: "error",
    applicableFieldTypes: ["single_line_text", "long_text", "rich_text"],
    enabled: true,
  },
  {
    id: "eme-val-custom",
    ruleCode: "custom",
    ruleType: "custom",
    label: "Custom Validation",
    description: "Placeholder for future custom validation expressions.",
    parameters: {},
    expressionRef: "custom.validation.placeholder",
    severity: "error",
    applicableFieldTypes: Object.values(EME_FIELD_DATA_TYPES),
    enabled: true,
  },
];
