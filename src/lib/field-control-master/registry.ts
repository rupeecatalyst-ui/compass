/**
 * Foundation V1 inspection registry.
 * Existing values stay in their domain tables and assessment documents.
 * This module does not write those values and does not drive runtime forms.
 */

import type {
  FieldControlCurrencyUnit,
  FieldControlDefinition,
  FieldControlFieldType,
  FieldControlOwningDomain,
  FieldControlSourceBinding,
} from "@/types/field-control-master";

const HL = ["HOME_LOAN", "HOME_LOAN_BT"] as const;

type RowInput = {
  fieldId: string;
  friendlyLabel: string;
  description: string;
  helpText: string;
  fieldType: FieldControlFieldType;
  classification: FieldControlDefinition["classification"];
  owningDomain: FieldControlOwningDomain;
  ownershipReview: FieldControlDefinition["ownershipReview"];
  sourceBinding: FieldControlSourceBinding;
  aliases?: readonly string[];
  productApplicability?: readonly string[];
  applicabilityDeclared?: boolean;
  authorisedConsumers?: readonly string[];
  validationSummary: string;
  presentationSummary: string;
  currencyUnits?: readonly FieldControlCurrencyUnit[];
  candidateMirrorOf?: string | null;
};

function row(input: RowInput): FieldControlDefinition {
  const products = input.productApplicability ?? [];
  return {
    fieldId: input.fieldId,
    lineageId: input.fieldId,
    versionNumber: 1,
    friendlyLabel: input.friendlyLabel,
    description: input.description,
    helpText: input.helpText,
    fieldType: input.fieldType,
    classification: input.classification,
    owningDomain: input.owningDomain,
    ownershipReview: input.ownershipReview,
    sourceBinding: input.sourceBinding,
    aliases: input.aliases ?? [],
    lifecycleStatus: "draft",
    productApplicability: products,
    customerCategoryApplicability: [],
    applicabilityDeclared: input.applicabilityDeclared ?? products.length > 0,
    authorisedConsumers: input.authorisedConsumers ?? [],
    validationSummary: input.validationSummary,
    presentationSummary: input.presentationSummary,
    selectOptionSource: null,
    selectOptionKeys: [],
    currencyUnits: input.currencyUnits ?? [],
    candidateMirrorOf: input.candidateMirrorOf ?? null,
    controlsRuntime: false,
    customerFacingActivation: false,
    makerUserId: "foundation-v1-baseline",
    checkerUserId: null,
    effectiveFrom: null,
    effectiveUntil: null,
  };
}

const column = (model: string, field: string): FieldControlSourceBinding => ({ kind: "column", model, field });

const assessment = (path: string): FieldControlSourceBinding => ({
  kind: "assessment_fact",
  path,
  store: "EnterpriseOpportunityAssessment.draftFactsJson",
});

const derived = (calculatorId: string): FieldControlSourceBinding => ({ kind: "derived_calculator", calculatorId });

/**
 * IDC keys that look related to registered facts.
 * Equivalence is not certified, so they are not aliases and not separate canonical facts.
 */
export const IDC_KEYS_REQUIRING_EQUIVALENCE_DECISION = [
  "mobile",
  "displayName",
  "city",
  "employmentTypeCode",
  "requestedAmountLabel",
  "transactionType",
  "outstandingLoanAmountLabel",
  "approxCibilScore",
] as const;

export const UNREGISTERED_OWNERSHIP_DECISIONS = [
  "EcmContact.employmentType and EnterpriseOpportunity.employmentTypeCode are both present. Equivalence is not certified.",
  "EcmContact.city and EnterpriseOpportunity.cityLabel are both present. Equivalence is not certified.",
  "IDC capture keys are not registered. See IDC_KEYS_REQUIRING_EQUIVALENCE_DECISION.",
  "Product Programme constraint keys remain in Product Programme. They are not customer-field identities.",
  "EnterpriseDeal.requestedAmount is not registered as the Opportunity requested amount.",
] as const;

