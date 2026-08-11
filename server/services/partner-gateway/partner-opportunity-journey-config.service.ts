/**
 * Partner Opportunity Journey configuration — projection of Enterprise IDC.
 *
 * Catalyst One owns Initial Data Collection (SSOT).
 * Wealth Partner App renders this DTO — no companion master / section SSOT.
 */
import {
  LEAD_INFORMATION_EMPLOYMENT_OPTIONS,
  LEAD_INFORMATION_LENDING_TYPE_OPTIONS,
  LEAD_INFORMATION_PRODUCT_OPTIONS,
  LEAD_INFORMATION_TRANSACTION_OPTIONS,
} from "@/constants/lead-information-workspace";
import {
  OPPORTUNITY_PRIMARY_BORROWER_KIND,
  OPPORTUNITY_PRIMARY_BORROWER_LABELS,
} from "@/constants/opportunity-primary-borrower";
import { listEcmMasterOptions } from "@/constants/enterprise-contact-master/masters";
import {
  ENTERPRISE_IDC_VERSION,
  getEnterpriseIdcCatalog,
} from "@/constants/enterprise-initial-data-collection";
import { PROPERTY_TYPES } from "@/constants/loan-stage-master";
import { getOccupancyMaster } from "@/constants/occupancy-master";
import { PARTNER_RECOMMENDATION_PRESENTATION } from "@/constants/enterprise-partner-recommendations";
import {
  resolveProductFieldFamily,
  resolveVisibleIdcSections,
} from "@/lib/enterprise-initial-data-collection";
import type {
  PartnerJourneyFieldDef,
  PartnerJourneySectionDef,
  PartnerOpportunityJourneyConfigDto,
} from "@/types/enterprise-partner-opportunity-journey";

const DTO_SOURCE = "enterprise_opportunity_journey_config" as const;
const DTO_NOTICE =
  "Enterprise Initial Data Collection projection for Partner Opportunity Journey. Field add/remove/change in Catalyst One IDC automatically appears in Catalyst Connect.";

function optionsFromPairs(
  rows: ReadonlyArray<{ value: string; label: string } | { code: string; label: string }>,
): { value: string; label: string }[] {
  return rows.map((r) =>
    "code" in r ? { value: r.code, label: r.label } : { value: r.value, label: r.label },
  );
}

function ecmDomainOptions(domain: "constitution" | "industry"): { value: string; label: string }[] {
  return listEcmMasterOptions(domain).map((o) => ({ value: o.id, label: o.label }));
}

/** ECM Occupation master — parentId = Employment Type (cascading select). */
function ecmOccupationOptions(): { value: string; label: string; parentId?: string }[] {
  const employmentParents = LEAD_INFORMATION_EMPLOYMENT_OPTIONS.map((o) => o.value);
  const seen = new Set<string>();
  const out: { value: string; label: string; parentId?: string }[] = [];
  for (const parentId of employmentParents) {
    for (const o of listEcmMasterOptions("occupation", parentId)) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      out.push({ value: o.id, label: o.label, parentId: o.parentId ?? parentId });
    }
  }
  return out;
}

export { resolveProductFieldFamily };

/**
 * Apply Enterprise visibility rules — thin Partner alias over IDC resolve.
 */
export function resolveVisibleDetailSections(
  sections: PartnerJourneySectionDef[],
  ctx: {
    primaryBorrowerKind: "individual" | "company";
    productCode: string;
    values?: Record<string, string>;
  },
): PartnerJourneySectionDef[] {
  return resolveVisibleIdcSections(sections, ctx);
}

function deriveLegacyProjections(sections: PartnerJourneySectionDef[]): {
  borrowerFields: {
    individual: PartnerJourneyFieldDef[];
    company: PartnerJourneyFieldDef[];
  };
  requirementFields: PartnerJourneyFieldDef[];
  productFieldsByFamily: Record<string, PartnerJourneyFieldDef[]>;
} {
  const individual = sections
    .filter((s) => s.visibleWhenBorrower === "individual" && s.valueBucket === "borrower")
    .flatMap((s) => s.fields);
  const company = sections
    .filter((s) => s.visibleWhenBorrower === "company" && s.valueBucket === "borrower")
    .flatMap((s) => s.fields);
  const requirementFields = sections
    .filter((s) => s.valueBucket === "requirement")
    .flatMap((s) => s.fields.filter((f) => f.key !== "loanPurpose"));
  const property = sections.find((s) => s.sectionId === "property_information")?.fields ?? [];
  const loanPurpose = sections
    .flatMap((s) => s.fields)
    .filter((f) => f.key === "loanPurpose");

  return {
    borrowerFields: { individual, company },
    requirementFields,
    productFieldsByFamily: {
      HOME_LOAN: property.filter((f) => f.key !== "propertyUsage"),
      LAP: property.filter((f) => f.key !== "propertyType"),
      BUSINESS_LOAN: loanPurpose,
      PERSONAL_LOAN: [],
    },
  };
}

