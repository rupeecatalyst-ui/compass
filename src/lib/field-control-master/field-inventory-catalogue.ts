/**
 * Reviewed Field Inventory catalogue.
 * Identities come from the existing discovery walker plus the inspection-registry
 * identities that walker does not emit, plus the ten V1.5 raw sources outside that set.
 * Governance status is an explicit reviewed map. Inspection-registry certified_binding
 * is not production certification. This module does not read or write the database.
 * It is not every physical column.
 */
import { DRAFT_SOURCE_ALLOWLIST } from "./draft-source-allowlist";
import { listFieldControlDefinitions, sourceBindingLabel } from "./registry";
import {
  discoverCanonicalRecommendationFields,
} from "@/lib/product-recommendation/discover-canonical-fields";
import type { ProjectedRecommendationField } from "@/lib/product-recommendation/types";
import type { FieldControlDefinition } from "@/types/field-control-master";
import {
  PROGRAMME_EXCLUSION_REASON,
  type FieldInventoryClassification,
  type FieldInventoryEligibility,
  type FieldInventoryFcmStatus,
  type FieldInventoryOwnershipStatus,
  type FieldInventorySourceClass,
} from "./field-inventory-presentation";

export type FieldInventoryGroup =
  | "assessment"
  | "idc"
  | "ppo"
  | "derived"
  | "certified_column"
  | "legacy_alias"
  | "outside_raw";

export type FieldInventoryDerivedInfo = {
  calculatorId: string | null;
  module: string;
  note: string;
};

export type FieldInventoryEntry = {
  identity: string;
  businessLabel: string;
  domain: string;
  sourceClass: FieldInventorySourceClass;
  source: string;
  dataType: string;
  group: FieldInventoryGroup;
  boundary: "historical_155" | "outside_v1_5_raw";
  classification: FieldInventoryClassification;
  fcmStatus: FieldInventoryFcmStatus;
  ownershipStatus: FieldInventoryOwnershipStatus;
  registrationEligibility: FieldInventoryEligibility;
  ambiguity: string;
  knownUsage: string;
  fcmFieldId: string | null;
  programmeExclusionReason: string | null;
  derivedCalculator: FieldInventoryDerivedInfo | null;
};

const PRODUCTION_CERTIFIED_FIELD_IDS = [
  "contact.dateOfBirth",
  "contact.name",
  "contact.mobilePrimary",
  "opportunity.requestedAmount",
  "opportunity.productCode",
  "opportunity.employmentTypeCode",
  "opportunity.cityLabel",
  "opportunity.stateLabel",
  "derived:proposedEmiRupees",
  "derived:effectiveTenureMonths",
  "derived:assessedOfferRupees",
  "derived:btSavingsRupees",
] as const;

const AVAILABLE_FOR_REGISTRATION_IDS = [
  "contact.aadhaar",
  "contact.personalEmail",
  "contact.officialEmail",
  "contact.mobileSecondary",
  "contact.address",
  "opportunity.transactionType",
  "company.companyName",
  "company.pan",
  "company.gst",
  "derived:foirPercent",
] as const;

const OUTSIDE_RAW_LABELS: Record<string, string> = {
  "contact.pan": "Contact PAN",
  "contact.aadhaar": "Aadhaar",
  "contact.personalEmail": "Personal email",
  "contact.officialEmail": "Official email",
  "contact.mobileSecondary": "Secondary mobile",
  "contact.address": "Contact address",
  "opportunity.transactionType": "Opportunity transaction type",
  "company.companyName": "Company name",
  "company.pan": "Company PAN",
  "company.gst": "Company GST",
};