const CERTIFIED_CONTACT_AND_OPPORTUNITY: readonly FieldControlDefinition[] = [
  row({
    fieldId: "contact.dateOfBirth",
    friendlyLabel: "Date of birth",
    description: "Contact date of birth stored on the Enterprise Contact Registry.",
    helpText: "The contact record is the column that currently holds this date.",
    fieldType: "date",
    classification: "raw_canonical",
    owningDomain: "contact",
    ownershipReview: "certified_binding",
    sourceBinding: column("EcmContact", "dateOfBirth"),
    authorisedConsumers: ["contact_registry"],
    validationSummary: "Calendar date on EcmContact.dateOfBirth when captured. FCM does not capture it.",
    presentationSummary: "Date. No currency unit.",
  }),
  row({
    fieldId: "contact.name",
    friendlyLabel: "Contact name",
    description: "Primary name on the Enterprise Contact Registry.",
    helpText: "Identity text already stored on the contact.",
    fieldType: "text",
    classification: "raw_canonical",
    owningDomain: "contact",
    ownershipReview: "certified_binding",
    sourceBinding: column("EcmContact", "name"),
    authorisedConsumers: ["contact_registry"],
    validationSummary: "Required contact identity text in the contact registry. FCM does not capture it.",
    presentationSummary: "Single-line text.",
  }),
  row({
    fieldId: "contact.mobilePrimary",
    friendlyLabel: "Primary mobile",
    description: "Primary mobile number on the Enterprise Contact Registry.",
    helpText: "Identity mobile already stored on the contact.",
    fieldType: "text",
    classification: "raw_canonical",
    owningDomain: "contact",
    ownershipReview: "certified_binding",
    sourceBinding: column("EcmContact", "mobilePrimary"),
    authorisedConsumers: ["contact_registry"],
    validationSummary: "Mobile text on EcmContact.mobilePrimary. FCM does not capture it.",
    presentationSummary: "Single-line text.",
  }),
  row({
    fieldId: "opportunity.requestedAmount",
    friendlyLabel: "Requested amount",
    description: "Opportunity requested amount in normalized INR.",
    helpText: "Opportunity Registry holds the number. Currency units are presentation only.",
    fieldType: "currency",
    classification: "raw_canonical",
    owningDomain: "opportunity",
    ownershipReview: "certified_binding",
    sourceBinding: column("EnterpriseOpportunity", "requestedAmount"),
    authorisedConsumers: ["opportunity_registry"],
    validationSummary: "Decimal INR on EnterpriseOpportunity.requestedAmount. FCM does not capture it.",
    presentationSummary: "Amount plus unit. Allowed units: Lakh, Crore. Calculations read normalized INR.",
    currencyUnits: ["lakh", "crore"],
  }),
  row({
    fieldId: "opportunity.productCode",
    friendlyLabel: "Product code",
    description: "Product code stored on the Opportunity.",
    helpText: "The opportunity column is the current source. Option keys are not copied into FCM.",
    fieldType: "text",
    classification: "raw_canonical",
    owningDomain: "opportunity",
    ownershipReview: "certified_binding",
    sourceBinding: column("EnterpriseOpportunity", "productCode"),
    authorisedConsumers: ["opportunity_registry"],
    validationSummary: "Product code text on the opportunity. FCM does not own the product master.",
    presentationSummary: "Single-line code.",
  }),
  row({
    fieldId: "opportunity.employmentTypeCode",
    friendlyLabel: "Employment type code",
    description: "Employment type code stored on the Opportunity.",
    helpText: "Mapped from EnterpriseOpportunity.employmentTypeCode. Contact employment type is a separate undecided equivalence.",
    fieldType: "text",
    classification: "raw_canonical",
    owningDomain: "opportunity",
    ownershipReview: "certified_binding",
    sourceBinding: column("EnterpriseOpportunity", "employmentTypeCode"),
    authorisedConsumers: ["opportunity_registry"],
    validationSummary: "Code text on the opportunity. FCM does not capture it.",
    presentationSummary: "Single-line code.",
  }),
  row({
    fieldId: "opportunity.cityLabel",
    friendlyLabel: "Opportunity city",
    description: "City label stored on the Opportunity.",
    helpText: "Column source only. Contact city and IDC city are not treated as the same fact.",
    fieldType: "text",
    classification: "raw_canonical",
    owningDomain: "opportunity",
    ownershipReview: "certified_binding",
    sourceBinding: column("EnterpriseOpportunity", "cityLabel"),
    authorisedConsumers: ["opportunity_registry"],
    validationSummary: "Text on EnterpriseOpportunity.cityLabel. FCM does not capture it.",
    presentationSummary: "Single-line text.",
  }),
  row({
    fieldId: "opportunity.stateLabel",
    friendlyLabel: "Opportunity state",
    description: "State label stored on the Opportunity.",
    helpText: "Column source only.",
    fieldType: "text",
    classification: "raw_canonical",
    owningDomain: "opportunity",
    ownershipReview: "certified_binding",
    sourceBinding: column("EnterpriseOpportunity", "stateLabel"),
    authorisedConsumers: ["opportunity_registry"],
    validationSummary: "Text on EnterpriseOpportunity.stateLabel. FCM does not capture it.",
    presentationSummary: "Single-line text.",
  }),
];

