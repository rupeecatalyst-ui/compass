/**
 * Enterprise Initial Data Collection (IDC) — SSOT field model.
 *
 * Catalyst One owns definitions. Catalyst Connect / Partner Gateway project this model.
 * Never invent Connect-only fields or validation.
 */

export type IdcControl = "text" | "textarea" | "select" | "number" | "city_search" | "lender_search";

export type IdcOption = {
  value: string;
  label: string;
  /** Parent master id for cascading selects (e.g. occupation → employment type). */
  parentId?: string;
};

/** Presentation validation — Partner UI enforces; never a parallel Connect rule set. */
export type IdcFieldValidation = {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  min?: number;
  max?: number;
};

export type IdcFieldDef = {
  key: string;
  label: string;
  control: IdcControl;
  required?: boolean;
  placeholder?: string;
  /** Mentor / helper copy under the control. */
  helpText?: string;
  /** Applied when the field first becomes visible and value is empty. */
  defaultValue?: string;
  optionSet?: string;
  displayOrder: number;
  /** HTML inputMode hint for mobile keyboards. */
  inputMode?: "text" | "tel" | "numeric" | "decimal" | "email";
  validation?: IdcFieldValidation;
  /** When set, field shows only for this primaryBorrowerKind. */
  visibleWhenBorrower?: "individual" | "company";
  /** When set, field shows only for these product families. */
  visibleWhenProductFamilies?: string[];
  /** Field-level conditional visibility (same value bags). */
  visibleWhenField?: string;
  visibleWhenValues?: string[];
};

export type IdcSectionDef = {
  sectionId: string;
  name: string;
  description?: string;
  displayOrder: number;
  visibility?: "visible" | "hidden";
  mandatory?: boolean;
  visibleWhenBorrower?: "individual" | "company" | "any";
  visibleWhenProductFamilies?: string[];
  valueBucket: "borrower" | "product" | "requirement" | "customer";
  fields: IdcFieldDef[];
};

export type IdcCustomerCaptureDef = {
  title: string;
  description?: string;
  /** Progressive Contact parity — Primary Applicant minimum. */
  fields: IdcFieldDef[];
  /** Digits required before Enterprise customer search fires. */
  searchMinMobileDigits: number;
};

export type IdcCatalog = {
  version: string;
  customerCapture: IdcCustomerCaptureDef;
  detailSections: IdcSectionDef[];
};
