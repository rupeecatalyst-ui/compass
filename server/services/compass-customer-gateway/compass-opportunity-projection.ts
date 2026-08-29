import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";

type OpportunityRow = {
  id: string;
  opportunityNumber: string;
  productCode: string | null;
  productLabel: string | null;
  lifecycleStatus: string;
  requirementStage: string;
  primaryContactId: string | null;
  primaryContactName: string | null;
  primaryContactMobile: string | null;
  companyName: string | null;
  cityLabel: string | null;
  requestedAmount: unknown;
  createdAt: Date;
  updatedAt: Date;
  snapshot: unknown;
  lendingExtension: unknown;
  primaryBorrowerKind: string | null;
  transactionType: string | null;
};

function formatAmountLabel(amount: unknown): string {
  if (amount == null) return "Not Specified";
  const n = typeof amount === "object" && amount !== null && "toNumber" in amount
    ? (amount as { toNumber: () => number }).toNumber()
    : Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "Not Specified";
  return n.toLocaleString("en-IN");
}

function readSnapshotFields(snapshot: unknown): {
  borrowerFields: Record<string, string>;
  productFields: Record<string, string>;
} {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { borrowerFields: {}, productFields: {} };
  }
  const s = snapshot as Record<string, unknown>;
  const borrower =
    s.compassBorrowerFields && typeof s.compassBorrowerFields === "object"
      ? (s.compassBorrowerFields as Record<string, string>)
      : s.partnerBorrowerFields && typeof s.partnerBorrowerFields === "object"
        ? (s.partnerBorrowerFields as Record<string, string>)
        : {};
  const product =
    s.compassProductFields && typeof s.compassProductFields === "object"
      ? (s.compassProductFields as Record<string, string>)
      : s.partnerProductFields && typeof s.partnerProductFields === "object"
        ? (s.partnerProductFields as Record<string, string>)
        : {};
  return { borrowerFields: borrower, productFields: product };
}

export function projectCompassOpportunityDetail(
  row: OpportunityRow,
  documents: PartnerOpportunityDetailDto["documents"] = [],
): PartnerOpportunityDetailDto {
  const { borrowerFields, productFields } = readSnapshotFields(row.snapshot);
  const life = (row.lifecycleStatus || "").toLowerCase();
  const stageLabel =
    life === "dialogue" || life === "draft"
      ? "Draft"
      : row.requirementStage || "Lead Creation";

  return {
    opportunityId: row.id,
    reference: row.opportunityNumber,
    customerId: row.primaryContactId || "",
    customerDisplayName: row.primaryContactName || row.companyName || "Not Specified",
    productCode: row.productCode,
    productLabel: row.productLabel || "Not Specified",
    requiredAmountLabel: formatAmountLabel(row.requestedAmount),
    stageLabel,
    lifecycleStatus: life === "dialogue" ? "draft" : life,
    ownerLabel: "COMPASS",
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    summary: "COMPASS customer journey — Enterprise Opportunity Registry.",
    dtoSource: "enterprise_opportunity_registry",
    dtoNotice: "Projected from Catalyst One for COMPASS customer gateway.",
    primaryBorrowerKind: row.primaryBorrowerKind === "company" ? "company" : "individual",
    borrowerFields,
    productFields,
    documents,
    activities: [],
    timeline: [],
    loanFile: {
      available: false,
      fileId: null,
      fileReference: null,
      stageLabel: null,
      lenderLabel: null,
      amountLabel: null,
      statusLabel: "Not attached",
      message: "Operational processing begins after final submission.",
      dtoSource: "enterprise_opportunity_registry",
      dtoNotice: "COMPASS customer gateway projection.",
    },
    sourceAttribution: {
      sourcePartnerId: "",
      sourcePartnerName: "COMPASS",
      sourcePartnerCode: "website_compass",
      sourceType: "website_compass",
      organizationId: "",
      branchLabel: null,
      territoryLabel: null,
      hiddenFromPartnerUi: true,
    },
  };
}

export function answersToSnapshotFields(
  answers: Record<string, string | number | boolean | null>,
): {
  borrowerFields: Record<string, string>;
  productFields: Record<string, string>;
  requestedAmount: number | null;
  city: string | null;
} {
  const borrowerFields: Record<string, string> = {};
  const productFields: Record<string, string> = {};
  let requestedAmount: number | null = null;
  let city: string | null = null;

  for (const [key, raw] of Object.entries(answers)) {
    if (raw == null) continue;
    const value = String(raw).trim();
    if (!value) continue;
    if (key === "loanAmount") {
      const n = Number(String(raw).replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) requestedAmount = n;
      productFields.requestedAmountLabel = value;
      continue;
    }
    if (key === "city") {
      city = value;
      borrowerFields.city = value;
      continue;
    }
    if (key === "propertyType") productFields.propertyType = value;
    else if (key === "propertyValue") productFields.propertyValueLabel = value;
    else if (key === "incomeType" || key === "employmentTypeCode")
      borrowerFields.employmentTypeCode = value;
    else if (key === "monthlyIncome") borrowerFields.monthlyIncomeLabel = value;
    else if (key === "existingEmi") borrowerFields.existingEmiLabel = value;
    else if (key === "transactionType") productFields.transactionType = value;
    else borrowerFields[key] = value;
  }

  return { borrowerFields, productFields, requestedAmount, city };
}