const DERIVED_FACTS: readonly FieldControlDefinition[] = [
  row({
    fieldId: "derived:foirPercent",
    friendlyLabel: "FOIR",
    description: "Calculated salaried FOIR. Not a customer-entered answer.",
    helpText: "Owned by the existing FOIR calculator.",
    fieldType: "percentage",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBinding: derived("derived:foirPercent"),
    aliases: ["foirFit"],
    productApplicability: HL,
    authorisedConsumers: ["derived_calculator"],
    validationSummary: "Calculator output. FCM does not store the percentage.",
    presentationSummary: "Percentage. Match % weight stays in the Match % policy.",
  }),
  row({
    fieldId: "derived:ltvPercent",
    friendlyLabel: "LTV",
    description: "Calculated LTV. Not a customer-entered answer.",
    helpText: "Owned by the existing LTV calculator.",
    fieldType: "percentage",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBinding: derived("derived:ltvPercent"),
    aliases: ["ltvFit"],
    productApplicability: HL,
    authorisedConsumers: ["derived_calculator"],
    validationSummary: "Calculator output. FCM does not store the percentage.",
    presentationSummary: "Percentage. Match % weight stays in the Match % policy.",
  }),
  row({
    fieldId: "derived:proposedEmiRupees",
    friendlyLabel: "Proposed EMI",
    description: "Calculated proposed EMI in INR.",
    helpText: "Owned by the existing tenure and EMI calculator.",
    fieldType: "currency",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBinding: derived("derived:proposedEmiRupees"),
    productApplicability: HL,
    authorisedConsumers: ["derived_calculator"],
    currencyUnits: ["rupees"],
    validationSummary: "Calculator output in INR. FCM does not store it.",
    presentationSummary: "Currency. Allowed unit: Rupees. Calculations read normalized INR.",
  }),
  row({
    fieldId: "derived:ageYears",
    friendlyLabel: "Current age",
    description: "Age calculated from date of birth. The date of birth remains a separate fact.",
    helpText: "Owned by the existing age calculator. Not an alias of contact.dateOfBirth.",
    fieldType: "number",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBinding: derived("derived:ageYears"),
    productApplicability: HL,
    authorisedConsumers: ["derived_calculator"],
    validationSummary: "Whole-number calculator output. FCM does not store it.",
    presentationSummary: "Number of years.",
  }),
  row({
    fieldId: "derived:ageAtMaturityYears",
    friendlyLabel: "Age at maturity",
    description: "Age at maturity calculated from date of birth and tenure. Not a stored answer.",
    helpText: "Owned by the existing tenure calculator.",
    fieldType: "number",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBinding: derived("derived:ageAtMaturityYears"),
    productApplicability: HL,
    authorisedConsumers: ["derived_calculator"],
    validationSummary: "Whole-number calculator output. FCM does not store it.",
    presentationSummary: "Number of years.",
  }),
  row({
    fieldId: "derived:effectiveTenureMonths",
    friendlyLabel: "Effective available tenure",
    description: "Effective available tenure in months. Not the programme maximum tenure constraint.",
    helpText: "Owned by the existing tenure calculator.",
    fieldType: "number",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBinding: derived("derived:effectiveTenureMonths"),
    aliases: ["tenureAvailability"],
    productApplicability: HL,
    authorisedConsumers: ["derived_calculator"],
    validationSummary: "Whole-number calculator output. FCM does not store it.",
    presentationSummary: "Number of months. Match % weight stays in the Match % policy.",
  }),
  row({
    fieldId: "derived:assessedOfferRupees",
    friendlyLabel: "Eligible / tentative loan amount",
    description: "Programme-specific assessed offer in INR. Not a universal borrower amount.",
    helpText: "Owned by the existing tentative-offer calculator.",
    fieldType: "currency",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBinding: derived("derived:assessedOfferRupees"),
    aliases: ["eligibleAmount", "fundingFit"],
    productApplicability: HL,
    authorisedConsumers: ["derived_calculator"],
    currencyUnits: ["lakh", "crore"],
    validationSummary: "Calculator output in INR. FCM does not store it.",
    presentationSummary: "Currency. Allowed units: Lakh, Crore. Calculations read normalized INR.",
  }),
  row({
    fieldId: "derived:btSavingsRupees",
    friendlyLabel: "Balance transfer savings",
    description: "Indicative balance-transfer savings in INR.",
    helpText: "Owned by the existing balance-transfer calculator.",
    fieldType: "currency",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBinding: derived("derived:btSavingsRupees"),
    aliases: ["balanceTransferBenefit"],
    productApplicability: ["HOME_LOAN_BT"],
    authorisedConsumers: ["derived_calculator"],
    currencyUnits: ["lakh", "crore"],
    validationSummary: "Calculator output in INR. FCM does not store it.",
    presentationSummary: "Currency. Allowed units: Lakh, Crore. Calculations read normalized INR.",
  }),
  row({
    fieldId: "derived:applicableRoiPercent",
    friendlyLabel: "Applicable ROI",
    description: "Applicable ROI calculated by the Home Loan recommendation engine.",
    helpText: "Owned by the existing recommendation engine. Not a customer-entered rate.",
    fieldType: "percentage",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBinding: derived("derived:applicableRoiPercent"),
    aliases: ["roiCompetitiveness"],
    productApplicability: HL,
    authorisedConsumers: ["derived_calculator"],
    validationSummary: "Calculator output. FCM does not store the percentage.",
    presentationSummary: "Percentage. Match % weight stays in the Match % policy.",
  }),
];

