/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-016 — Lender proposal intelligence (verify-friendly).
 * Transforms credit intelligence into lender-quality proposal content — evidence only.
 */

import {
  CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE,
  CHANAKYA_LENDER_PROPOSAL_BANKING_LIMITATION,
  CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE,
  CHANAKYA_LENDER_PROPOSAL_OCR_LIMITATION,
  CHANAKYA_LENDER_PROPOSAL_RATIO_LIMITATION,
} from "@/constants/chanakya-credit-proposal";
import { formatINR } from "@/lib/format-currency";
import {
  assertNoForbiddenCreditLanguage,
} from "@/lib/chanakya-credit-intelligence/credit-intelligence-core";
import {
  assertNoForbiddenSynthesisLanguage,
  composeCreditSynthesis,
} from "@/lib/chanakya-credit-intelligence/credit-synthesis-core";
import type { ChanakyaCreditProposalContextPack } from "./gather-context";
import type {
  ChanakyaCreditProposalEvidenceSource,
  ChanakyaCreditProposalSectionId,
} from "@/types/chanakya-credit-proposal";
import type {
  ChanakyaCreditFinancialFact,
  ChanakyaCreditIntelligenceContext,
} from "@/types/chanakya-credit-intelligence";
import type {
  ChanakyaLenderFitAssessment,
  ChanakyaProductLenderIntelligenceContext,
} from "@/types/chanakya-enterprise-read-context";
import { buildGstProposalTraceabilitySection } from "./gst-proposal-traceability-core";
import {
  buildAdvisoryRecommendationV3,
  buildBankingAnalysisV3,
  buildBorrowerProfileV3,
  buildBusinessOverviewV3,
  buildCreditContextV3,
  buildEvidenceNotesV3,
  buildExecutiveSummaryV3,
  buildFacilityPurposeV3,
  buildFinancialAnalysisV3,
  buildGstAnalysisV3,
  buildInternalProvenanceV3,
  buildKeyConcernsV3,
  buildKeyPositivesV3,
  buildLoanRequirementV3,
  buildMitigantsV3,
  buildPendingInformationV3,
  buildProductLenderContextV3,
  buildPropertySecurityV3,
  buildProposedFacilityV3,
  formatAmountLabel,
  type LenderProposalInternalProvenanceRow,
} from "./lender-proposal-v3-core";

const FORBIDDEN_LENDER_TERMS =
  /\b(approved|eligible|guaranteed|best lender|best_lender|suitable for the borrower)\b/i;

const INTERNAL_LEAK_PATTERNS = [
  /\binternal recommendation/i,
  /\binternal-only\b/i,
  /\bphase out of scope\b/i,
  /\bengine not available\b/i,
  /\bnot available in Catalyst One\b/i,
  /\bCatalyst One\b/i,
  /\bCHANAKYA does not assert underwriting eligibility\b/i,
  /\bsee CHANAKYA internal recommendations\b/i,
];

export function assertNoForbiddenLenderProposalLanguage(text: string): boolean {
  if (!assertNoForbiddenCreditLanguage(text)) return false;
  if (FORBIDDEN_LENDER_TERMS.test(text)) return false;
  return true;
}

export function assertNoInternalMetadataInLenderText(text: string): boolean {
  return !INTERNAL_LEAK_PATTERNS.some((re) => re.test(text));
}