const DERIVED_CALCULATORS: Record<string, FieldInventoryDerivedInfo> = {
  "derived:foirPercent": {
    calculatorId: "calculateSalariedFoir",
    module: "src/lib/home-loan-recommendation/foir.ts",
    note: "Approved V1.5 allowlist calculator. Not a production Field Control row and not certified.",
  },
  "derived:ltvPercent": {
    calculatorId: null,
    module: "src/lib/home-loan-recommendation/rbi-ltv.ts",
    note: "calculateRegulatoryMaxLoanAmount and applyStricterLenderLtvCap both emit LTV. Not a single binding. Not certified.",
  },
  "derived:proposedEmiRupees": {
    calculatorId: "calculateReducingBalanceEmi",
    module: "src/lib/home-loan-recommendation/tenure.ts",
    note: "Production certified derived binding. Not a database column.",
  },
  "derived:ageYears": {
    calculatorId: null,
    module: "src/lib/home-loan-recommendation/tenure.ts",
    note: "ageInMonthsFromDateOfBirth returns months. There is no calculateAgeYears export. Not certified.",
  },
  "derived:ageAtMaturityYears": {
    calculatorId: null,
    module: "src/lib/home-loan-recommendation/tenure.ts",
    note: "Emitted inside calculateEffectiveTenureMonths, which is already bound to another field. Not certified.",
  },
  "derived:effectiveTenureMonths": {
    calculatorId: "calculateEffectiveTenureMonths",
    module: "src/lib/home-loan-recommendation/tenure.ts",
    note: "Production certified derived binding. Not a database column.",
  },
  "derived:assessedOfferRupees": {
    calculatorId: "calculateTentativeOffer",
    module: "src/lib/home-loan-recommendation/tentative-offer.ts",
    note: "Production certified derived binding. Display label remains the tentative offer. Not a database column.",
  },
  "derived:btSavingsRupees": {
    calculatorId: "calculateIndicativeBtSaving",
    module: "src/lib/home-loan-recommendation/bt-journey.ts",
    note: "Production certified derived binding for Home Loan Balance Transfer. Not a database column.",
  },
  "derived:applicableRoiPercent": {
    calculatorId: null,
    module: "src/lib/home-loan-recommendation/governed-derived-facts.ts",
    note: "Engine output roi.percent. Not a standalone exported calculator. Not certified.",
  },
};

const AMBIGUITY_NOTES: Record<string, string> = {
  "opportunity.employmentTypeCode":
    "Distinct from EcmContact.employmentType and from idc:employmentTypeCode. Similar labels are not equivalence.",
  "idc:employmentTypeCode":
    "Distinct from EcmContact.employmentType and from EnterpriseOpportunity.employmentTypeCode.",
  "opportunity.cityLabel": "Distinct from EcmContact.city and from idc:city. Similar labels are not equivalence.",
  "idc:city": "Distinct from EcmContact.city and from EnterpriseOpportunity.cityLabel.",
  "opportunity.stateLabel": "Distinct from EcmContact.state. Similar labels are not equivalence.",
  "opportunity.requestedAmount":
    "Distinct from EnterpriseDeal.requestedAmount and from idc:requestedAmountLabel. Similar labels are not equivalence.",
  "idc:requestedAmountLabel":
    "Distinct from EnterpriseOpportunity.requestedAmount and from EnterpriseDeal.requestedAmount.",
  "contact.pan": "Distinct from company.pan. Registered draft only. Not certified.",
  "company.pan": "Distinct from contact.pan. Similar labels are not equivalence.",
  "idc:companyName": "Distinct from company.companyName.",
  "company.companyName": "Distinct from idc:companyName.",
  "idc:transactionType": "Distinct from opportunity.transactionType.",
  "opportunity.transactionType": "Distinct from idc:transactionType.",
  "idc:gstin": "Distinct from company.gst.",
  "company.gst": "Distinct from idc:gstin.",
  "idc:mobile": "IDC key. Equivalence to contact.mobilePrimary is not certified.",
  "idc:displayName": "IDC key. Equivalence to contact.name is not certified.",
  "idc:outstandingLoanAmountLabel": "IDC key. Equivalence to an assessment or deal amount is not certified.",
  "idc:approxCibilScore": "IDC key. Equivalence to an assessment CIBIL leaf is not certified.",
  "assessment:borrower.dateOfBirth":
    "Assessment copy. Distinct from the current EcmContact.dateOfBirth value.",
  "assessment:loanRequirement.requestedAmount":
    "Assessment copy. Distinct from the current EnterpriseOpportunity.requestedAmount value.",
  "assessment:loanRequirement.productCode":
    "Assessment copy. Distinct from the current EnterpriseOpportunity.productCode value.",
  "assessment:borrower.employmentTypeCode":
    "Assessment copy. Distinct from EnterpriseOpportunity.employmentTypeCode and from EcmContact.employmentType.",
  "assessment:borrower.journeyCity":
    "Assessment copy. Distinct from EnterpriseOpportunity.cityLabel and from EcmContact.city.",
  "assessment:borrower.journeyState":
    "Assessment copy. Distinct from EnterpriseOpportunity.stateLabel and from EcmContact.state.",
};