const REVIEW_REFERENCES: readonly FieldControlDefinition[] = [
  row({
    fieldId: "assessment:borrower.dateOfBirth",
    friendlyLabel: "Assessment date of birth",
    description: "Assessment leaf that can be prefilled from contact date of birth when missing. It can also hold its own captured value.",
    helpText: "Not collapsed into contact.dateOfBirth. Owner is undecided.",
    fieldType: "date",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("borrower.dateOfBirth"),
    candidateMirrorOf: "contact.dateOfBirth",
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today. FCM does not move it.",
    presentationSummary: "Date. Ownership review required before it is treated as the contact date of birth.",
  }),
  row({
    fieldId: "assessment:loanRequirement.requestedAmount",
    friendlyLabel: "Assessment requested amount",
    description: "Assessment leaf that can be prefilled from the opportunity requested amount when missing.",
    helpText: "Not collapsed into opportunity.requestedAmount. Owner is undecided.",
    fieldType: "currency",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("loanRequirement.requestedAmount"),
    candidateMirrorOf: "opportunity.requestedAmount",
    currencyUnits: ["lakh", "crore"],
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today. FCM does not move it.",
    presentationSummary: "Amount plus unit if later shown. Canonical comparison value is normalized INR.",
  }),
  row({
    fieldId: "assessment:loanRequirement.productCode",
    friendlyLabel: "Assessment product code",
    description: "Assessment leaf that can be prefilled from the opportunity product code when missing.",
    helpText: "Not collapsed into opportunity.productCode. Owner is undecided.",
    fieldType: "text",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("loanRequirement.productCode"),
    candidateMirrorOf: "opportunity.productCode",
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today. FCM does not move it.",
    presentationSummary: "Code text.",
  }),
  row({
    fieldId: "assessment:borrower.employmentTypeCode",
    friendlyLabel: "Assessment employment type code",
    description: "Assessment leaf that can be prefilled from the opportunity employment type code when missing.",
    helpText: "Not collapsed into opportunity.employmentTypeCode. Owner is undecided.",
    fieldType: "text",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("borrower.employmentTypeCode"),
    candidateMirrorOf: "opportunity.employmentTypeCode",
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today. FCM does not move it.",
    presentationSummary: "Code text.",
  }),
  row({
    fieldId: "assessment:borrower.employmentFamily",
    friendlyLabel: "Assessment employment family",
    description: "Assessment leaf. Missing-only reuse can derive a family from the opportunity employment type code, and the leaf can also be captured.",
    helpText: "No separate opportunity column was certified as this fact. Owner is undecided.",
    fieldType: "text",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("borrower.employmentFamily"),
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today. FCM does not move it.",
    presentationSummary: "Text. Not registered as a derived calculator output.",
  }),
  row({
    fieldId: "assessment:borrower.journeyCity",
    friendlyLabel: "Assessment journey city",
    description: "Assessment leaf that can be prefilled from the opportunity city label when missing.",
    helpText: "Candidate only. The names differ, and a later capture can diverge.",
    fieldType: "text",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("borrower.journeyCity"),
    candidateMirrorOf: "opportunity.cityLabel",
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today. FCM does not move it.",
    presentationSummary: "Single-line text.",
  }),
  row({
    fieldId: "assessment:borrower.journeyState",
    friendlyLabel: "Assessment journey state",
    description: "Assessment leaf that can be prefilled from the opportunity state label when missing.",
    helpText: "Candidate only. A later capture can diverge.",
    fieldType: "text",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("borrower.journeyState"),
    candidateMirrorOf: "opportunity.stateLabel",
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today. FCM does not move it.",
    presentationSummary: "Single-line text.",
  }),
  row({
    fieldId: "assessment:balanceTransfer.outstandingPrincipal",
    friendlyLabel: "Assessment outstanding principal",
    description: "Assessment balance-transfer leaf. Reuse reads an input named btAmount, which is not an EnterpriseOpportunity column.",
    helpText: "No certified column binding. Owner is undecided.",
    fieldType: "currency",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("balanceTransfer.outstandingPrincipal"),
    currencyUnits: ["lakh", "crore"],
    productApplicability: ["HOME_LOAN_BT"],
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today. FCM does not invent a column for it.",
    presentationSummary: "Amount plus unit if later shown. Canonical comparison value is normalized INR.",
  }),
  row({
    fieldId: "assessment:cibil.kind",
    friendlyLabel: "Assessment CIBIL kind",
    description: "Assessment CIBIL kind. Reuse can prefill it from an opportunity input that is not a certified schema column.",
    helpText: "Owner is undecided. Not aliased to a contact or opportunity column.",
    fieldType: "text",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("cibil.kind"),
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today.",
    presentationSummary: "Text.",
  }),
  row({
    fieldId: "assessment:cibil.expectedBand",
    friendlyLabel: "Assessment expected CIBIL band",
    description: "Assessment expected CIBIL band. Distinct from an exact score.",
    helpText: "Owner is undecided.",
    fieldType: "text",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("cibil.expectedBand"),
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today.",
    presentationSummary: "Text band. Option keys are not copied into FCM.",
  }),
  row({
    fieldId: "assessment:cibil.exactScore",
    friendlyLabel: "Assessment exact CIBIL score",
    description: "Assessment exact CIBIL score. Not the same leaf as the expected band.",
    helpText: "Owner is undecided.",
    fieldType: "number",
    classification: "reference_mirror",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: assessment("cibil.exactScore"),
    authorisedConsumers: ["assessment_workspace"],
    validationSummary: "Lives in the assessment facts document today.",
    presentationSummary: "Number.",
  }),
];

