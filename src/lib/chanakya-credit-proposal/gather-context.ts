/**
 * CO-CHANAKYA-CREDIT-WORKBENCH-004 / CO-CHANAKYA-CREDIT-INTELLIGENCE-005
 * Gather authorized context + honest document reading (no invented figures).
 */

import "server-only";

import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import {
  CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE,
  CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE,
} from "@/constants/chanakya-credit-proposal";
import { buildChanakyaDocumentIntelligencePack } from "@/lib/chanakya-document-intelligence";
import type { ChanakyaDocumentIntelligencePack } from "@/types/chanakya-document-intelligence";
import { formatINR } from "@/lib/format-currency";
import type {
  ChanakyaCreditProposalEvidenceItem,
  ChanakyaCreditProposalInternalIntelligence,
  ChanakyaCreditProposalStreamRequest,
} from "@/types/chanakya-credit-proposal";
import { deriveChanakyaProposalEvidenceReadiness } from "./derive-evidence-readiness";
import { buildInternalStrengtheningRecommendations } from "./internal-recommendations";
import { redactCustomerContactPiiForAiContext } from "@/lib/chanakya-enterprise-read-context/redact-pii";

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
  /** User-provided RM note — never document evidence. */
  rmNote: string | null;
  stated: NonNullable<ChanakyaCreditProposalStreamRequest["stated"]>;
  documents: Array<{
    name: string;
    status: string;
    typeRef: string;
    verified: boolean;
  }>;
  /** Server-side document intelligence (may include truncated text excerpts). */
  documentIntelligence: ChanakyaDocumentIntelligencePack;
  evidence: ChanakyaCreditProposalEvidenceItem[];
  /** Lender-facing limitation statements (no upload CTAs). */
  gaps: string[];
  intelligence: ChanakyaCreditProposalInternalIntelligence;
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

  const oppRaw = (await enterpriseOpportunityService.getOpportunity(
    opportunityId,
  )) as Record<string, unknown>;
  // Hard privacy: strip customer mobile/email before any AI / proposal context use.
  const opp = redactCustomerContactPiiForAiContext(oppRaw) as Record<string, unknown>;

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
  const rmNote =
    typeof input.rmNote === "string" && input.rmNote.trim()
      ? input.rmNote.trim()
      : null;

  const documentIntelligence = await buildChanakyaDocumentIntelligencePack({
    opportunityId,
  });

  let documents: ChanakyaCreditProposalContextPack["documents"] =
    documentIntelligence.reads.map((r) => ({
      name: r.displayName,
      status: r.hasBinary ? "active" : "metadata_only",
      typeRef: r.typeRef,
      verified: false,
    }));

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

  if (rmNote) {
    evidence.push({
      id: "rm.note",
      source: "rm_note",
      label: "RM / Credit Officer note (user-provided)",
      value: rmNote,
      available: true,
    });
  } else {
    evidence.push({
      id: "rm.note",
      source: "rm_note",
      label: "RM / Credit Officer note (user-provided)",
      value: "No RM note provided.",
      available: false,
    });
  }

  push(
    "docs.count",
    "documents",
    "Documents on record (presence)",
    documents.length > 0 ? `${documents.length} document(s)` : null,
  );

  const readable = documentIntelligence.documentsWithReadableText;
  evidence.push({
    id: "docs.content_read",
    source: "documents",
    label: "Document content reading (native / PDF text-layer)",
    value:
      readable > 0
        ? `${readable} document(s) yielded readable text excerpts (truncated). Structured financial fact extraction is not available.`
        : "No document yielded readable text in this run (missing binary, scanned PDF, or unsupported type).",
    available: readable > 0,
  });

  evidence.push({
    id: "docs.extraction",
    source: "edie_facts",
    label: "Structured document financial facts",
    value:
      documentIntelligence.structuredFacts.length > 0
        ? `${documentIntelligence.structuredFacts.length} structured fact(s) extracted from readable document text (labeled values only — not OCR-invented).`
        : CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE,
    available: documentIntelligence.structuredFacts.length > 0,
  });

  push("lender.name", "lender_product", "Selected lender (desk)", lenderName);
  evidence.push({
    id: "ext.research",
    source: "external_research",
    label: "External web research",
    value: "Not enabled yet.",
    available: false,
  });

  const gaps: string[] = [
    "FOIR / DSCR / LTV / banking analysis engines are not available yet.",
    "Structured EDIE financial / table extraction is not available yet.",
    "External web research is not enabled yet.",
  ];
  if (documentIntelligence.documentsRequiringOcr > 0) {
    gaps.push(
      `${documentIntelligence.documentsRequiringOcr} document(s) require OCR and were not content-read.`,
    );
  }
  if (!purpose) {
    gaps.push("Loan purpose is not captured on the Opportunity.");
  }
  if (documents.length === 0) {
    gaps.push("No transaction documents were found for this Opportunity.");
  }

  const readiness = deriveChanakyaProposalEvidenceReadiness({
    productName,
    loanAmount,
    purpose,
    employmentType:
      typeof opp.employmentTypeCode === "string" ? opp.employmentTypeCode : null,
    companyName: typeof opp.companyName === "string" ? opp.companyName : null,
    city: typeof opp.cityLabel === "string" ? opp.cityLabel : null,
    stated,
    documents,
    lenderName,
  });

  const recommendations = buildInternalStrengtheningRecommendations({
    documents,
    hasStatedIncome: Boolean(stated.statedIncomeMonthly?.trim()),
    hasStatedTurnover: Boolean(stated.statedTurnover?.trim()),
    hasPropertyContext: Boolean(
      stated.statedPropertyType?.trim() ||
        stated.statedPropertyValue?.trim() ||
        stated.statedPropertyLocation?.trim(),
    ),
  });

  const documentReading = {
    documentsReviewed: documentIntelligence.documentsReviewed,
    documentsWithBinary: documentIntelligence.documentsWithBinary,
    documentsWithReadableText: documentIntelligence.documentsWithReadableText,
    documentsRequiringOcr: documentIntelligence.documentsRequiringOcr,
    documentsRequiringVision: documentIntelligence.documentsRequiringVision,
    structuredFactsCount: documentIntelligence.structuredFacts.length,
    crossDocumentComparisonsCount:
      documentIntelligence.crossDocumentComparisons.length,
    visionConfigured: documentIntelligence.visionProvider.configured,
    capabilityNote: documentIntelligence.capability.note,
    reads: documentIntelligence.reads.map((r) => ({
      documentId: r.documentId,
      displayName: r.displayName,
      typeRef: r.typeRef,
      familyHint: r.familyHint,
      status: r.status,
      extractionMethod: r.extractionMethod,
      hasBinary: r.hasBinary,
      textCharCount: r.textCharCount,
      limitation: r.limitation,
    })),
    extractedFactSummaries: documentIntelligence.structuredFacts
      .slice(0, 24)
      .map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        periodLabel: f.periodLabel ?? null,
        documentName: f.provenance.displayName,
        confidence: f.provenance.confidence,
      })),
  };

  const nativeDocumentTextAvailable = readable > 0;
  const structuredFinancialFactsAvailable =
    documentIntelligence.structuredFacts.length > 0;

  const intelligence: ChanakyaCreditProposalInternalIntelligence = {
    readiness,
    rmNote,
    recommendations,
    limitations: [
      ...gaps,
      ...documentIntelligence.limitations.slice(0, 4),
      readiness.capabilityNote,
      "Proposal Readiness does not block proposal generation.",
      "Internal recommendations must never appear in lender communication.",
    ],
    documentPresenceSummary:
      documents.length === 0
        ? "No documents on record."
        : `${documents.length} document(s) on record · ${readable} with readable text · ${documentIntelligence.structuredFacts.length} structured fact(s) · ${documentIntelligence.documentsRequiringOcr} OCR-required.`,
    documentReading,
    nativeDocumentTextAvailable,
    structuredFinancialFactsAvailable,
    contentExtractionAvailable: nativeDocumentTextAvailable,
    webResearchAvailable: false,
    financialEnginesAvailable: false,
  };

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
    rmNote,
    stated,
    documents,
    documentIntelligence,
    evidence,
    gaps,
    intelligence,
  };
}
