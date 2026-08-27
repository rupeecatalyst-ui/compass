/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-015 — Credit synthesis core (verify-friendly).
 * Composes existing SSOT outputs — never an underwriting approval engine.
 */

import type {
  ChanakyaCreditAssessmentState,
  ChanakyaCreditEvidenceItem,
  ChanakyaCreditFactProvenance,
  ChanakyaCreditIntelligenceContext,
  ChanakyaCreditSectionAvailability,
} from "@/types/chanakya-credit-intelligence";
import type {
  ChanakyaCreditConcernSeverity,
  ChanakyaCreditFinancialAssessmentObservations,
  ChanakyaCreditProfileSection,
  ChanakyaCreditRankedConcern,
  ChanakyaCreditSynthesisAdvisory,
  ChanakyaCreditSynthesisAdvisoryState,
  ChanakyaCreditSynthesisContext,
  ChanakyaCreditSynthesisInput,
} from "@/types/chanakya-credit-synthesis";
import {
  assertNoForbiddenCreditLanguage,
} from "./credit-intelligence-core";

const FORBIDDEN_SYNTHESIS =
  /\b(APPROVED|SANCTIONED|ELIGIBLE|GUARANTEED|BEST_LENDER)\b/i;

const RATIO_TERM = /\b(FOIR|DSCR|LTV)\b/i;
const RATIO_NEGATION =
  /not computed|NOT_AVAILABLE|require an approved|never invent|remain NOT_AVAILABLE/i;

export function assertNoForbiddenSynthesisLanguage(text: string): boolean {
  const normalized = text
    .replace(/approved underwriting engine/gi, "UNDERWRITING_ENGINE_DISCLAIMER")
    .replace(/approved SSOT/gi, "SSOT_DISCLAIMER")
    .replace(/approved engine/gi, "ENGINE_DISCLAIMER");
  if (!assertNoForbiddenCreditLanguage(normalized)) return false;
  if (FORBIDDEN_SYNTHESIS.test(normalized)) return false;
  if (RATIO_TERM.test(normalized) && !RATIO_NEGATION.test(normalized)) return false;
  return true;
}

function profileSection(
  availability: ChanakyaCreditSectionAvailability,
  summary: string,
  highlights: string[],
  provenance: string[],
): ChanakyaCreditProfileSection {
  return { availability, summary, highlights, provenance };
}

function trendObservation(
  ci: ChanakyaCreditIntelligenceContext,
  metric: string,
): string | null {
  const trend = ci.financialTrends.metrics.find((m) => m.metric === metric);
  if (!trend?.available || !trend.interpretation) return null;
  return trend.interpretation;
}