export function sanitizeLenderFacingText(text: string): string {
  return text
    .replace(/not available in Catalyst One[^.]*\./gi, `${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}.`)
    .replace(/engine not available[^.]*\./gi, `${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}.`)
    .replace(/no approved SSOT ratio engine/gi, "no configured ratio engine")
    .replace(/approved SSOT/gi, "configured SSOT")
    .replace(/phase out of scope[^.]*\./gi, "")
    .replace(/out of scope for this generation phase[^.]*\./gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function line(label: string, value: string | null | undefined): string {
  const v = value?.trim() ? value.trim() : CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE;
  return `- **${label}:** ${sanitizeLenderFacingText(v)}`;
}

function isReliableFact(f: ChanakyaCreditFinancialFact): boolean {
  const conf = f.provenance.confidence?.toLowerCase() ?? "";
  return conf !== "ambiguous" && conf !== "low";
}

function resolveProductLender(
  raw: Record<string, unknown>,
): ChanakyaProductLenderIntelligenceContext | null {
  if (!raw || typeof raw !== "object") return null;
  if (!("availability" in raw)) return null;
  return raw as unknown as ChanakyaProductLenderIntelligenceContext;
}

function assignedLenderAssessment(
  pli: ChanakyaProductLenderIntelligenceContext | null,
  deskLenderName: string | null,
): ChanakyaLenderFitAssessment | null {
  if (!pli?.assignedLenders?.length) return null;
  if (deskLenderName) {
    const match = pli.assignedLenders.find(
      (l) =>
        l.lenderName?.toLowerCase() === deskLenderName.toLowerCase() ||
        l.lenderCode?.toLowerCase() === deskLenderName.toLowerCase(),
    );
    if (match) return match;
  }
  return pli.assignedLenders[0] ?? null;
}

function formatProgramParameterLines(
  params: Record<string, unknown> | null | undefined,
): string[] {
  if (!params) return [];
  const out: string[] = [];
  const push = (label: string, key: string, suffix = "") => {
    const v = params[key];
    if (v != null && v !== "") out.push(`- **${label}:** ${v}${suffix}`);
  };
  push("Program", "programLabel");
  push("Program code", "programCode");
  push("Indicative ROI", "roiPercent", "%");
  push("ROI range (min)", "minRoiPercent", "%");
  push("ROI range (max)", "maxRoiPercent", "%");
  push("Maximum LTV", "maxLtvPercent", "%");
  push("Maximum FOIR", "maxFoirPercent", "%");
  push("Maximum tenure", "maxTenureMonths", " months");
  push("Minimum ticket", "minFundingAmount");
  push("Maximum ticket", "maxFundingAmount");
  return out;
}

function financialYearBlock(ci: ChanakyaCreditIntelligenceContext): string[] {
  const blocks: string[] = [];
  const qualityNote =
    ci.financialFactQuality.downgradedCount > 0 || ci.financialFactQuality.rejectedCount > 0
      ? `_Note: ${ci.financialFactQuality.downgradedCount} fact(s) downgraded and ${ci.financialFactQuality.rejectedCount} table artefact(s) rejected — only reliable-confidence facts appear below._`
      : null;
  if (qualityNote) {
    blocks.push(qualityNote);
    blocks.push("");
  }
  const priorityFields = [
    "revenue",
    "total_income",
    "pat",
    "net_profit",
    "ebitda",
    "net_worth",
    "total_assets",
    "borrowings",
    "current_assets",
    "current_liabilities",
  ];

  for (const year of ci.financialProfile.years) {
    const facts = (ci.financialProfile.factsByYear[year] ?? []).filter(isReliableFact);
    if (!facts.length) continue;

    const ordered: ChanakyaCreditFinancialFact[] = [];
    for (const field of priorityFields) {
      const match = facts.find((f) => f.field === field);
      if (match) ordered.push(match);
    }
    for (const f of facts) {
      if (!ordered.includes(f)) ordered.push(f);
    }

    blocks.push(`**${year}**`);
    for (const f of ordered.slice(0, 12)) {
      const unitSuffix = f.unit ? ` (${f.unit})` : "";
      blocks.push(
        `- ${f.label}: ${f.value}${unitSuffix} · ${f.financialYear ?? "period n/a"} · ${f.provenance.documentName} [${f.provenance.extractionMethod}; ${f.provenance.confidence}]`,
      );
    }
    blocks.push("");
  }
  return blocks;
}

function trendLines(ci: ChanakyaCreditIntelligenceContext): string[] {
  return ci.financialTrends.metrics
    .filter((m) => m.available && m.interpretation && assertNoForbiddenLenderProposalLanguage(m.interpretation))
    .map((m) => `- ${m.label}: ${sanitizeLenderFacingText(m.interpretation!)}`);
}

function buildDocumentEvidenceSection(ctx: ChanakyaCreditProposalContextPack): string {
  const di = ctx.documentIntelligence;
  const ci = ctx.creditIntelligence;
  const reviewed = di.documentsReviewed;
  const contributing = di.reads.filter(
    (r) =>
      (r.status === "content_read" || r.status === "content_read_partial") &&
      r.textCharCount > 0,
  );
  const factDocIds = new Set(
    di.structuredFacts.map((f) => f.provenance.documentId).filter(Boolean),
  );
  const contributingNames = contributing
    .filter((r) => factDocIds.has(r.documentId) || r.textCharCount >= 20)
    .map((r) => r.displayName)
    .slice(0, 12);

  const metadataOnlyBanks = ci.bankingAnalysis.documentInventory.filter(
    (d) =>
      d.availabilityState === "metadata_only" ||
      d.availabilityState === "binary_unavailable",
  );
  const ocrRequired = di.documentsRequiringOcr;

  const missing: string[] = [];
  if (metadataOnlyBanks.length > 0) {
    missing.push(
      `${metadataOnlyBanks.length} bank statement(s) on file without readable transaction content.`,
    );
  }
  if (ocrRequired > 0) {
    missing.push(`${ocrRequired} document(s) require OCR before financial content can be reviewed.`);
  }
  if (ci.financialProfile.availability === "NOT_AVAILABLE") {
    missing.push("Audited financial statement facts were not extracted from readable documents.");
  }

  return [
    `- **Documents reviewed:** ${reviewed}`,
    `- **Documents contributing evidence:** ${
      contributingNames.length
        ? contributingNames.join("; ")
        : CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE
    }`,
    `- **Structured facts extracted:** ${di.structuredFacts.length}`,
    ``,
    missing.length
      ? `**Important gaps:**\n${missing.map((m) => `- ${m}`).join("\n")}`
      : `- **Important gaps:** None identified beyond standard lender verification.`,
    ``,
    ocrRequired > 0 ? `- **OCR limitation:** ${CHANAKYA_LENDER_PROPOSAL_OCR_LIMITATION}` : null,
    ci.bankingAnalysis.availability === "NOT_AVAILABLE"
      ? `- **Banking limitation:** ${sanitizeLenderFacingText(ci.bankingAnalysis.limitation ?? CHANAKYA_LENDER_PROPOSAL_BANKING_LIMITATION)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildVerificationPoints(ctx: ChanakyaCreditProposalContextPack): string[] {
  const points: string[] = [];
  const ci = ctx.creditIntelligence;

  if (ci.bankingAnalysis.availability === "NOT_AVAILABLE") {
    points.push(
      "Obtain readable bank statements and reconcile credits with declared turnover.",
    );
  }
  if (ctx.documentIntelligence.documentsRequiringOcr > 0) {
    points.push(
      "Complete OCR or re-upload for scanned financial documents before relying on unaudited figures.",
    );
  }
  if (ci.reconciliation.gstVsFinancials.status === "VARIANCE_IDENTIFIED") {
    points.push("Reconcile GST turnover with financial statement revenue where periods align.");
  }
  if (ci.auditorAnalysis.observations.length > 0) {
    points.push("Review auditor qualifications and management representations in audited financials.");
  }
  if (!ctx.purpose?.trim()) {
    points.push("Confirm and document the end-use of funds with the borrower.");
  }
  if (points.length === 0) {
    points.push("Standard lender KYC, bureau, and field verification apply before credit decision.");
  }
  return points.slice(0, 6);
}

export function shouldUseLenderProposalIntelligence(ctx: ChanakyaCreditProposalContextPack): boolean {
  const ci = ctx.creditIntelligence;
  const pli = resolveProductLender(ctx.productLenderIntelligence);
  return (
    ci.availability !== "NOT_AVAILABLE" ||
    ci.financialProfile.years.length > 0 ||
    ci.gstAnalysis.returns.length > 0 ||
    ctx.documentIntelligence.structuredFacts.length > 0 ||
    (pli?.availability === "AVAILABLE" &&
      ((pli.assignedLenders?.length ?? 0) > 0 || (pli.lenderFit?.length ?? 0) > 0))
  );
}

export type LenderProposalSectionBuild = {
  id: ChanakyaCreditProposalSectionId;
  body: string;
  evidenceSources: ChanakyaCreditProposalEvidenceSource[];
  included: boolean;
};

export type LenderProposalIntelligenceResult = {
  sections: LenderProposalSectionBuild[];
  internalProvenance: LenderProposalInternalProvenanceRow[];
  lenderLimitations: string[];
};

export function buildLenderProposalIntelligence(
  ctx: ChanakyaCreditProposalContextPack,
): LenderProposalIntelligenceResult {
  const ci = ctx.creditIntelligence;
  const pli = resolveProductLender(ctx.productLenderIntelligence);
  const assigned = assignedLenderAssessment(pli, ctx.lenderName);

  const metadataOnlyBanks = ci.bankingAnalysis.documentInventory.filter(
    (d) =>
      d.availabilityState === "metadata_only" ||
      d.availabilityState === "binary_unavailable",
  ).length;

  const synthesis = composeCreditSynthesis({
    opportunityId: ctx.opportunityId,
    opportunityNumber: ctx.opportunityNumber,
    creditIntelligence: ci,
    borrowerLabel: ctx.borrowerName,
    productLabel: ctx.productName,
    requestedAmount: ctx.loanAmount,
    transactionType: ctx.transactionType,
    documentSummary: {
      documentsReviewed: ctx.documentIntelligence.documentsReviewed,
      documentsWithReadableText: ctx.documentIntelligence.documentsWithReadableText,
      documentsRequiringOcr: ctx.documentIntelligence.documentsRequiringOcr,
      structuredFactCount: ctx.documentIntelligence.structuredFacts.length,
      metadataOnlyBankStatements: metadataOnlyBanks,
    },
    limitations: [],
  });

  const amountLabel = formatAmountLabel(ctx.loanAmount);

  const gstTrace = buildGstProposalTraceabilitySection({
    gstAnalysis: ci.gstAnalysis,
    gstVsFinancials: ci.reconciliation.gstVsFinancials,
    financialProfile: ci.financialProfile,
  });

  const internalProvenance = buildInternalProvenanceV3(ci, gstTrace);

  const hasPropertyContext = Boolean(
    ctx.stated.statedPropertyType?.trim() ||
      ctx.stated.statedPropertyValue?.trim() ||
      ci.propertyAnalysis.availability !== "NOT_AVAILABLE",
  );

  const lenderLimitations = [
    CHANAKYA_LENDER_PROPOSAL_RATIO_LIMITATION,
    ...(ci.bankingAnalysis.availability === "NOT_AVAILABLE"
      ? [sanitizeLenderFacingText(ci.bankingAnalysis.limitation ?? CHANAKYA_LENDER_PROPOSAL_BANKING_LIMITATION)]
      : []),
    ...(ctx.documentIntelligence.documentsRequiringOcr > 0 ||
    ctx.documentIntelligence.documentsOcrFailed > 0
      ? [CHANAKYA_LENDER_PROPOSAL_OCR_LIMITATION]
      : []),
  ].filter((l) => l.trim());

  const financialSection = buildFinancialAnalysisV3({ ctx, ci, synthesis, gstTrace });
  const gstSection = buildGstAnalysisV3({ ci, gstTrace });
  const propertySection = buildPropertySecurityV3({ ctx, ci, hasPropertyContext });
  const pendingBody = buildPendingInformationV3({ ctx, ci, lenderLimitations });
  const hasPendingGaps = pendingBody.toLowerCase().includes("outstanding verification");

  const sections: LenderProposalSectionBuild[] = [
    {
      id: "executive_summary",
      body: buildExecutiveSummaryV3({ ctx, ci, synthesis, amountLabel }),
      evidenceSources: ["transaction", "credit_workbench", "documents", "edie_facts", "lender_product", "chanakya_inference"],
      included: true,
    },
    {
      id: "borrower_profile",
      body: buildBorrowerProfileV3(ctx),
      evidenceSources: ["transaction", "credit_workbench", "edie_facts"],
      included: true,
    },
    {
      id: "business_overview",
      body: buildBusinessOverviewV3(ctx),
      evidenceSources: ["transaction", "credit_workbench", "edie_facts", "rm_note"],
      included: true,
    },
    {
      id: "loan_requirement",
      body: buildLoanRequirementV3(ctx, amountLabel),
      evidenceSources: ["transaction", "lender_product"],
      included: true,
    },
    {
      id: "facility_purpose",
      body: buildFacilityPurposeV3(ctx),
      evidenceSources: ["transaction", "credit_workbench"],
      included: true,
    },
    {
      id: "financial_analysis",
      body: financialSection.body,
      evidenceSources: ["credit_workbench", "edie_facts", "documents"],
      included: financialSection.included,
    },
    {
      id: "gst_analysis",
      body: gstSection.body || gstTrace.body,
      evidenceSources: ["edie_facts", "documents"],
      included: gstSection.included || gstTrace.included,
    },
    {
      id: "banking_analysis",
      body: buildBankingAnalysisV3(ci),
      evidenceSources: ["documents", "edie_facts"],
      included: true,
    },
    {
      id: "credit_context",
      body: buildCreditContextV3({ ctx, ci, synthesis }),
      evidenceSources: ["credit_workbench", "edie_facts", "chanakya_inference"],
      included: true,
    },
    {
      id: "property_security",
      body: propertySection.body,
      evidenceSources: ["credit_workbench", "documents", "transaction"],
      included: propertySection.included,
    },
    {
      id: "product_lender_context",
      body: buildProductLenderContextV3({ ctx, pli, assigned }),
      evidenceSources: ["transaction", "lender_product"],
      included: true,
    },
    {
      id: "key_positives",
      body: buildKeyPositivesV3(synthesis),
      evidenceSources: ["chanakya_inference", "edie_facts", "documents"],
      included: true,
    },
    {
      id: "key_concerns",
      body: buildKeyConcernsV3(synthesis),
      evidenceSources: ["chanakya_inference", "edie_facts", "documents"],
      included: true,
    },
    {
      id: "mitigants",
      body: buildMitigantsV3(synthesis),
      evidenceSources: ["chanakya_inference", "edie_facts"],
      included: true,
    },
    {
      id: "pending_information",
      body: pendingBody,
      evidenceSources: ["documents", "edie_facts", "chanakya_inference"],
      included: true,
    },
    {
      id: "proposed_structure",
      body: buildProposedFacilityV3({ ctx, assigned, amountLabel }),
      evidenceSources: ["transaction", "lender_product"],
      included: true,
    },
    {
      id: "recommendation",
      body: buildAdvisoryRecommendationV3({ synthesis, hasPendingGaps }),
      evidenceSources: ["chanakya_inference"],
      included: true,
    },
    {
      id: "evidence_notes",
      body: buildEvidenceNotesV3({ ctx, ci, internalProvenance, gstTrace }),
      evidenceSources: ["documents", "edie_facts"],
      included: true,
    },
  ];

  for (const s of sections) {
    s.body = sanitizeLenderFacingText(s.body);
  }

  const fullCheck = sections.map((s) => s.body).join("\n");
  if (!assertNoForbiddenLenderProposalLanguage(fullCheck)) {
    throw new Error("Lender proposal contains forbidden credit language");
  }
  if (!assertNoInternalMetadataInLenderText(fullCheck)) {
    throw new Error("Lender proposal leaked internal implementation metadata");
  }
  if (
    synthesis.internalRecommendations.some((r) =>
      fullCheck.toLowerCase().includes(r.recommendation.toLowerCase().slice(0, 40)),
    )
  ) {
    throw new Error("Lender proposal leaked internal recommendations");
  }
  if (!assertNoForbiddenSynthesisLanguage(fullCheck)) {
    throw new Error("Lender proposal failed synthesis language gate");
  }

  return { sections, internalProvenance, lenderLimitations };
}

/** Patterns characteristic of pre-016 proposal output — for regression comparison only. */
export const LEGACY_PROPOSAL_MARKERS = [
  "phase out of scope",
  "not available in Catalyst One",
  "Document inventory reflects presence",
  "Structured financial extraction and ratio engines are **not** available yet",
  "engine SSOT pending",
] as const;

export function detectLegacyProposalMarkers(text: string): string[] {
  return LEGACY_PROPOSAL_MARKERS.filter((m) => text.toLowerCase().includes(m.toLowerCase()));
}
