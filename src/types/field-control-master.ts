/**
 * Field Control Master — Foundation V1 governance metadata.
 * This catalog describes field identity. It does not store customer values.
 */

export const FIELD_CONTROL_FIELD_TYPES = [
  "text",
  "long_text",
  "number",
  "currency",
  "percentage",
  "date",
  "yes_no",
  "single_select",
  "multi_select",
] as const;

export type FieldControlFieldType = (typeof FIELD_CONTROL_FIELD_TYPES)[number];

export const FIELD_CONTROL_CLASSIFICATIONS = [
  "raw_canonical",
  "derived",
  "reference_mirror",
  "alias",
  "system",
  "configuration",
  "programme_constraint_reference",
] as const;

export type FieldControlClassification = (typeof FIELD_CONTROL_CLASSIFICATIONS)[number];

export const FIELD_CONTROL_OWNING_DOMAINS = [
  "contact",
  "company",
  "opportunity",
  "deal",
  "accounting",
  "assessment",
  "document",
  "derived_engine",
  "system",
  "unassigned",
] as const;

export type FieldControlOwningDomain = (typeof FIELD_CONTROL_OWNING_DOMAINS)[number];

/** Matches HlMasterLifecycleStatus names, plus inactive for governed deactivation. */
export const FIELD_CONTROL_LIFECYCLE_STATUSES = [
  "draft",
  "checker_review",
  "approved",
  "active",
  "superseded",
  "inactive",
] as const;

export type FieldControlLifecycleStatus = (typeof FIELD_CONTROL_LIFECYCLE_STATUSES)[number];

export const FIELD_CONTROL_OWNERSHIP_REVIEWS = [
  "certified_binding",
  "owner_requires_product_decision",
] as const;

export type FieldControlOwnershipReview = (typeof FIELD_CONTROL_OWNERSHIP_REVIEWS)[number];

export const FIELD_CONTROL_CURRENCY_UNITS = ["rupees", "thousand", "lakh", "crore"] as const;

export type FieldControlCurrencyUnit = (typeof FIELD_CONTROL_CURRENCY_UNITS)[number];

export const FIELD_CONTROL_CURRENCY_UNIT_FACTORS: Record<FieldControlCurrencyUnit, number> = {
  rupees: 1,
  thousand: 1_000,
  lakh: 100_000,
  crore: 10_000_000,
};

export type FieldControlSourceBinding =
  | { kind: "column"; model: string; field: string }
  | {
      kind: "assessment_fact";
      path: string;
      store: "EnterpriseOpportunityAssessment.draftFactsJson";
    }
  | { kind: "derived_calculator"; calculatorId: string }
  | { kind: "unresolved"; legacyProjectionId: string };

/**
 * Published definition versions are immutable.
 * Foundation V1 rows are inspection drafts. They do not control runtime forms.
 * Contextual required / optional / not applicable is intentionally absent.
 */
export type FieldControlDefinition = {
  fieldId: string;
  lineageId: string;
  versionNumber: number;
  friendlyLabel: string;
  description: string;
  helpText: string;
  fieldType: FieldControlFieldType;
  classification: FieldControlClassification;
  owningDomain: FieldControlOwningDomain;
  ownershipReview: FieldControlOwnershipReview;
  sourceBinding: FieldControlSourceBinding;
  aliases: readonly string[];
  lifecycleStatus: FieldControlLifecycleStatus;
  productApplicability: readonly string[];
  customerCategoryApplicability: readonly string[];
  applicabilityDeclared: boolean;
  authorisedConsumers: readonly string[];
  validationSummary: string;
  presentationSummary: string;
  selectOptionSource: string | null;
  selectOptionKeys: readonly string[];
  currencyUnits: readonly FieldControlCurrencyUnit[];
  /** Candidate only. Not an alias and not a resolved owner. */
  candidateMirrorOf: string | null;
  controlsRuntime: false;
  customerFacingActivation: false;
  makerUserId: string | null;
  checkerUserId: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
};