const UNRESOLVED_ALIASES: readonly FieldControlDefinition[] = [
  ["legacy:lenderScore", "Lender score", "lenderScore"],
  ["legacy:policyEligibilityFit", "Policy eligibility fit", "policyEligibilityFit"],
  ["legacy:approvalReliability", "Approval reliability", "approvalReliability"],
  ["legacy:turnaroundTime", "Turnaround time", "turnaroundTime"],
  ["legacy:feesAndTotalCost", "Fees and total cost", "feesAndTotalCost"],
  ["legacy:tenureEmiFlexibility", "Tenure / EMI flexibility", "tenureEmiFlexibility"],
  ["legacy:eligibilityGapProximity", "Eligibility gap proximity", "eligibilityGapProximity"],
  ["legacy:topUpSuitability", "Top-up suitability", "topUpSuitability"],
].map(([fieldId, friendlyLabel, alias]) =>
  row({
    fieldId,
    friendlyLabel,
    description: "Legacy recommendation alias preserved separately. It is not a certified customer fact.",
    helpText: "Equivalence to a canonical field is not certified.",
    fieldType: "text",
    classification: "alias",
    owningDomain: "unassigned",
    ownershipReview: "owner_requires_product_decision",
    sourceBinding: { kind: "unresolved", legacyProjectionId: fieldId },
    aliases: [alias],
    validationSummary: "Compatibility alias only. No value is stored by FCM.",
    presentationSummary: "Unresolved alias. Not authorised for capture.",
  }),
);

