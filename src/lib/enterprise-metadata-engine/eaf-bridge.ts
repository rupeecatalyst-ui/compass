/**
 * EME EAF bridge — optional backward-compatible sync to Sprint 1 metadata hooks.
 *
 * Does not modify EAF internals. Translates EME field definitions into EAF hook format.
 */

import type { EafDynamicFieldDefinition } from "@/types/enterprise-asset-framework";
import type { EmeFieldDataType, EmeFieldDefinition } from "@/types/enterprise-metadata-engine";
import { registerEafDynamicField } from "@/lib/enterprise-asset-framework";

const EME_TO_EAF_DATA_TYPE: Partial<
  Record<EmeFieldDataType, EafDynamicFieldDefinition["dataType"]>
> = {
  single_line_text: "string",
  long_text: "string",
  rich_text: "string",
  number: "number",
  decimal: "number",
  currency: "number",
  percentage: "number",
  boolean: "boolean",
  date: "date",
  date_time: "date",
  time: "string",
  email: "string",
  mobile_number: "string",
  phone_number: "string",
  url: "string",
  dropdown: "enum",
  multi_select: "enum",
  radio_button: "enum",
  checkbox_group: "enum",
  lookup: "string",
  multi_lookup: "json",
  formula: "string",
  auto_number: "number",
  file_reference: "string",
  image_reference: "string",
  json: "json",
  system_field: "string",
};

export function toEafDynamicFieldDefinition(field: EmeFieldDefinition): EafDynamicFieldDefinition {
  return {
    id: field.id,
    fieldCode: field.internalCode,
    label: field.displayLabel,
    dataType: EME_TO_EAF_DATA_TYPE[field.dataType] ?? "string",
    required: field.required,
    validationRuleRefs: field.validationRuleIds,
    layoutSectionRef: field.categoryCode,
    enabled: field.enabled,
  };
}

export function syncEmeFieldToEafHooks(field: EmeFieldDefinition): void {
  registerEafDynamicField(toEafDynamicFieldDefinition(field));
}