const EXPECTED_GROUPS: Record<FieldInventoryGroup, number> = {
  assessment: 63,
  idc: 29,
  ppo: 38,
  derived: 9,
  certified_column: 8,
  legacy_alias: 8,
  outside_raw: 10,
};

const certified = new Set<string>(PRODUCTION_CERTIFIED_FIELD_IDS);
const available = new Set<string>(AVAILABLE_FOR_REGISTRATION_IDS);

function dataTypeFromDiscovery(valueType: ProjectedRecommendationField["valueType"]): string {
  switch (valueType) {
    case "percent":
      return "Percentage";
    case "currency":
      return "Currency";
    case "integer":
      return "Integer";
    case "number":
      return "Number";
    case "date":
      return "Date";
    case "boolean":
      return "Boolean";
    default:
      return "Text";
  }
}

function dataTypeFromRegistry(fieldType: FieldControlDefinition["fieldType"]): string {
  switch (fieldType) {
    case "percentage":
      return "Percentage";
    case "currency":
      return "Currency";
    case "number":
      return "Number";
    case "date":
      return "Date";
    case "long_text":
      return "Long text";
    case "yes_no":
      return "Yes / no";
    case "single_select":
    case "multi_select":
      return "Selection";
    case "text":
      return "Text";
    default: {
      const unreachable: never = fieldType;
      return unreachable;
    }
  }
}

function domainLabel(owningDomain: string): string {
  switch (owningDomain) {
    case "contact":
      return "Contact";
    case "opportunity":
      return "Opportunity";
    case "company":
      return "Company";
    case "derived_engine":
      return "Derived calculator";
    default:
      return "Unassigned";
  }
}

function ambiguityFor(identity: string, registry: FieldControlDefinition | undefined): string {
  const explicit = AMBIGUITY_NOTES[identity];
  if (explicit) return explicit;
  if (registry?.candidateMirrorOf) {
    return `Candidate mirror of ${registry.candidateMirrorOf}. Not equivalent to that identity.`;
  }
  if (registry?.classification === "alias") {
    return "Unresolved legacy alias. Equivalence to a canonical field is not certified.";
  }
  return "None recorded";
}

function applyGovernance(
  partial: Omit<
    FieldInventoryEntry,
    "fcmStatus" | "ownershipStatus" | "registrationEligibility" | "fcmFieldId" | "programmeExclusionReason"
  >,
): FieldInventoryEntry {
  const identity = partial.identity;
  let fcmStatus: FieldInventoryFcmStatus = "Not registered";
  let ownershipStatus: FieldInventoryOwnershipStatus = "Requires ownership review";
  let registrationEligibility: FieldInventoryEligibility = "Requires ownership review";
  let fcmFieldId: string | null = null;
  let programmeExclusionReason: string | null = null;

  if (certified.has(identity)) {
    fcmStatus = "Registered in FCM";
    ownershipStatus = "Production certified binding";
    registrationEligibility = "Registered";
    fcmFieldId = identity;
  } else if (identity === "contact.pan") {
    fcmStatus = "Registered in FCM";
    ownershipStatus = "Owner requires product decision";
    registrationEligibility = "Registered";
    fcmFieldId = identity;
  } else if (partial.classification === "Policy / programme constraint") {
    ownershipStatus = "Not applicable";
    registrationEligibility = "Excluded";
    programmeExclusionReason = PROGRAMME_EXCLUSION_REASON;
  } else if (available.has(identity)) {
    registrationEligibility = "Available for registration";
  }

  return {
    ...partial,
    fcmStatus,
    ownershipStatus,
    registrationEligibility,
    fcmFieldId,
    programmeExclusionReason,
  };
}

