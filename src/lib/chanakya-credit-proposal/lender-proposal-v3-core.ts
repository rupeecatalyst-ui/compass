/**
 * CO-CHANAKYA-027 — Lender proposal V3 section builders.
 * Professional credit-memorandum presentation — verified evidence only.
 */

import {
  CHANAKYA_LENDER_PROPOSAL_BANKING_LIMITATION,
  CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE,
  CHANAKYA_LENDER_PROPOSAL_OCR_LIMITATION,
  CHANAKYA_LENDER_PROPOSAL_RATIO_LIMITATION,
} from "@/constants/chanakya-credit-proposal";
import { formatINR, formatINRCompact } from "@/lib/format-currency";
import {
  assertNoForbiddenCreditLanguage,
} from "@/lib/chanakya-credit-intelligence/credit-intelligence-core";
import type { ChanakyaCreditSynthesisContext } from "@/types/chanakya-credit-synthesis";
import type {
  ChanakyaCreditIntelligenceContext,
} from "@/types/chanakya-credit-intelligence";
import type {
  ChanakyaLenderFitAssessment,
  ChanakyaProductLenderIntelligenceContext,
} from "@/types/chanakya-enterprise-read-context";
import type { ChanakyaCreditProposalContextPack } from "./gather-context";
import type { GstProposalTraceabilityResult } from "./gst-proposal-traceability-core";
import {
  buildFinancialNarrativeObservations,
  buildFinancialStatementTable,
  collectVerifiedFinancialTraces,
} from "./lender-proposal-financial-presentation-core";