export function buildFinancialAssessmentObservations(
  ci: ChanakyaCreditIntelligenceContext,
): ChanakyaCreditFinancialAssessmentObservations {
  const prov: ChanakyaCreditFactProvenance[] = ci.financialProfile.allFacts.map(
    (f) => f.provenance,
  );

  let leverageObservation: string | null = null;
  const borrowTrend = ci.financialTrends.metrics.find((m) => m.metric === "borrowings");
  if (borrowTrend?.available && borrowTrend.direction !== "NOT_AVAILABLE") {
    leverageObservation =
      borrowTrend.interpretation ??
      `Borrowings trend direction: ${borrowTrend.direction} (${borrowTrend.period ?? "period n/a"}).`;
  }

  let liquidityObservation: string | null = null;
  const latestYear = ci.financialProfile.years.at(-1);
  if (latestYear) {
    const yearFacts = ci.financialProfile.factsByYear[latestYear] ?? [];
    const ca = yearFacts.find((f) => f.field === "current_assets");
    const cl = yearFacts.find((f) => f.field === "current_liabilities");
    if (ca && cl) {
      liquidityObservation =
        "Current assets and current liabilities are both present in extracted financials — detailed liquidity ratio not computed (no configured SSOT ratio engine).";
      prov.push(ca.provenance, cl.provenance);
    } else if (ca || cl) {
      liquidityObservation =
        "Partial current asset/liability evidence extracted — liquidity position cannot be fully observed.";
    }
  }

  let bankingObservation: string | null = null;
  if (ci.bankingAnalysis.availability === "AVAILABLE") {
    bankingObservation = "Readable bank statement evidence supports banking review.";
  } else if (ci.bankingAnalysis.limitation) {
    bankingObservation = ci.bankingAnalysis.limitation;
  }

  let gstConsistencyObservation: string | null =
    ci.reconciliation.gstVsFinancials.explanation;
  if (ci.reconciliation.bankVsTurnover.availability !== "NOT_AVAILABLE") {
    gstConsistencyObservation = [
      gstConsistencyObservation,
      ci.reconciliation.bankVsTurnover.explanation,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const hasAny =
    ci.financialTrends.availability !== "NOT_AVAILABLE" ||
    ci.bankingAnalysis.availability !== "NOT_AVAILABLE" ||
    ci.gstAnalysis.availability !== "NOT_AVAILABLE";

  return {
    availability: hasAny ? ci.financialTrends.availability : "NOT_AVAILABLE",
    revenueTrend: trendObservation(ci, "revenue"),
    profitabilityTrend: trendObservation(ci, "pat"),
    netWorthTrend: trendObservation(ci, "net_worth"),
    leverageObservation,
    liquidityObservation,
    bankingObservation,
    gstConsistencyObservation,
    provenance: prov.slice(0, 12),
  };
}

export function rankCreditConcerns(input: {
  concerns: ChanakyaCreditEvidenceItem[];
  creditIntelligence: ChanakyaCreditIntelligenceContext;
  metadataOnlyBankStatements?: number;
}): ChanakyaCreditRankedConcern[] {
  const ranked: ChanakyaCreditRankedConcern[] = [];

  for (const c of input.concerns) {
    let severity: ChanakyaCreditConcernSeverity = "medium";

    if (/qualified|going concern|adverse|inconsistent/i.test(c.statement)) {
      severity = "critical";
    } else if (
      c.id === "con:gst_financial_variance" ||
      /variance|inconsistent|metadata-only|NOT_AVAILABLE/i.test(c.statement)
    ) {
      severity = "high";
    } else if (
      c.id === "con:ocr_required" ||
      c.id === "limit:single_year_financials" ||
      /require OCR|single financial year/i.test(c.statement)
    ) {
      severity = "medium";
    } else if (/decline|borrowings increased|receivables increased/i.test(c.statement)) {
      severity = "medium";
    }

    ranked.push({
      id: `ranked:${c.id}`,
      severity,
      statement: c.statement,
      evidence: c.evidence,
      provenance: c.provenance,
      sourceConcernId: c.id,
    });
  }

  if (input.creditIntelligence.financialProfile.availability === "NOT_AVAILABLE") {
    ranked.push({
      id: "gap:financials",
      severity: "information_gap",
      statement: "Structured financial statement evidence is not available.",
      evidence: ["No extracted P&L / Balance Sheet facts"],
      provenance: [],
      sourceConcernId: "gap:financials",
    });
  }

  if (input.creditIntelligence.bankingAnalysis.availability === "NOT_AVAILABLE") {
    ranked.push({
      id: "gap:banking",
      severity: "information_gap",
      statement:
        input.metadataOnlyBankStatements && input.metadataOnlyBankStatements > 0
          ? `${input.metadataOnlyBankStatements} bank statement(s) exist as metadata-only — readable banking evidence unavailable.`
          : "Readable bank statement evidence is not available.",
      evidence: [input.creditIntelligence.bankingAnalysis.limitation ?? "Banking NOT_AVAILABLE"],
      provenance: [],
      sourceConcernId: "gap:banking",
    });
  }

  if (input.creditIntelligence.gstAnalysis.availability === "NOT_AVAILABLE") {
    ranked.push({
      id: "gap:gst",
      severity: "information_gap",
      statement: "GST return evidence is not available for turnover corroboration.",
      evidence: ["No GSTR facts extracted"],
      provenance: [],
      sourceConcernId: "gap:gst",
    });
  }

  const order: Record<ChanakyaCreditConcernSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    information_gap: 3,
  };

  return ranked
    .filter((r) => assertNoForbiddenSynthesisLanguage(r.statement))
    .sort((a, b) => order[a.severity] - order[b.severity]);
}

export function mapSynthesisAdvisory(input: {
  creditIntelligence: ChanakyaCreditIntelligenceContext;
  rankedConcerns: ChanakyaCreditRankedConcern[];
}): ChanakyaCreditSynthesisAdvisory {
  const assessment = input.creditIntelligence.creditAssessment.overallAssessment;
  let state: ChanakyaCreditSynthesisAdvisoryState = "INSUFFICIENT_EVIDENCE";

  const mapped = mapAssessmentStateToAdvisory(assessment.state);
  state = mapped;

  const critical = input.rankedConcerns.filter((c) => c.severity === "critical").length;
  const high = input.rankedConcerns.filter((c) => c.severity === "high").length;
  const gaps = input.rankedConcerns.filter((c) => c.severity === "information_gap").length;

  if (critical > 0 || high > 0) {
    state = "CAUTION";
  } else if (
    input.creditIntelligence.availability === "NOT_AVAILABLE" &&
    input.creditIntelligence.keyPositives.length === 0
  ) {
    state = "INSUFFICIENT_EVIDENCE";
  } else if (mapped === "POSITIVE" && gaps > 2) {
    state = "CAUTION";
  }

  const summary =
    state === "POSITIVE"
      ? "Available evidence supports a generally positive internal advisory view — not a sanction or approval."
      : state === "CAUTION"
        ? "Evidence includes cautionary signals or material gaps — internal review recommended. Not an approval decision."
        : "Insufficient extracted evidence for a confident internal advisory view — additional documents and clarification required.";

  return {
    state,
    summary,
    provenance: [
      "credit_intelligence.creditAssessment",
      "credit_synthesis.rankedConcerns",
    ],
  };
}

function mapAssessmentStateToAdvisory(
  state: ChanakyaCreditAssessmentState,
): ChanakyaCreditSynthesisAdvisoryState {
  if (state === "POSITIVE" || state === "GENERALLY_POSITIVE") return "POSITIVE";
  if (state === "CAUTION" || state === "MIXED") return "CAUTION";
  return "INSUFFICIENT_EVIDENCE";
}

export function buildCreditProfileSections(
  input: ChanakyaCreditSynthesisInput,
): ChanakyaCreditSynthesisContext["creditProfile"] {
  const ci = input.creditIntelligence;
  const doc = input.documentSummary;

  return {
    borrowerProfile: profileSection(
      input.borrowerLabel ? "AVAILABLE" : "PARTIAL",
      input.borrowerLabel
        ? `Borrower on record: ${input.borrowerLabel}.`
        : "Borrower identity partially captured on Opportunity record.",
      input.borrowerLabel ? [input.borrowerLabel] : [],
      ["opportunity_registry"],
    ),
    transactionRequirement: profileSection(
      input.requestedAmount || input.productLabel ? "AVAILABLE" : "NOT_AVAILABLE",
      [
        input.productLabel ? `Product: ${input.productLabel}` : null,
        input.requestedAmount
          ? `Requested amount: ₹ ${input.requestedAmount.toLocaleString("en-IN")}`
          : null,
        input.transactionType ? `Transaction type: ${input.transactionType}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Transaction requirement not fully captured.",
      [
        input.productLabel,
        input.requestedAmount ? String(input.requestedAmount) : null,
        input.transactionType,
      ].filter((x): x is string => Boolean(x)),
      ["opportunity_registry", "credit_workbench_stated"],
    ),
    businessProfile: profileSection(
      ci.businessAnalysis.availability,
      ci.businessAnalysis.profile.operatingProfile ??
        "Business profile derived from stated fields and document hints.",
      [
        ci.businessAnalysis.profile.businessNature,
        ci.businessAnalysis.profile.constitution,
        ci.businessAnalysis.profile.vintage,
        ci.businessAnalysis.profile.location,
      ].filter((x): x is string => Boolean(x)),
      ci.businessAnalysis.profile.provenance,
    ),
    financialProfile: profileSection(
      ci.financialProfile.availability,
      ci.financialProfile.years.length
        ? `Financial years with extracted facts: ${ci.financialProfile.years.join(", ")}.`
        : "No structured financial statement facts extracted.",
      ci.financialProfile.allFacts.slice(0, 6).map((f) => `${f.label}: ${f.value}`),
      ["chanakya_document_intelligence", "credit_intelligence.financialProfile"],
    ),
    bankingProfile: profileSection(
      ci.bankingAnalysis.availability,
      ci.bankingAnalysis.limitation ??
        (ci.bankingAnalysis.accounts.length
          ? `${ci.bankingAnalysis.accounts.length} bank account summary(ies) from readable statements.`
          : "Banking profile not available."),
      ci.bankingAnalysis.documentInventory.map(
        (d) => `${d.documentName} (${d.availabilityState})`,
      ),
      ["credit_intelligence.bankingAnalysis"],
    ),
    gstProfile: profileSection(
      ci.gstAnalysis.availability,
      ci.gstAnalysis.returns.length
        ? `${ci.gstAnalysis.returns.length} GST return row(s) extracted.`
        : "GST profile not available from documents.",
      ci.gstAnalysis.returns
        .slice(0, 4)
        .map((r) => `${r.returnPeriod ?? "period n/a"}: ${r.taxableTurnover ?? "—"}`),
      ["credit_intelligence.gstAnalysis"],
    ),
    propertySecurityProfile: profileSection(
      ci.propertyAnalysis.availability,
      ci.propertyAnalysis.statedValue
        ? `Stated security value: ${ci.propertyAnalysis.statedValue}.`
        : "Property/security profile limited or not stated.",
      ci.propertyAnalysis.documentsAvailable,
      ci.propertyAnalysis.provenance,
    ),
    commercialAccountingProfile: profileSection(
      input.commercialSummary ? "PARTIAL" : "NOT_AVAILABLE",
      input.commercialSummary ?? "Commercial / accounting intelligence not supplied to this synthesis run.",
      input.commercialSummary ? [input.commercialSummary] : [],
      ["commercial_accounting_intelligence"],
    ),
    documentCompleteness: profileSection(
      doc ? (doc.documentsWithReadableText > 0 ? "PARTIAL" : "NOT_AVAILABLE") : "NOT_AVAILABLE",
      doc
        ? `${doc.documentsWithReadableText}/${doc.documentsReviewed} documents content-read; ${doc.documentsRequiringOcr} require OCR; ${doc.structuredFactCount} structured fact(s).`
        : "Document completeness summary not supplied.",
      doc
        ? [
            `Readable: ${doc.documentsWithReadableText}`,
            `OCR required: ${doc.documentsRequiringOcr}`,
            `Facts: ${doc.structuredFactCount}`,
          ]
        : [],
      ["chanakya_document_intelligence"],
    ),
    changeAttentionContext: profileSection(
      input.attentionSummary || input.changeSummary ? "PARTIAL" : "NOT_AVAILABLE",
      [input.attentionSummary, input.changeSummary].filter(Boolean).join(" ") ||
        "Change / attention context not supplied to this synthesis run.",
      [input.attentionSummary, input.changeSummary].filter((x): x is string => Boolean(x)),
      ["attention_intelligence", "change_intelligence"],
    ),
  };
}

export function composeCreditSynthesis(
  input: ChanakyaCreditSynthesisInput,
): ChanakyaCreditSynthesisContext {
  const ci = input.creditIntelligence;
  const rankedConcerns = rankCreditConcerns({
    concerns: ci.keyConcerns,
    creditIntelligence: ci,
    metadataOnlyBankStatements: input.documentSummary?.metadataOnlyBankStatements,
  });
  const advisoryAssessment = mapSynthesisAdvisory({
    creditIntelligence: ci,
    rankedConcerns,
  });
  const financialAssessment = buildFinancialAssessmentObservations(ci);
  const creditProfile = buildCreditProfileSections(input);

  const limitations = [
    ...(input.limitations ?? []),
    "Credit synthesis is internal-only and evidence-first — not lender-facing and not an approval engine.",
    "FOIR / DSCR / LTV / eligibility ratios are not computed — creditRatios remain NOT_AVAILABLE.",
    ci.creditRatios.note,
  ];

  return {
    readOnly: true,
    internalOnly: true,
    opportunityId: input.opportunityId,
    opportunityNumber: input.opportunityNumber ?? null,
    compiledAt: new Date().toISOString(),
    creditProfile,
    financialAssessment,
    reconciliation: ci.reconciliation,
    keyPositives: ci.keyPositives.filter((p) => assertNoForbiddenSynthesisLanguage(p.statement)),
    rankedConcerns,
    mitigants: ci.mitigants.filter((m) => assertNoForbiddenSynthesisLanguage(m.statement)),
    internalRecommendations: ci.internalRecommendations,
    advisoryAssessment,
    sourceCreditIntelligence: {
      availability: ci.availability,
      financialProfile: ci.financialProfile,
      financialTrends: ci.financialTrends,
      bankingAnalysis: ci.bankingAnalysis,
      gstAnalysis: ci.gstAnalysis,
      creditRatios: ci.creditRatios,
    },
    limitations,
    provenance: [
      "chanakya_credit_intelligence",
      "chanakya_document_intelligence",
      "opportunity_registry",
      "attention_intelligence",
      "change_intelligence",
      "commercial_accounting_intelligence",
    ],
  };
}