function fromDiscovery(
  row: ProjectedRecommendationField,
  registry: FieldControlDefinition | undefined,
): FieldInventoryEntry {
  if (row.id.startsWith("ppo:")) {
    const key = row.id.slice("ppo:".length);
    return applyGovernance({
      identity: row.id,
      businessLabel: row.label,
      domain: "Product Programme",
      sourceClass: "Policy / programme constraint",
      source: `product-programme:${key}`,
      dataType: dataTypeFromDiscovery(row.valueType),
      group: "ppo",
      boundary: "historical_155",
      classification: "Policy / programme constraint",
      ambiguity: "None recorded",
      knownUsage: "Lender-policy constraint key. Not a customer capture field.",
      derivedCalculator: null,
    });
  }
  if (row.id.startsWith("derived:")) {
    const calculator = DERIVED_CALCULATORS[row.id] ?? null;
    return applyGovernance({
      identity: row.id,
      businessLabel: registry?.friendlyLabel ?? row.label,
      domain: "Derived calculator",
      sourceClass: "Derived calculator",
      source: calculator?.calculatorId
        ? `${calculator.module}#${calculator.calculatorId}`
        : `${calculator?.module ?? "derived-calculator"}#unbound`,
      dataType: dataTypeFromDiscovery(row.valueType),
      group: "derived",
      boundary: "historical_155",
      classification: "Derived",
      ambiguity: ambiguityFor(row.id, registry),
      knownUsage: calculator?.note ?? "Derived calculator output. Not a database column.",
      derivedCalculator: calculator,
    });
  }
  if (row.id.startsWith("idc:")) {
    const key = row.id.slice("idc:".length);
    return applyGovernance({
      identity: row.id,
      businessLabel: row.label,
      domain: "Initial data collection",
      sourceClass: "Logical / application",
      source: `enterprise-initial-data-collection:${key}`,
      dataType: dataTypeFromDiscovery(row.valueType),
      group: "idc",
      boundary: "historical_155",
      classification: "Initial data collection",
      ambiguity: ambiguityFor(row.id, registry),
      knownUsage: "Initial data collection key. Physical existence elsewhere is not canonical ownership.",
      derivedCalculator: null,
    });
  }
  const path = row.id.startsWith("assessment:") ? row.id.slice("assessment:".length) : row.id;
  return applyGovernance({
    identity: row.id,
    businessLabel: registry?.friendlyLabel ?? row.label,
    domain: "Assessment",
    sourceClass: "Logical / application",
    source: `EnterpriseOpportunityAssessment.draftFactsJson:${path}`,
    dataType: registry ? dataTypeFromRegistry(registry.fieldType) : dataTypeFromDiscovery(row.valueType),
    group: "assessment",
    boundary: "historical_155",
    classification: "Assessment fact",
    ambiguity: ambiguityFor(row.id, registry),
    knownUsage: "Assessment fact leaf. An assessment copy is not the current Contact or Opportunity column.",
    derivedCalculator: null,
  });
}

function fromRegistryExtra(definition: FieldControlDefinition): FieldInventoryEntry {
  if (definition.classification === "alias") {
    return applyGovernance({
      identity: definition.fieldId,
      businessLabel: definition.friendlyLabel,
      domain: "Legacy recommendation",
      sourceClass: "Logical / application",
      source: sourceBindingLabel(definition.sourceBinding),
      dataType: dataTypeFromRegistry(definition.fieldType),
      group: "legacy_alias",
      boundary: "historical_155",
      classification: "Legacy alias",
      ambiguity: ambiguityFor(definition.fieldId, definition),
      knownUsage: "Unresolved legacy alias. Not a certified customer fact and not a calculator output.",
      derivedCalculator: null,
    });
  }
  if (definition.sourceBinding.kind !== "column") {
    throw new Error(`FIELD_INVENTORY: unexpected registry identity outside discovery: ${definition.fieldId}`);
  }
  return applyGovernance({
    identity: definition.fieldId,
    businessLabel: definition.friendlyLabel,
    domain: domainLabel(definition.owningDomain),
    sourceClass: "Physical / database",
    source: sourceBindingLabel(definition.sourceBinding),
    dataType: dataTypeFromRegistry(definition.fieldType),
    group: "certified_column",
    boundary: "historical_155",
    classification: "Physical column",
    ambiguity: ambiguityFor(definition.fieldId, definition),
    knownUsage: `Exact column binding ${sourceBindingLabel(definition.sourceBinding)}. Production Field Control row. Not runtime-controlling.`,
    derivedCalculator: null,
  });
}

