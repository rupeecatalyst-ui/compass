/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-002 — Gather authorized context (no invented figures).
 */

import "server-only";

import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import { enterpriseTransactionDocumentService } from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import {
  CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE,
  CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE,
} from "@/constants/chanakya-credit-proposal";
import { formatINR } from "@/lib/format-currency";
import type {
  ChanakyaCreditProposalEvidenceItem,
  ChanakyaCreditProposalStreamRequest,
} from "@/types/chanakya-credit-proposal";

function displayOrUnavailable(value: unknown): { text: string; available: boolean } {
  if (value == null) return { text: CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE, available: false };
  const s = String(value).trim();
  if (!s) return { text: CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE, available: false };
  return { text: s, available: true };
}

function purposeFromOpportunity(opp: Record<string, unknown>): string | null {
  const lending = opp.lendingExtension;
  if (lending && typeof lending === "object" && !Array.isArray(lending)) {
    const ext = lending as Record<string, unknown>;
    for (const key of ["purpose", "loanPurpose", "loan_purpose", "requirementPurpose"]) {
      const v = ext[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  const snapshot = opp.snapshot;
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    const snap = snapshot as Record<string, unknown>;
    for (const key of ["purpose", "loanPurpose", "loan_purpose"]) {
      const v = snap[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

export interface ChanakyaCreditProposalContextPack {
  opportunityId: string;
  opportunityNumber: string | null;
  productName: string;
  loanAmount: number;
  borrowerName: string;
  employmentType: string | null;
  city: string | null;
  companyName: string | null;
  purpose: string | null;
  transactionType: string | null;
  relationshipManagerName: string | null;
  lenderName: string | null;
  stated: NonNullable<ChanakyaCreditProposalStreamRequest["stated"]>;
  documents: Array<{
    name: string;
    status: string;
    typeRef: string;
    verified: boolean;
  }>;
  evidence: ChanakyaCreditProposalEvidenceItem[];
  gaps: string[];
}

export async function gatherChanakyaCreditProposalContext(
  input: ChanakyaCreditProposalStreamRequest,
): Promise<ChanakyaCreditProposalContextPack> {
  const opportunityId = String(input.opportunityId || "").trim();
  if (!opportunityId) {
    throw Object.assign(new Error("opportunityId is required"), {
      code: "OPPORTUNITY_REQUIRED",
      status: 400,
    });
  }

  const opp = (await enterpriseOpportunityService.getOpportunity(
    opportunityId,
  )) as Record<string, unknown>;

  const productName =
    String(opp.productLabel || opp.productCode || "").trim() || "Not Specified";
  const loanAmount =
    typeof opp.requestedAmount === "number" && Number.isFinite(opp.requestedAmount)
      ? opp.requestedAmount
      : 0;
  const borrowerName =
    String(opp.primaryContactName || opp.companyName || "").trim() || "Not Specified";
  const purpose = purposeFromOpportunity(opp);
  const stated = input.stated ?? {};

  let documents: ChanakyaCreditProposalContextPack["documents"] = [];
  try {
    const durable = await enterpriseTransactionDocumentService.listByOpportunity(
      opportunityId,
      { includeContent: false },
    );
    documents = durable.map((d) => ({
      name: d.displayName || d.originalFilename || d.typeRef,
      status: d.status,
      typeRef: d.typeRef,
      verified: Boolean(d.verifiedAt),
    }));
  } catch {
    documents = [];
  }

  // Supplement with client presence list (status/name only) when durable store is empty.
  if (documents.length === 0 && input.documentPresence?.length) {
    documents = input.documentPresence.map((d) => ({
      name: d.name,
      status: d.status,
      typeRef: d.typeRef || "unknown",
      verified: /verif/i.test(d.status),
    }));
  }

  const lenderName =
    (input.lenderName && input.lenderName !== "Not selected"
      ? input.lenderName.trim()
      : "") || null;

  const evidence: ChanakyaCreditProposalEvidenceItem[] = [];
  const push = (
    id: string,
    source: ChanakyaCreditProposalEvidenceItem["source"],
    label: string,
    raw: unknown,
  ) => {
    const { text, available } = displayOrUnavailable(raw);
    evidence.push({ id, source, label, value: text, available });
  };

  push("opp.number", "transaction", "Opportunity number", opp.opportunityNumber);
  push("opp.borrower", "transaction", "Borrower / customer", borrowerName);
  push("opp.product", "transaction", "Product", productName);
  push(
    "opp.amount",
    "transaction",
    "Required amount",
    loanAmount > 0 ? formatINR(loanAmount) : null,
  );
  push("opp.employment", "transaction", "Employment / borrower type", opp.employmentTypeCode);
  push("opp.city", "transaction", "City", opp.cityLabel);
  push("opp.company", "transaction", "Company", opp.companyName);
  push("opp.purpose", "transaction", "Purpose", purpose);
  push("opp.txnType", "transaction", "Transaction type", opp.transactionType);
  push("opp.rm", "transaction", "Relationship manager", opp.relationshipManagerName);

  push("cw.income", "credit_workbench", "Stated monthly income", stated.statedIncomeMonthly);
  push("cw.obligations", "credit_workbench", "Stated obligations", stated.statedObligations);
  push("cw.turnover", "credit_workbench", "Stated turnover", stated.statedTurnover);
  push("cw.vintage", "credit_workbench", "Stated business vintage", stated.statedBusinessVintage);
  push("cw.nature", "credit_workbench", "Nature of business", stated.statedNatureOfBusiness);
  push("cw.constitution", "credit_workbench", "Business constitution", stated.statedConstitution);
  push("cw.propertyType", "credit_workbench", "Stated property type", stated.statedPropertyType);
  push("cw.propertyValue", "credit_workbench", "Stated property value", stated.statedPropertyValue);
  push(
    "cw.propertyLocation",
    "credit_workbench",
    "Stated property location",
    stated.statedPropertyLocation,
  );

  push(
    "docs.count",
    "documents",
    "Documents on record (presence)",
    documents.length > 0 ? `${documents.length} document(s)` : null,
  );
  evidence.push({
    id: "docs.extraction",
    source: "edie_facts",
    label: "Structured document financial facts",
    value: CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE,
    available: false,
  });

  push("lender.name", "lender_product", "Selected lender (desk)", lenderName);
  evidence.push({
    id: "ext.research",
    source: "external_research",
    label: "External web research",
    value: "Not enabled in Phase 1.",
    available: false,
  });

  const gaps: string[] = [
    "FOIR / DSCR / LTV / banking analysis engines are not available yet.",
    "OCR and structured EDIE financial extraction are not available yet.",
    "External web research is not enabled yet.",
  ];
  if (!purpose) gaps.push("Loan purpose is not captured on the Opportunity.");
  if (!stated.statedIncomeMonthly && !stated.statedTurnover) {
    gaps.push("Stated income / turnover is incomplete on Credit Workbench.");
  }
  if (documents.length === 0) {
    gaps.push("No transaction documents were found for this Opportunity.");
  }
  if (!lenderName) {
    gaps.push("No lender is selected on the Credit Workbench desk.");
  }

  return {
    opportunityId,
    opportunityNumber:
      typeof opp.opportunityNumber === "string" ? opp.opportunityNumber : null,
    productName,
    loanAmount,
    borrowerName,
    employmentType:
      typeof opp.employmentTypeCode === "string" ? opp.employmentTypeCode : null,
    city: typeof opp.cityLabel === "string" ? opp.cityLabel : null,
    companyName: typeof opp.companyName === "string" ? opp.companyName : null,
    purpose,
    transactionType:
      typeof opp.transactionType === "string" ? opp.transactionType : null,
    relationshipManagerName:
      typeof opp.relationshipManagerName === "string"
        ? opp.relationshipManagerName
        : null,
    lenderName,
    stated,
    documents,
    evidence,
    gaps,
  };
}