export function buildPartnerOpportunityJourneyConfig(): PartnerOpportunityJourneyConfigDto {
  const idc = getEnterpriseIdcCatalog();
  const detailSections = idc.detailSections;
  const products = LEAD_INFORMATION_PRODUCT_OPTIONS.map((p, index) => ({
    productCode: p.code,
    productLabel: p.label,
    description: "Enterprise Product Master",
    icon: p.code.replace(/_/g, " ").slice(0, 2).toUpperCase() || "PR",
    displayOrder: index + 1,
  }));

  const legacy = deriveLegacyProjections(detailSections);

  return {
    version: ENTERPRISE_IDC_VERSION,
    dtoSource: DTO_SOURCE,
    dtoNotice: DTO_NOTICE,
    initialDataCollection: {
      version: ENTERPRISE_IDC_VERSION,
      title: "Initial Data Collection",
      description:
        "Product-wise and borrower-type-wise customer onboarding form owned by Catalyst One. Catalyst Connect renders this projection only.",
    },
    terminology: {
      primaryBorrower: "Primary Borrower",
      borrowerType: "Borrower Type",
      individual: OPPORTUNITY_PRIMARY_BORROWER_LABELS.individual,
      company: OPPORTUNITY_PRIMARY_BORROWER_LABELS.company,
      product: "Product",
      requiredAmount: "Required Amount (₹)",
      lendingType: "Lending Type",
      transactionType: "Transaction Type",
      employmentType: "Employment Type",
      constitution: "Constitution",
      opportunity: "Opportunity",
      draft: "Draft",
      submit: "Submit",
      sectionComplete: "Complete",
      initialDataCollection: "Initial Data Collection",
      recommendations: "Recommendations",
    },
    journeySteps: [
      { id: "customer", label: "Customer" },
      { id: "borrower", label: "Borrower Type" },
      { id: "product", label: "Product" },
      { id: "details", label: "Initial Data Collection" },
      { id: "recommendations", label: "Recommendations" },
      { id: "documents", label: "Documents" },
      { id: "activities", label: "Activities" },
      { id: "review", label: "Review" },
      { id: "submit", label: "Submit" },
    ],
    borrowerTypes: [
      {
        value: OPPORTUNITY_PRIMARY_BORROWER_KIND.INDIVIDUAL,
        label: OPPORTUNITY_PRIMARY_BORROWER_LABELS.individual,
        description: "Natural person as Primary Borrower",
        icon: "IN",
      },
      {
        value: OPPORTUNITY_PRIMARY_BORROWER_KIND.COMPANY,
        label: OPPORTUNITY_PRIMARY_BORROWER_LABELS.company,
        description: "Company / Business as Primary Borrower",
        icon: "CO",
      },
    ],
    products,
    optionSets: {
      employmentType: optionsFromPairs([...LEAD_INFORMATION_EMPLOYMENT_OPTIONS]),
      occupation: ecmOccupationOptions(),
      constitution: ecmDomainOptions("constitution"),
      industry: ecmDomainOptions("industry"),
      lendingType: optionsFromPairs([...LEAD_INFORMATION_LENDING_TYPE_OPTIONS]),
      transactionType: optionsFromPairs([...LEAD_INFORMATION_TRANSACTION_OPTIONS]),
      propertyType: [...PROPERTY_TYPES]
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .map((label) => ({ value: label, label })),
      propertyUsage: getOccupancyMaster()
        .filter((o) => o.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
        .map((o) => ({ value: o.id, label: o.label })),
    },
    customerCapture: idc.customerCapture,
    detailSections,
    recommendationPresentation: { ...PARTNER_RECOMMENDATION_PRESENTATION },
    borrowerFields: legacy.borrowerFields,
    requirementFields: legacy.requirementFields,
    productFieldsByFamily: legacy.productFieldsByFamily,
    submissionPipeline: [
      "Wealth Partner App",
      "Partner API",
      "Catalyst One",
      "Opportunity Registry",
      "Workflow Engine",
      "Notification Engine",
      "Activity Engine",
      "Executive Dashboard",
      "Assigned Employee",
    ],
    enterpriseEventsOnSubmit: [
      "Opportunity Created",
      "Employee Notification",
      "Task Creation",
      "Workflow Initiated",
      "Timeline Entry",
      "Audit Log",
      "Mission Control Update",
    ],
  };
}

export const partnerOpportunityJourneyConfigService = {
  getConfig(): PartnerOpportunityJourneyConfigDto {
    return buildPartnerOpportunityJourneyConfig();
  },
};