function outsideRawEntries(seen: Set<string>): FieldInventoryEntry[] {
  const rows: FieldInventoryEntry[] = [];
  for (const entry of DRAFT_SOURCE_ALLOWLIST) {
    if (entry.sourceBinding.kind !== "column") continue;
    if (!(entry.fieldId in OUTSIDE_RAW_LABELS)) {
      throw new Error(`FIELD_INVENTORY: allowlist column is not an expected outside source: ${entry.fieldId}`);
    }
    if (seen.has(entry.fieldId)) {
      throw new Error(`FIELD_INVENTORY: outside source duplicates an existing identity: ${entry.fieldId}`);
    }
    const source = `${entry.sourceBinding.model}.${entry.sourceBinding.field}`;
    rows.push(
      applyGovernance({
        identity: entry.fieldId,
        businessLabel: OUTSIDE_RAW_LABELS[entry.fieldId] ?? entry.fieldId,
        domain: domainLabel(entry.owningDomain),
        sourceClass: "Physical / database",
        source,
        dataType: dataTypeFromRegistry(entry.fieldType),
        group: "outside_raw",
        boundary: "outside_v1_5_raw",
        classification: "Physical column",
        ambiguity: ambiguityFor(entry.fieldId, undefined),
        knownUsage:
          entry.fieldId === "contact.pan"
            ? "Production draft bound to EcmContact.pan. Owner requires a product decision. Not certified. Not runtime-controlling."
            : "Approved V1.5 allowlist column. No Field Control row exists until an administrator saves a draft.",
        derivedCalculator: null,
      }),
    );
    seen.add(entry.fieldId);
  }
  return rows;
}

function assertReviewedBoundary(entries: readonly FieldInventoryEntry[]): void {
  const ids = new Set<string>();
  const counts: Record<FieldInventoryGroup, number> = {
    assessment: 0,
    idc: 0,
    ppo: 0,
    derived: 0,
    certified_column: 0,
    legacy_alias: 0,
    outside_raw: 0,
  };
  for (const entry of entries) {
    if (ids.has(entry.identity)) {
      throw new Error(`FIELD_INVENTORY: duplicate identity ${entry.identity}`);
    }
    ids.add(entry.identity);
    counts[entry.group] += 1;
  }
  for (const group of Object.keys(EXPECTED_GROUPS) as FieldInventoryGroup[]) {
    if (counts[group] !== EXPECTED_GROUPS[group]) {
      throw new Error(`FIELD_INVENTORY: ${group} count ${counts[group]} does not match reviewed ${EXPECTED_GROUPS[group]}`);
    }
  }
}

let cached: readonly FieldInventoryEntry[] | null = null;

export function listFieldInventoryEntries(): readonly FieldInventoryEntry[] {
  if (cached) return cached;
  const registry = listFieldControlDefinitions();
  const registryById = new Map(registry.map((definition) => [definition.fieldId, definition]));
  const entries: FieldInventoryEntry[] = [];
  const seen = new Set<string>();
  for (const row of discoverCanonicalRecommendationFields()) {
    if (seen.has(row.id)) throw new Error(`FIELD_INVENTORY: discovery duplicate ${row.id}`);
    entries.push(fromDiscovery(row, registryById.get(row.id)));
    seen.add(row.id);
  }
  for (const definition of registry) {
    if (seen.has(definition.fieldId)) continue;
    entries.push(fromRegistryExtra(definition));
    seen.add(definition.fieldId);
  }
  entries.push(...outsideRawEntries(seen));
  entries.sort((left, right) => left.identity.localeCompare(right.identity));
  assertReviewedBoundary(entries);
  cached = entries;
  return cached;
}

export function fieldInventoryGroupCounts(): Record<FieldInventoryGroup, number> {
  return { ...EXPECTED_GROUPS };
}