const FIELD_CONTROL_DEFINITIONS: readonly FieldControlDefinition[] = [
  ...CERTIFIED_CONTACT_AND_OPPORTUNITY,
  ...DERIVED_FACTS,
  ...REVIEW_REFERENCES,
  ...UNRESOLVED_ALIASES,
];

export function validateFieldControlRegistry(
  definitions: readonly FieldControlDefinition[] = FIELD_CONTROL_DEFINITIONS,
): void {
  const ids = new Set<string>();
  const aliases = new Map<string, string>();
  for (const definition of definitions) {
    if (ids.has(definition.fieldId)) {
      throw new Error(`FIELD_CONTROL_MASTER: duplicate field identity ${definition.fieldId}.`);
    }
    ids.add(definition.fieldId);
    if (definition.fieldId.startsWith("ppo:")) {
      throw new Error("FIELD_CONTROL_MASTER: programme constraints are not customer fields.");
    }
    if ("required" in definition || "weight" in definition || "matchWeight" in definition) {
      throw new Error("FIELD_CONTROL_MASTER: requirement and Match % weight are not field properties.");
    }
    if (definition.controlsRuntime || definition.customerFacingActivation) {
      throw new Error("FIELD_CONTROL_MASTER: Foundation V1 cannot control runtime or customer-facing activation.");
    }
    if (definition.fieldType === "currency" && definition.currencyUnits.length === 0) {
      throw new Error(`FIELD_CONTROL_MASTER: ${definition.fieldId} needs allowed currency units.`);
    }
    if (definition.fieldType !== "currency" && definition.currencyUnits.length > 0) {
      throw new Error(`FIELD_CONTROL_MASTER: ${definition.fieldId} is not a currency field.`);
    }
    if (definition.classification === "raw_canonical" && definition.owningDomain === "unassigned") {
      throw new Error(`FIELD_CONTROL_MASTER: ${definition.fieldId} has no certified owner.`);
    }
    if (definition.classification === "derived" && definition.owningDomain !== "derived_engine") {
      throw new Error(`FIELD_CONTROL_MASTER: ${definition.fieldId} derived owner must be the calculator.`);
    }
    if (definition.candidateMirrorOf === definition.fieldId) {
      throw new Error(`FIELD_CONTROL_MASTER: ${definition.fieldId} cannot mirror itself.`);
    }
    for (const alias of definition.aliases) {
      if (ids.has(alias) || aliases.has(alias) || alias === definition.fieldId) {
        throw new Error(`FIELD_CONTROL_MASTER: alias ${alias} collides with another identity.`);
      }
      aliases.set(alias, definition.fieldId);
    }
  }
  for (const definition of definitions) {
    if (definition.candidateMirrorOf && !ids.has(definition.candidateMirrorOf)) {
      throw new Error(
        `FIELD_CONTROL_MASTER: ${definition.fieldId} candidate ${definition.candidateMirrorOf} is not registered.`,
      );
    }
    for (const alias of definition.aliases) {
      if (ids.has(alias)) {
        throw new Error(`FIELD_CONTROL_MASTER: alias ${alias} is also a field identity.`);
      }
    }
  }
}

let validated = false;

export function listFieldControlDefinitions(): readonly FieldControlDefinition[] {
  if (!validated) {
    validateFieldControlRegistry();
    validated = true;
  }
  return FIELD_CONTROL_DEFINITIONS;
}

export function resolveFieldControlDefinition(key: string): FieldControlDefinition | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  const definitions = listFieldControlDefinitions();
  return (
    definitions.find((definition) => definition.fieldId === trimmed) ??
    definitions.find((definition) => definition.aliases.includes(trimmed)) ??
    null
  );
}

export function listOwnershipReviewDefinitions(): readonly FieldControlDefinition[] {
  return listFieldControlDefinitions().filter(
    (definition) => definition.ownershipReview === "owner_requires_product_decision",
  );
}

export function sourceBindingLabel(binding: FieldControlSourceBinding): string {
  switch (binding.kind) {
    case "column":
      return `${binding.model}.${binding.field}`;
    case "assessment_fact":
      return `assessment:${binding.path}`;
    case "derived_calculator":
      return binding.calculatorId;
    case "unresolved":
      return binding.legacyProjectionId;
    default: {
      const unreachable: never = binding;
      return unreachable;
    }
  }
}
