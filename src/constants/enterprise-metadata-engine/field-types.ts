/**
 * EME field data type constants — extensible registry.
 */

import type { EmeFieldDataType } from "@/types/enterprise-metadata-engine";

export const EME_FIELD_DATA_TYPES = {
  SINGLE_LINE_TEXT: "single_line_text",
  LONG_TEXT: "long_text",
  RICH_TEXT: "rich_text",
  NUMBER: "number",
  DECIMAL: "decimal",
  CURRENCY: "currency",
  PERCENTAGE: "percentage",
  BOOLEAN: "boolean",
  DATE: "date",
  DATE_TIME: "date_time",
  TIME: "time",
  EMAIL: "email",
  MOBILE_NUMBER: "mobile_number",
  PHONE_NUMBER: "phone_number",
  URL: "url",
  DROPDOWN: "dropdown",
  MULTI_SELECT: "multi_select",
  RADIO_BUTTON: "radio_button",
  CHECKBOX_GROUP: "checkbox_group",
  LOOKUP: "lookup",
  MULTI_LOOKUP: "multi_lookup",
  FORMULA: "formula",
  AUTO_NUMBER: "auto_number",
  FILE_REFERENCE: "file_reference",
  IMAGE_REFERENCE: "image_reference",
  JSON: "json",
  SYSTEM_FIELD: "system_field",
} as const;

export const EME_FIELD_DATA_TYPE_LIST: EmeFieldDataType[] = Object.values(EME_FIELD_DATA_TYPES);

export const EME_FIELD_DATA_TYPE_LABELS: Record<EmeFieldDataType, string> = {
  single_line_text: "Single Line Text",
  long_text: "Long Text",
  rich_text: "Rich Text",
  number: "Number",
  decimal: "Decimal",
  currency: "Currency",
  percentage: "Percentage",
  boolean: "Boolean",
  date: "Date",
  date_time: "Date & Time",
  time: "Time",
  email: "Email",
  mobile_number: "Mobile Number",
  phone_number: "Phone Number",
  url: "URL",
  dropdown: "Dropdown",
  multi_select: "Multi Select",
  radio_button: "Radio Button",
  checkbox_group: "Checkbox Group",
  lookup: "Lookup",
  multi_lookup: "Multi Lookup",
  formula: "Formula",
  auto_number: "Auto Number",
  file_reference: "File Reference",
  image_reference: "Image Reference",
  json: "JSON",
  system_field: "System Field",
};