function sanitizeLenderFacingText(text: string): string {
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

function assertLenderLanguage(text: string): boolean {
  return assertNoForbiddenCreditLanguage(text);
}

function line(label: string, value: string | null | undefined): string {
  const v = value?.trim() ? value.trim() : CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE;
  return `- **${label}:** ${sanitizeLenderFacingText(v)}`;
}

function formatProgramParameterLines(params: Record<string, unknown> | null | undefined): string[] {
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

/** Compact crore/lakh labelling for facility amounts in executive sections. */
export function formatAmountLabel(amount: number): string {
  if (amount <= 0) return CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE;
  if (amount >= 1_00_00_000) return formatINRCompact(amount);
  return formatINR(amount);
}

function inferNextFinancialYear(latestYear: string): string | null {
  const m = latestYear.match(/(\d{4})[-/](\d{2,4})/);
  if (!m) return null;
  const start = Number(m[1]);
  const endRaw = m[2]!;
  const end = endRaw.length === 2 ? 2000 + Number(endRaw) : Number(endRaw);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const nextStart = end;
  const nextEnd = (end + 1) % 100;
  return `FY${nextStart}-${String(nextEnd).padStart(2, "0")}`;
}

export function buildExecutiveSummaryV3(input: {
  ctx: ChanakyaCreditProposalContextPack;
  ci: ChanakyaCreditIntelligenceContext;
  synthesis: ChanakyaCreditSynthesisContext;
  amountLabel: string;
}): string {
  const { ctx, ci, synthesis, amountLabel } = input;
  const business = ci.businessAnalysis.profile;

  const evidenceLines: string[] = [];
  if (ci.financialProfile.years.length) {
    evidenceLines.push(
      `Audited financial statements reviewed for ${ci.financialProfile.years.join(" and ")}.`,
    );
  }
  if (ci.gstAnalysis.financialInsightCount > 0) {
    evidenceLines.push(
      `${ci.gstAnalysis.financialInsightCount} GST return period(s) with traceable taxable turnover.`,
    );
  }
  if (ci.bankingAnalysis.availability === "AVAILABLE") {
    evidenceLines.push("Readable bank statement content supports transaction-level banking review.");
  } else if (ci.bankingAnalysis.documentInventory.length > 0) {
    evidenceLines.push(
      "Bank statements are on file; transaction-level review awaits readable statement content.",
    );
  }

  const considerations = synthesis.rankedConcerns
    .filter((c) => assertLenderLanguage(c.statement))
    .slice(0, 3)
    .map((c) => sanitizeLenderFacingText(c.statement));

  return [
    `**Credit memorandum — executive summary**`,
    ``,
    `This memorandum summarises verified evidence for **${ctx.borrowerName}** (reference **${ctx.opportunityNumber ?? ctx.opportunityId}**). It is prepared for lender review only and **does not** constitute approval, sanction, or eligibility.`,
    ``,
    line("Borrower", ctx.companyName ?? ctx.borrowerName),
    line("Facility", `${ctx.productName} — ${amountLabel}`),
    line("Purpose", ctx.purpose?.trim() ? ctx.purpose : CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE),
    line("Location", business.location ?? ctx.city),
    line("Proposed lender (desk)", ctx.lenderName),
    ``,
    evidenceLines.length
      ? [`**Evidence reviewed:**`, ...evidenceLines.map((h) => `- ${h}`)].join("\n")
      : `- **Evidence reviewed:** ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`,
    ``,
    considerations.length
      ? [`**Primary considerations:**`, ...considerations.map((c) => `- ${c}`)].join("\n")
      : null,
    ``,
    `Detailed analysis follows. Outstanding items are listed under Missing / Pending Information.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildBorrowerProfileV3(ctx: ChanakyaCreditProposalContextPack): string {
  const business = ctx.creditIntelligence.businessAnalysis.profile;
  return [
    line("Legal name", ctx.companyName ?? ctx.borrowerName),
    line("Primary contact (name only)", ctx.borrowerName),
    line("Constitution", business.constitution ?? ctx.stated.statedConstitution),
    line("Employment / borrower category", ctx.employmentType),
    line("Location", business.location ?? ctx.city),
    line("Relationship manager", ctx.relationshipManagerName),
    line("Transaction reference", ctx.opportunityNumber),
    line("Transaction type", ctx.transactionType),
  ].join("\n");
}

export function buildBusinessOverviewV3(ctx: ChanakyaCreditProposalContextPack): string {
  const business = ctx.creditIntelligence.businessAnalysis.profile;
  const ci = ctx.creditIntelligence;
  const parts = [
    line("Nature of business", business.businessNature ?? ctx.stated.statedNatureOfBusiness),
    line("Industry / operating profile", business.industry ?? business.operatingProfile),
    line("Business vintage", business.vintage ?? ctx.stated.statedBusinessVintage),
    line("Business model", business.businessModel),
    line("Stated turnover (Credit Workbench)", ctx.stated.statedTurnover),
    ci.gstAnalysis.financialInsightCount > 0
      ? `- **Document-derived turnover:** Refer to GST Analysis for period-wise taxable turnover with return periods.`
      : null,
    ``,
    ctx.rmNote
      ? [
          `**Officer note (user-provided — not document evidence):**`,
          `"${sanitizeLenderFacingText(ctx.rmNote)}"`,
        ].join("\n")
      : null,
  ];
  return parts.filter(Boolean).join("\n");
}

export function buildLoanRequirementV3(ctx: ChanakyaCreditProposalContextPack, amountLabel: string): string {
  return [
    line("Product", ctx.productName),
    line("Requested facility amount", amountLabel),
    line("Currency", "INR"),
    line("Proposed lender (desk)", ctx.lenderName),
  ].join("\n");
}

export function buildFacilityPurposeV3(ctx: ChanakyaCreditProposalContextPack): string {
  const purpose = ctx.purpose?.trim();
  if (!purpose) {
    return [
      `The end-use of funds has **not** been captured on the transaction record reviewed.`,
      ``,
      `Lender verification should confirm purpose alignment with product policy and supporting documentation before proceeding.`,
    ].join("\n");
  }
  return [
    line("Stated purpose", purpose),
    line("Transaction type", ctx.transactionType),
    ``,
    `Purpose is recorded from Opportunity / Credit Workbench data and should be validated against supporting documentation during lender due diligence.`,
  ].join("\n");
}

export function buildFinancialAnalysisV3(input: {
  ctx: ChanakyaCreditProposalContextPack;
  ci: ChanakyaCreditIntelligenceContext;
  synthesis: ChanakyaCreditSynthesisContext;
  gstTrace: GstProposalTraceabilityResult;
}): { body: string; included: boolean } {
  const { ctx, ci, synthesis, gstTrace } = input;
  const finObs = synthesis.financialAssessment;

  const hasFinancialContent =
    ci.financialProfile.availability !== "NOT_AVAILABLE" ||
    Boolean(ctx.stated.statedIncomeMonthly?.trim()) ||
    Boolean(ctx.stated.statedTurnover?.trim());

  if (!hasFinancialContent) {
    return {
      included: false,
      body: `Financial statement facts were not extracted from readable documents. Stated figures from Credit Workbench, if any, appear under Existing Obligations / Credit Context.`,
    };
  }

  const parts: string[] = [];

  if (ci.financialProfile.years.length) {
    const qualityNote =
      ci.financialFactQuality.rejectedCount > 0
        ? `_Note: ${ci.financialFactQuality.rejectedCount} table token(s) excluded where note indices were mis-associated with line amounts._`
        : null;
    if (qualityNote) parts.push(qualityNote, "");
    parts.push(...buildFinancialStatementTable(ci));
  } else {
    parts.push(`- **Document-extracted financials:** ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`);
  }

  const narrative = buildFinancialNarrativeObservations(ci);
  if (narrative.length) {
    parts.push(`**Observations (where period coverage supports comparison):**`, ...narrative, ``);
  }

  if (finObs.liquidityObservation) {
    parts.push(`- **Liquidity:** ${sanitizeLenderFacingText(finObs.liquidityObservation)}`);
  }
  if (finObs.leverageObservation) {
    parts.push(`- **Leverage:** ${sanitizeLenderFacingText(finObs.leverageObservation)}`);
  }
  if (finObs.gstConsistencyObservation) {
    parts.push(`- **GST alignment:** ${sanitizeLenderFacingText(finObs.gstConsistencyObservation)}`);
  } else if (gstTrace.reconciliationLimitation) {
    parts.push(`- **GST alignment:** ${sanitizeLenderFacingText(gstTrace.reconciliationLimitation)}`);
  }

  if (ci.auditorAnalysis.observations.length) {
    parts.push(
      ``,
      `**Auditor observations (from audited financials):**`,
      ...ci.auditorAnalysis.observations.slice(0, 4).map((o) => `- ${sanitizeLenderFacingText(o.observation)}`),
    );
  }

  return { included: true, body: parts.filter(Boolean).join("\n") };
}

function reliableTurnoverRows(
  returns: ChanakyaCreditIntelligenceContext["gstAnalysis"]["returns"],
) {
  return returns.filter((r) => {
    if (!r.taxableTurnover?.trim()) return false;
    const conf = r.provenance.find((p) => p.field === "gst_taxable_turnover")?.confidence ?? "medium";
    return conf !== "ambiguous" && conf !== "low";
  });
}

export function buildGstAnalysisV3(input: {
  ci: ChanakyaCreditIntelligenceContext;
  gstTrace: GstProposalTraceabilityResult;
}): { body: string; included: boolean } {
  const { ci, gstTrace } = input;
  const gst = ci.gstAnalysis;

  if (gst.availability === "NOT_AVAILABLE" || gst.returns.length === 0) {
    return { included: false, body: "" };
  }

  const lines: string[] = [
    `GST return evidence from readable GSTR documents. Figures are period-wise — not summed into an invented annual aggregate.`,
    ``,
  ];

  if (gst.identity.gstin) {
    lines.push(
      `- **GSTIN:** ${gst.identity.gstin} (corroborated across ${gst.identity.corroborationDocumentCount} return document(s))`,
    );
  } else {
    lines.push(`- **GSTIN:** ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`);
  }

  lines.push("", "**Taxable turnover by return period:**", "");

  const turnoverRows = reliableTurnoverRows(gst.returns);
  if (turnoverRows.length) {
    lines.push("| Return period | Taxable turnover (INR) |", "| --- | ---: |");
    for (const r of turnoverRows) {
      const period = r.returnPeriod?.trim() || "Period not stated";
      lines.push(`| ${period} | ${r.taxableTurnover} |`);
    }
  } else {
    lines.push(`- ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`);
  }

  lines.push("");
  lines.push("**Reported turnover (financial statements):**");
  const revenueFacts = ci.financialProfile.allFacts.filter(
    (f) => f.field === "revenue" && f.provenance.confidence !== "ambiguous",
  );
  if (revenueFacts.length) {
    for (const f of revenueFacts.slice(-3)) {
      lines.push(
        `- **${f.financialYear || "Period not stated"}:** ${f.label} — ₹${f.value}${f.unit ? ` ${f.unit}` : ""}`,
      );
    }
  } else {
    lines.push(`- ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`);
  }

  if (gstTrace.reconciliationLimitation) {
    lines.push("", `**Reconciliation note:** ${sanitizeLenderFacingText(gstTrace.reconciliationLimitation)}`);
  }

  return { included: true, body: lines.join("\n") };
}

export function buildBankingAnalysisV3(ci: ChanakyaCreditIntelligenceContext): string {
  const banking = ci.bankingAnalysis;

  if (banking.availability === "NOT_AVAILABLE") {
    const metadataOnly = banking.documentInventory.filter(
      (d) =>
        d.availabilityState === "metadata_only" ||
        d.availabilityState === "binary_unavailable",
    );
    const onFile = banking.documentInventory.length;

    return [
      `**Banking evidence status:** Transaction-level banking analysis **could not be performed** because readable bank statement content was not available.`,
      ``,
      onFile > 0
        ? `- **Bank statements on file:** ${onFile} document(s) identified; ${metadataOnly.length} without readable transaction content.`
        : `- **Bank statements on file:** None identified in the document set reviewed.`,
      ``,
      `This reflects **document readability limitations**, not adverse banking conduct or confirmed negative account performance. Lenders should obtain readable statements for independent banking assessment.`,
      ``,
      sanitizeLenderFacingText(banking.limitation ?? CHANAKYA_LENDER_PROPOSAL_BANKING_LIMITATION),
    ].join("\n");
  }

  const parts: string[] = [
    `**Banking evidence status:** Readable bank statement content was reviewed.`,
    ``,
  ];

  if (banking.accounts.length) {
    parts.push(`**Account summary:**`);
    for (const ac of banking.accounts.slice(0, 4)) {
      parts.push(
        `- **${ac.bankName ?? "Bank"}** (${ac.accountType ?? "account"}) — period: ${ac.statementPeriod ?? "n/a"}`,
      );
      if (ac.openingBalance) parts.push(`  - Opening balance: ${ac.openingBalance}`);
      if (ac.closingBalance) parts.push(`  - Closing balance: ${ac.closingBalance}`);
      if (ac.totalCredits) parts.push(`  - Total credits: ${ac.totalCredits}`);
      if (ac.totalDebits) parts.push(`  - Total debits: ${ac.totalDebits}`);
    }
    parts.push("");
  }

  const agg = banking.aggregate;
  if (agg.totalCredits || agg.totalDebits || agg.averageBalance) {
    parts.push(`**Aggregate indicators:**`);
    if (agg.totalCredits) parts.push(`- Total credits: ${agg.totalCredits}`);
    if (agg.totalDebits) parts.push(`- Total debits: ${agg.totalDebits}`);
    if (agg.averageBalance) parts.push(`- Average balance: ${agg.averageBalance}`);
    if (agg.emiIndicators.length) {
      parts.push(`- EMI indicators: ${agg.emiIndicators.join("; ")}`);
    }
    if (agg.chequeReturnIndicators.length) {
      parts.push(`- Cheque return indicators: ${agg.chequeReturnIndicators.join("; ")}`);
    }
    parts.push("");
  }

  const bvt = banking.bankVsTurnover;
  if (bvt.availability !== "NOT_AVAILABLE" && bvt.explanation) {
    parts.push(`**Bank credits vs turnover:** ${sanitizeLenderFacingText(bvt.explanation)}`);
  }

  return parts.join("\n");
}

export function buildCreditContextV3(input: {
  ctx: ChanakyaCreditProposalContextPack;
  ci: ChanakyaCreditIntelligenceContext;
  synthesis: ChanakyaCreditSynthesisContext;
}): string {
  const { ctx, ci, synthesis } = input;
  const parts: string[] = [
    `**Stated obligations and verification (Credit Workbench — user-entered):**`,
    line("Stated monthly income", ctx.stated.statedIncomeMonthly),
    line("Stated existing obligations / EMIs", ctx.stated.statedObligations),
    line("Stated turnover", ctx.stated.statedTurnover),
    ``,
    `- **Credit ratios (FOIR / DSCR / LTV):** ${CHANAKYA_LENDER_PROPOSAL_RATIO_LIMITATION}`,
  ];

  if (ci.reconciliation.rows.length) {
    parts.push(``, `**Cross-source reconciliation:**`);
    for (const row of ci.reconciliation.rows.slice(0, 5)) {
      parts.push(`- ${sanitizeLenderFacingText(row.explanation)}`);
    }
  }

  if (synthesis.financialAssessment.bankingObservation && ci.bankingAnalysis.availability !== "NOT_AVAILABLE") {
    parts.push(
      ``,
      `- **Banking context:** ${sanitizeLenderFacingText(synthesis.financialAssessment.bankingObservation)}`,
    );
  }

  return parts.join("\n");
}

export function buildPropertySecurityV3(input: {
  ctx: ChanakyaCreditProposalContextPack;
  ci: ChanakyaCreditIntelligenceContext;
  hasPropertyContext: boolean;
}): { body: string; included: boolean } {
  const { ctx, ci, hasPropertyContext } = input;

  if (!hasPropertyContext) {
    return {
      included: true,
      body: [
        `Property or collateral details were **not** available in the transaction record or document set reviewed for this draft.`,
        ``,
        `If security is contemplated, lenders should confirm property type, valuation, ownership, and charge status through independent verification.`,
      ].join("\n"),
    };
  }

  return {
    included: true,
    body: [
      line("Property type", ctx.stated.statedPropertyType ?? ci.propertyAnalysis.propertyType),
      line("Stated property value", ctx.stated.statedPropertyValue ?? ci.propertyAnalysis.statedValue),
      line("Property location", ctx.stated.statedPropertyLocation ?? ci.propertyAnalysis.location),
      line("Existing charge (stated)", ci.propertyAnalysis.existingCharge),
      line("Proposed security (stated)", ci.propertyAnalysis.proposedSecurity),
      ``,
      ci.propertyAnalysis.valuationDocumentAvailable
        ? `- Valuation document on file (presence noted — content subject to independent review).`
        : `- Valuation report: ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`,
    ].join("\n"),
  };
}

export function buildProductLenderContextV3(input: {
  ctx: ChanakyaCreditProposalContextPack;
  pli: ChanakyaProductLenderIntelligenceContext | null;
  assigned: ChanakyaLenderFitAssessment | null;
}): string {
  const { ctx, pli, assigned } = input;
  const programLines = formatProgramParameterLines(assigned?.programParameters ?? null);

  const parts: string[] = [
    line("Product", ctx.productName),
    line("Assigned / proposed lender", ctx.lenderName ?? assigned?.lenderName),
  ];

  if (assigned) {
    parts.push(
      line("Lender code", assigned.lenderCode),
      line("Deal stage (assigned lender)", assigned.currentStage),
    );
    const fitReason = assigned.reasons?.[0]?.statement;
    if (fitReason?.trim()) {
      parts.push(`- **Lender context:** ${sanitizeLenderFacingText(fitReason)}`);
    }
  }

  if (pli?.matrixDepth) {
    const depth = pli.matrixDepth;
    parts.push(
      ``,
      `**Product–lender matrix depth:** ${depth.status.replace(/_/g, " ")}`,
    );
    if (depth.statement?.trim()) {
      parts.push(`- ${sanitizeLenderFacingText(depth.statement)}`);
    }
    if (depth.limitations?.length) {
      for (const lim of depth.limitations.slice(0, 3)) {
        parts.push(`- ${sanitizeLenderFacingText(lim)}`);
      }
    }
  }

  if (pli?.availability === "AVAILABLE" && pli.lenderFit?.length) {
    parts.push(``, `**Product–lender matrix context (evidence-first):**`);
    for (const fit of pli.lenderFit.slice(0, 4)) {
      const status = fit.fitStatus.replace(/_/g, " ");
      parts.push(`- ${fit.lenderName ?? fit.lenderCode ?? "Lender"}: ${status}`);
    }
  }

  if (programLines.length) {
    parts.push(``, `**Persisted program parameters (where available):**`, ...programLines);
  } else {
    parts.push(``, `- **Program parameters:** ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`);
  }

  parts.push(
    ``,
    `Program parameters and lender fit observations are informational only and do not constitute eligibility, approval, or a recommendation to proceed.`,
  );

  return parts.join("\n");
}

export function buildProposedFacilityV3(input: {
  ctx: ChanakyaCreditProposalContextPack;
  assigned: ChanakyaLenderFitAssessment | null;
  amountLabel: string;
}): string {
  const { ctx, assigned, amountLabel } = input;
  const programLines = formatProgramParameterLines(assigned?.programParameters ?? null);
  const purposeLine = ctx.purpose?.trim()
    ? line("Purpose", ctx.purpose)
    : `- **Purpose:** ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`;

  return [
    line("Product", ctx.productName),
    line("Proposed facility amount", amountLabel),
    purposeLine,
    line("Proposed lender", ctx.lenderName ?? assigned?.lenderName),
    ``,
    programLines.length
      ? [`**Indicative program parameters:**`, ...programLines].join("\n")
      : `- **Indicative program parameters:** ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`,
    ``,
    `- **Tenure / pricing / LTV / FOIR:** Populated above only where persisted program data exists; otherwise subject to lender policy and field verification.`,
  ].join("\n");
}

export function buildKeyPositivesV3(synthesis: ChanakyaCreditSynthesisContext): string {
  const items = synthesis.keyPositives
    .slice(0, 8)
    .map((p) => `- ${sanitizeLenderFacingText(p.statement)}`)
    .filter((s) => assertLenderLanguage(s));
  return items.length ? items.join("\n") : `- ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`;
}

export function buildKeyConcernsV3(synthesis: ChanakyaCreditSynthesisContext): string {
  const items = synthesis.rankedConcerns
    .slice(0, 8)
    .map((c) => `- ${sanitizeLenderFacingText(c.statement)}`)
    .filter((s) => assertLenderLanguage(s));
  return items.length ? items.join("\n") : `- ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`;
}

export function buildMitigantsV3(synthesis: ChanakyaCreditSynthesisContext): string {
  const items = synthesis.mitigants
    .slice(0, 6)
    .map((m) => `- ${sanitizeLenderFacingText(m.statement)}`)
    .filter((s) => assertLenderLanguage(s));
  return items.length ? items.join("\n") : `- ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`;
}

export function buildPendingInformationV3(input: {
  ctx: ChanakyaCreditProposalContextPack;
  ci: ChanakyaCreditIntelligenceContext;
  lenderLimitations: string[];
}): string {
  const { ctx, ci, lenderLimitations } = input;
  const di = ctx.documentIntelligence;
  const pending: string[] = [];

  if (!ctx.purpose?.trim()) {
    pending.push("End-use of funds — confirm and document with borrower (not captured on transaction record).");
  }

  if (ci.bankingAnalysis.availability === "NOT_AVAILABLE") {
    pending.push(
      "Readable bank statements (last 12 months) required for transaction-level banking assessment.",
    );
  }

  if (di.documentsRequiringOcr > 0) {
    pending.push(
      `${di.documentsRequiringOcr} scanned document(s) require OCR before financial content can be reviewed.`,
    );
  }

  if (ci.financialProfile.availability === "NOT_AVAILABLE") {
    pending.push("FY2024-25 audited P&L and Balance Sheet required (readable PDF).");
  } else if (ci.financialProfile.years.length) {
    const latest = ci.financialProfile.years[ci.financialProfile.years.length - 1]!;
    const nextFy = inferNextFinancialYear(latest);
    if (nextFy) {
      pending.push(`${nextFy} audited financial statements required if not yet on file.`);
    }
  }

  if (ci.reconciliation.gstVsFinancials.status === "VARIANCE_IDENTIFIED") {
    pending.push("Reconcile GST taxable turnover with financial statement revenue for aligned periods.");
  }

  if (ci.financialFactQuality.downgradedCount > 0 || ci.financialFactQuality.rejectedCount > 0) {
    pending.push(
      `${ci.financialFactQuality.rejectedCount} financial table token(s) excluded — re-upload clear audited statements if key line items are missing.`,
    );
  }

  if (ci.auditorAnalysis.observations.length) {
    pending.push("Review auditor qualifications and management representations in audited financials.");
  }

  const uniqueLimitations = [...new Set(lenderLimitations.map((l) => l.trim()).filter(Boolean))];

  const parts: string[] = [];
  if (pending.length) {
    parts.push(`**Outstanding verification items:**`, ...pending.map((p) => `- ${p}`), ``);
  }
  if (uniqueLimitations.length) {
    parts.push(`**Analytical limitations (single disclosure):**`, ...uniqueLimitations.map((l) => `- ${l}`));
  }
  if (!parts.length) {
    parts.push(`No material pending items identified beyond standard lender KYC, bureau, and field verification.`);
  }

  return parts.join("\n");
}

export type LenderProposalInternalProvenanceRow = {
  field: string;
  source: string;
  documentId?: string;
  period?: string | null;
  unit?: string | null;
  confidence?: string;
  extractionMethod?: string;
};

export function buildInternalProvenanceV3(
  ci: ChanakyaCreditIntelligenceContext,
  gstTrace: GstProposalTraceabilityResult,
): LenderProposalInternalProvenanceRow[] {
  const rows: LenderProposalInternalProvenanceRow[] = [];

  for (const trace of collectVerifiedFinancialTraces(ci).slice(0, 48)) {
    rows.push({
      field: trace.field,
      source: trace.documentName,
      documentId: trace.documentId,
      period: trace.period,
      unit: trace.unit,
      confidence: trace.confidence,
      extractionMethod: trace.extractionMethod,
    });
  }

  for (const f of ci.gstAnalysis.materialFacts.filter((m) => m.lenderFacingEligible).slice(0, 36)) {
    rows.push({
      field: `gst:${f.field}`,
      source: f.documentName,
      documentId: f.documentId,
      period: f.returnPeriod,
      unit: f.unit,
      confidence: f.confidence,
      extractionMethod: f.extractionMethod,
    });
  }

  for (const p of gstTrace.provenance.slice(0, 24)) {
    if (rows.some((r) => r.field === `gst:${p.field}` && r.period === p.returnPeriod)) continue;
    rows.push({
      field: `gst:${p.field}`,
      source: p.documentName,
      documentId: p.documentId,
      period: p.returnPeriod,
      unit: p.unit,
      confidence: p.confidence,
      extractionMethod: p.extractionMethod,
    });
  }

  return rows;
}

export function buildEvidenceNotesV3(input: {
  ctx: ChanakyaCreditProposalContextPack;
  ci: ChanakyaCreditIntelligenceContext;
  internalProvenance: LenderProposalInternalProvenanceRow[];
  gstTrace: GstProposalTraceabilityResult;
}): string {
  const { ctx, ci, internalProvenance, gstTrace } = input;
  const di = ctx.documentIntelligence;

  const contributing = di.reads.filter(
    (r) =>
      (r.status === "content_read" || r.status === "content_read_partial") && r.textCharCount > 0,
  );

  const parts: string[] = [
    `This section records source traceability for the draft. It supports audit and does not replace lender due diligence.`,
    ``,
    `- **Documents reviewed:** ${di.documentsReviewed}`,
    `- **Documents with readable content:** ${contributing.length}`,
    `- **Structured facts extracted:** ${di.structuredFacts.length}`,
    ``,
    `**Primary source documents:**`,
    ...(contributing.length
      ? contributing.slice(0, 12).map((r) => `- ${r.displayName} (${r.status})`)
      : [`- ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`]),
  ];

  if (internalProvenance.length) {
    parts.push(``, `**Financial & GST fact traceability:**`);
    for (const p of internalProvenance.slice(0, 48)) {
      const meta = [
        p.period ? `period ${p.period}` : null,
        p.unit ? `unit ${p.unit}` : null,
        p.confidence ? `confidence ${p.confidence}` : null,
      ]
        .filter(Boolean)
        .join("; ");
      parts.push(
        `- ${p.field}: ${p.source}${p.documentId ? ` [${p.documentId}]` : ""}${meta ? ` (${meta})` : ""}`,
      );
    }
  }

  if (gstTrace.sampleValues.length) {
    parts.push(``, `**GST turnover samples:**`);
    for (const s of gstTrace.sampleValues.slice(0, 12)) {
      parts.push(`- ${s.period}: ${s.value}`);
    }
  }

  if (ci.financialFactQuality.limitations.length) {
    parts.push(``, `**Quality notes:**`, ...ci.financialFactQuality.limitations.map((l) => `- ${l}`));
  }

  return parts.join("\n");
}

export function buildAdvisoryRecommendationV3(input: {
  synthesis: ChanakyaCreditSynthesisContext;
  hasPendingGaps: boolean;
}): string {
  const { synthesis, hasPendingGaps } = input;
  const posture = synthesis.advisoryAssessment.state.replace(/_/g, " ").toLowerCase();

  return [
    `**Advisory recommendation:** Based on the information reviewed, the transaction **may be considered subject to lender policy and verification**. Credit assessment remains subject to lender review. This is not a credit decision, sanction, or guarantee of facility.`,
    ``,
    hasPendingGaps
      ? `**Further information is required** before lender submission — see Missing / Pending Information.`
      : `No material documentation gaps were identified beyond standard lender KYC and field verification.`,
    ``,
    `- **Evidence posture:** ${posture}`,
    ``,
    `Suggested progression:`,
    `1. Review this memorandum against source documents and transaction records.`,
    `2. Address items listed under Missing / Pending Information.`,
    `3. Re-generate after material document or workbench updates.`,
    `4. Lender submission remains a separate explicit business action.`,
  ].join("\n");
}

export { collectVerifiedFinancialTraces };
