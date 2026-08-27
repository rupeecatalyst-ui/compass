/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-010 — Credit intelligence core (verify-friendly).
 * Deterministic · evidence-first · never invents financial numbers.
 */

import type {
  ChanakyaCrossDocumentComparison,
  ChanakyaDocumentContentReadResult,
  ChanakyaDocumentExtractedFact,
} from "@/types/chanakya-document-intelligence";
import type {
  ChanakyaCreditAssessment,
  ChanakyaCreditAssessmentSection,
  ChanakyaCreditAssessmentState,
  ChanakyaCreditBankAccountSummary,
  ChanakyaCreditBankingAnalysis,
  ChanakyaCreditBankVsTurnoverReconciliation,
  ChanakyaCreditBusinessAnalysis,
  ChanakyaCreditChartSeries,
  ChanakyaCreditEvidenceItem,
  ChanakyaCreditExternalResearch,
  ChanakyaCreditFinancialFact,
  ChanakyaCreditFinancialProfile,
  ChanakyaCreditFinancialTrends,
  ChanakyaCreditGstAnalysis,
  ChanakyaCreditGstReturnSummary,
  ChanakyaCreditGstVsFinancials,
  ChanakyaCreditGstFieldCategory,
  ChanakyaCreditGstMaterialFact,
  ChanakyaCreditGstIdentitySummary,
  ChanakyaCreditIntelligenceContext,
  ChanakyaCreditInternalRecommendation,
  ChanakyaCreditMetricTrend,
  ChanakyaCreditPropertyAnalysis,
  ChanakyaCreditRatios,
  ChanakyaCreditReconciliation,
  ChanakyaCreditReconciliationRow,
  ChanakyaCreditReconciliationStatus,
  ChanakyaCreditSectionAvailability,
  ChanakyaCreditTrendDirection,
  ChanakyaCreditAuditorAnalysis,
  ChanakyaCreditAuditorObservation,
  ChanakyaCreditFactProvenance,
} from "@/types/chanakya-credit-intelligence";
import type { StatedCreditWorkbenchInput } from "@/lib/chanakya-enterprise-read-context/product-lender-intelligence-core";
import {
  buildFinancialFactQuality,
  isReliableForFinancialIntelligence,
  isReliableForTrendComputation,
} from "./financial-fact-quality-core";

const PNL_KEYS = new Set([
  "revenue",
  "gross_profit",
  "ebitda",
  "depreciation",
  "ebit",
  "interest",
  "pbt",
  "tax",
  "pat",
  "other_income",
]);

const BS_KEYS = new Set([
  "share_capital",
  "reserves",
  "net_worth",
  "borrowings",
  "secured_borrowings",
  "unsecured_borrowings",
  "trade_receivables",
  "trade_payables",
  "inventory",
  "cash_bank",
  "total_assets",
  "total_liabilities",
  "current_assets",
  "current_liabilities",
  "fixed_assets",
  "investments",
]);

import { buildBankingAnalysisFromEvidence } from "./banking-intelligence-core";
import {
  assessGstFinancialPeriodAlignment,
  mapNumericRatioToComparisonOutcome,
} from "./gst-reconciliation-core";

const GST_KEYS = new Set([
  "gst_taxable_turnover",
  "gst_period",
  "gstin",
  "gst_return_type",
  "gst_tax_liability",
]);

const AUDITOR_KEYS = new Set(["auditor_opinion"]);

const TREND_METRICS: Array<{ key: string; label: string; chartKey?: keyof ChanakyaCreditFinancialTrends["chartData"] }> = [
  { key: "revenue", label: "Revenue / Turnover", chartKey: "revenue" },
  { key: "pat", label: "Net Profit (PAT)", chartKey: "netProfit" },
  { key: "net_worth", label: "Net Worth", chartKey: "netWorth" },
  { key: "borrowings", label: "Borrowings", chartKey: "borrowings" },
  { key: "gross_profit", label: "Gross Profit" },
  { key: "ebitda", label: "EBITDA" },
  { key: "trade_receivables", label: "Trade Receivables" },
  { key: "inventory", label: "Inventory" },
];

const FORBIDDEN_ASSESSMENT = /\b(APPROVED|SANCTIONED|GUARANTEED|ELIGIBLE)\b/i;
const FORBIDDEN_FRAUD = /\bfraud\b/i;

export function assertNoForbiddenCreditLanguage(text: string): boolean {
  return !FORBIDDEN_ASSESSMENT.test(text) && !FORBIDDEN_FRAUD.test(text);
}

export function normalizeFinancialYear(periodLabel: string | null | undefined): string | null {
  if (!periodLabel?.trim()) return null;
  const t = periodLabel.trim();
  const fy = t.match(/\bFY\s*20(\d{2})\s*[-–\/]?\s*(\d{2})?\b/i);
  if (fy) return fy[2] ? `FY20${fy[1]}-${fy[2]}` : `FY20${fy[1]}`;
  if (/^FY20\d{2}(-20\d{2})?$/i.test(t)) return t.toUpperCase().replace(/\s/g, "");
  if (/year ended/i.test(t)) return t;
  return t.length <= 40 ? t : t.slice(0, 40);
}

/** Parse numeric token for deterministic trend math — returns null when unreliable. */
export function isReliableForTrends(f: ChanakyaDocumentExtractedFact): boolean {
  return f.provenance.confidence !== "ambiguous" && f.provenance.confidence !== "none";
}

export function parseFinancialNumeric(value: string, unit?: string | null): number | null {
  const raw = value
    .toLowerCase()
    .replace(/₹|rs\.?|inr/g, "")
    .replace(/,/g, "")
    .trim();
  let num = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return null;
  const u = (unit ?? "").toLowerCase();
  if (/\bcrore|\bcr\b/.test(u)) num *= 1e7;
  else if (/\blakh|\blac|\blakhs\b/.test(u)) num *= 1e5;
  else if (/\bthousands?\b|'000/.test(u)) num *= 1e3;
  return num;
}

function factProvenance(f: ChanakyaDocumentExtractedFact): ChanakyaCreditFactProvenance {
  return {
    documentId: f.provenance.documentId,
    documentName: f.provenance.displayName,
    opportunityId: f.provenance.opportunityId,
    section: f.provenance.sectionOrTable,
    financialYear: normalizeFinancialYear(f.periodLabel),
    field: f.key,
    value: f.value,
    unit: f.unit ?? null,
    extractionMethod: f.provenance.extractionMethod,
    confidence: f.provenance.confidence,
    source: "document_intelligence",
  };
}

function sectionAvailability(count: number, partialThreshold = 1): ChanakyaCreditSectionAvailability {
  if (count === 0) return "NOT_AVAILABLE";
  if (count >= partialThreshold) return "AVAILABLE";
  return "PARTIAL";
}

function combineAvailability(
  ...states: ChanakyaCreditSectionAvailability[]
): ChanakyaCreditSectionAvailability {
  const available = states.filter((s) => s === "AVAILABLE").length;
  const partial = states.filter((s) => s === "PARTIAL").length;
  if (available > 0 && partial === 0 && states.every((s) => s === "AVAILABLE" || s === "NOT_AVAILABLE")) {
    return available === states.filter((s) => s !== "NOT_AVAILABLE").length ? "AVAILABLE" : "PARTIAL";
  }
  if (available > 0 || partial > 0) return partial > 0 || (available > 0 && states.includes("NOT_AVAILABLE")) ? "PARTIAL" : "AVAILABLE";
  return "NOT_AVAILABLE";
}

export function buildFinancialProfileFromFacts(
  facts: ChanakyaDocumentExtractedFact[],
): ChanakyaCreditFinancialProfile {
  const financialFacts: ChanakyaCreditFinancialFact[] = [];
  for (const f of facts) {
    if (!PNL_KEYS.has(f.key) && !BS_KEYS.has(f.key)) continue;
    if (!isReliableForFinancialIntelligence(f)) continue;
    const section: ChanakyaCreditFinancialFact["section"] = PNL_KEYS.has(f.key)
      ? "P&L"
      : BS_KEYS.has(f.key)
        ? "Balance Sheet"
        : "Other";
    financialFacts.push({
      field: f.key,
      label: f.label,
      value: f.value,
      unit: f.unit ?? null,
      financialYear: normalizeFinancialYear(f.periodLabel),
      section,
      provenance: factProvenance(f),
    });
  }

  const years = [
    ...new Set(
      financialFacts.map((f) => f.financialYear).filter((y): y is string => Boolean(y)),
    ),
  ].sort();

  const factsByYear: Record<string, ChanakyaCreditFinancialFact[]> = {};
  for (const y of years) factsByYear[y] = financialFacts.filter((f) => f.financialYear === y);
  const unassigned = financialFacts.filter((f) => !f.financialYear);
  if (unassigned.length) factsByYear["UNASSIGNED"] = unassigned;

  return {
    availability: sectionAvailability(financialFacts.length),
    years,
    factsByYear,
    allFacts: financialFacts,
  };
}

export function computeMetricTrend(input: {
  metric: string;
  label: string;
  facts: ChanakyaDocumentExtractedFact[];
}): ChanakyaCreditMetricTrend {
  const grouped = new Map<string, ChanakyaDocumentExtractedFact>();
  for (const f of input.facts.filter((x) => x.key === input.metric && isReliableForTrendComputation(x))) {
    const year = normalizeFinancialYear(f.periodLabel) ?? "UNASSIGNED";
    if (year === "UNASSIGNED") continue;
    const existing = grouped.get(year);
    if (!existing || f.provenance.confidence === "high") grouped.set(year, f);
  }

  const years = [...grouped.keys()].sort();
  const values = years.map((period) => {
    const f = grouped.get(period)!;
    return {
      period,
      value: f.value,
      numericValue: parseFinancialNumeric(f.value, f.unit),
    };
  });

  if (values.length < 2) {
    return {
      metric: input.metric,
      label: input.label,
      available: values.length === 1,
      trendStatus: values.length === 1 ? "PARTIAL" : "NOT_AVAILABLE",
      direction: "NOT_AVAILABLE",
      period: values.length ? `${values[0]!.period}–${values[values.length - 1]!.period}` : null,
      values,
      growthPercent: null,
      calculation: null,
      provenance: values.map((v) => factProvenance(grouped.get(v.period)!)),
      interpretation: null,
    };
  }

  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (first.numericValue == null || last.numericValue == null) {
    return {
      metric: input.metric,
      label: input.label,
      available: true,
      trendStatus: "PARTIAL",
      direction: "NOT_AVAILABLE",
      period: `${first.period}–${last.period}`,
      values,
      growthPercent: null,
      calculation: "Trend not computed — numeric normalization unavailable for one or both periods.",
      provenance: values.map((v) => factProvenance(grouped.get(v.period)!)),
      interpretation: null,
    };
  }

  const growthPercent = ((last.numericValue - first.numericValue) / first.numericValue) * 100;
  let direction: ChanakyaCreditTrendDirection = "FLAT";
  if (Math.abs(growthPercent) < 2) direction = "FLAT";
  else if (growthPercent > 0) direction = "UP";
  else direction = "DOWN";

  const interpretation =
    direction === "UP"
      ? `${input.label} increased across the reviewed period (${first.period} to ${last.period}).`
      : direction === "DOWN"
        ? `${input.label} declined across the reviewed period (${first.period} to ${last.period}).`
        : `${input.label} remained broadly stable across the reviewed period.`;

  return {
    metric: input.metric,
    label: input.label,
    available: true,
    trendStatus: "AVAILABLE",
    direction,
    period: `${first.period}–${last.period}`,
    values,
    growthPercent: Math.round(growthPercent * 100) / 100,
    calculation: `((${last.numericValue} - ${first.numericValue}) / ${first.numericValue}) * 100`,
    provenance: values.map((v) => factProvenance(grouped.get(v.period)!)),
    interpretation,
  };
}

function buildChartSeries(trend: ChanakyaCreditMetricTrend | null): ChanakyaCreditChartSeries {
  if (!trend?.values.length) return { available: false, points: [] };
  const reliable = trend.values.every((v) => v.numericValue != null);
  return {
    available: reliable && trend.trendStatus !== "NOT_AVAILABLE",
    points: trend.values.map((v) => ({ period: v.period, value: v.value })),
  };
}

export function buildFinancialTrendsFromFacts(
  facts: ChanakyaDocumentExtractedFact[],
): ChanakyaCreditFinancialTrends {
  const metrics = TREND_METRICS.map((m) =>
    computeMetricTrend({ metric: m.key, label: m.label, facts }),
  );
  const chartData = {
    revenue: buildChartSeries(metrics.find((m) => m.metric === "revenue") ?? null),
    netProfit: buildChartSeries(metrics.find((m) => m.metric === "pat") ?? null),
    netWorth: buildChartSeries(metrics.find((m) => m.metric === "net_worth") ?? null),
    borrowings: buildChartSeries(metrics.find((m) => m.metric === "borrowings") ?? null),
  };
  const interpretations = metrics
    .map((m) => m.interpretation)
    .filter((x): x is string => Boolean(x));

  const avail =
    metrics.some((m) => m.trendStatus === "AVAILABLE")
      ? "AVAILABLE"
      : metrics.some((m) => m.trendStatus === "PARTIAL")
        ? "PARTIAL"
        : "NOT_AVAILABLE";

  return { availability: avail, metrics, chartData, interpretations };
}

function isBankStatementReadable(r: ChanakyaDocumentContentReadResult): boolean {
  if (!r.hasBinary) return false;
  return (
    r.status === "content_read" ||
    r.status === "content_read_partial" ||
    r.status === "content_partial"
  );
}

export { buildBankingAnalysisFromEvidence } from "./banking-intelligence-core";

export function classifyGstFieldCategory(key: string): ChanakyaCreditGstFieldCategory {
  if (key === "gstin") return "gstin_identity";
  if (key === "gst_taxable_turnover") return "taxable_turnover";
  return "other_gst";
}

function parseGstReturnType(
  value: string | null | undefined,
): ChanakyaCreditGstReturnSummary["returnType"] {
  if (!value?.trim()) return null;
  const t = value.trim().toUpperCase();
  if (t === "GSTR-1" || t === "GSTR-3B" || t === "GSTR-9") return t;
  if (/GSTR[\s-]*3B/.test(t)) return "GSTR-3B";
  if (/GSTR[\s-]*1\b/.test(t)) return "GSTR-1";
  if (/GSTR[\s-]*9/.test(t)) return "GSTR-9";
  return "UNKNOWN";
}

function dedupeGstFacts(facts: ChanakyaDocumentExtractedFact[]): ChanakyaDocumentExtractedFact[] {
  const seen = new Set<string>();
  const out: ChanakyaDocumentExtractedFact[] = [];
  for (const f of facts) {
    const id = `${f.provenance.documentId}:${f.key}:${f.value}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(f);
  }
  return out;
}

function isGstFinancialInsight(f: ChanakyaCreditGstMaterialFact): boolean {
  return (
    f.lenderFacingEligible &&
    (f.category === "taxable_turnover" || f.field === "gst_tax_liability")
  );
}

function isReliableGstMaterialFact(f: ChanakyaDocumentExtractedFact): boolean {
  return (
    f.provenance.confidence !== "ambiguous" &&
    f.provenance.confidence !== "none" &&
    f.provenance.confidence !== "low"
  );
}

function buildGstMaterialFacts(
  facts: ChanakyaDocumentExtractedFact[],
  returns: ChanakyaCreditGstReturnSummary[],
): ChanakyaCreditGstMaterialFact[] {
  const periodByDoc = new Map<string, string | null>();
  for (const r of returns) {
    periodByDoc.set(r.documentId, r.returnPeriod);
  }

  const material: ChanakyaCreditGstMaterialFact[] = [];
  for (const f of facts) {
    if (!GST_KEYS.has(f.key)) continue;
    const category = classifyGstFieldCategory(f.key);
    const reliable = isReliableGstMaterialFact(f);
    material.push({
      documentId: f.provenance.documentId,
      documentName: f.provenance.displayName,
      returnPeriod: periodByDoc.get(f.provenance.documentId) ?? f.periodLabel ?? null,
      field: f.key,
      label: f.label,
      value: f.value,
      unit: f.unit ?? null,
      confidence: f.provenance.confidence,
      extractionMethod: f.provenance.extractionMethod,
      category,
      lenderFacingEligible:
        category !== "gstin_identity" &&
        reliable &&
        (f.lenderFacingEligible ?? category === "taxable_turnover"),
    });
  }
  return material;
}

function buildGstIdentitySummary(
  returns: ChanakyaCreditGstReturnSummary[],
): ChanakyaCreditGstIdentitySummary {
  const gstinValues = returns.map((r) => r.gstin).filter((v): v is string => Boolean(v?.trim()));
  const unique = [...new Set(gstinValues.map((v) => v.toUpperCase()))];
  const primary = unique[0] ?? null;
  const corroborationDocumentCount = primary
    ? returns.filter((r) => r.gstin?.toUpperCase() === primary).length
    : 0;
  return {
    gstin: primary,
    corroborationDocumentCount,
    note: "GSTIN repetition across return documents is identity corroboration only — not separate financial insights.",
  };
}

export function buildGstReconciliationLimitation(input: {
  gstAnalysis: ChanakyaCreditGstAnalysis;
  gstVsFinancials: ChanakyaCreditGstVsFinancials;
  financialProfile: ChanakyaCreditFinancialProfile;
}): string | null {
  const parts: string[] = [];
  const { gstAnalysis, gstVsFinancials, financialProfile } = input;

  if (gstAnalysis.returns.length >= 2) {
    parts.push(
      "Annual turnover was not computed by summing monthly GST return figures — incompatible period aggregation is prohibited.",
    );
  }

  if (
    gstAnalysis.returns.length > 0 &&
    financialProfile.years.length > 0 &&
    (gstVsFinancials.status === "NOT_AVAILABLE" ||
      gstVsFinancials.status === "NOT_RECONCILABLE" ||
      gstVsFinancials.status === "NOT_COMPARABLE" ||
      gstVsFinancials.periodAlignment === "MISMATCH")
  ) {
    parts.push(
      gstVsFinancials.explanation ??
        "GST monthly return periods are not directly aligned with annual financial statement periods without explicit period mapping verification.",
    );
  }

  if (gstVsFinancials.status === "VARIANCE_IDENTIFIED" && gstVsFinancials.explanation) {
    parts.push(gstVsFinancials.explanation);
  }

  if (
    gstAnalysis.returns.length > 0 &&
    financialProfile.years.length === 0
  ) {
    parts.push(
      "Financial statement revenue was not available for GST-to-financial reconciliation in this run.",
    );
  }

  return parts.length ? parts.join(" ") : null;
}

export function buildGstAnalysisFromFacts(
  facts: ChanakyaDocumentExtractedFact[],
): ChanakyaCreditGstAnalysis {
  const gstFacts = dedupeGstFacts(facts.filter((f) => GST_KEYS.has(f.key)));
  const byDoc = new Map<string, ChanakyaDocumentExtractedFact[]>();
  for (const f of gstFacts) {
    const list = byDoc.get(f.provenance.documentId) ?? [];
    list.push(f);
    byDoc.set(f.provenance.documentId, list);
  }

  const returns: ChanakyaCreditGstReturnSummary[] = [...byDoc.entries()].map(
    ([documentId, docFacts]) => {
      const turnoverFact = docFacts.find((f) => f.key === "gst_taxable_turnover");
      const returnTypeFact = docFacts.find((f) => f.key === "gst_return_type");
      return {
        documentId,
        documentName: docFacts[0]!.provenance.displayName,
        gstin: docFacts.find((f) => f.key === "gstin")?.value ?? null,
        returnType: parseGstReturnType(returnTypeFact?.value),
        returnPeriod: docFacts.find((f) => f.key === "gst_period")?.value ?? null,
        taxableTurnover: turnoverFact?.value ?? null,
        taxLiability: docFacts.find((f) => f.key === "gst_tax_liability")?.value ?? null,
        sourceSection:
          turnoverFact?.provenance.sectionOrTable ??
          docFacts[0]?.provenance.sectionOrTable ??
          null,
        provenance: docFacts.map(factProvenance),
      };
    },
  );

  const trendPoints = returns
    .filter(
      (r) =>
        r.returnPeriod &&
        r.taxableTurnover &&
        r.provenance.every((p) => p.confidence !== "ambiguous"),
    )
    .map((r) => ({ period: r.returnPeriod!, taxableTurnover: r.taxableTurnover }));

  const materialFacts = buildGstMaterialFacts(gstFacts, returns);
  const identity = buildGstIdentitySummary(returns);
  const financialInsightCount = materialFacts.filter(isGstFinancialInsight).length;
  const monthlyTurnoverCount = returns.filter(
    (r) => r.taxableTurnover && r.returnPeriod,
  ).length;

  return {
    availability: sectionAvailability(returns.length),
    returns,
    materialFacts,
    identity,
    financialInsightCount,
    gstTrend: {
      available: trendPoints.length >= 2,
      points: trendPoints,
    },
    periodCoverage:
      trendPoints.length > 0
        ? `${trendPoints.length} GST return period(s) with extracted turnover`
        : null,
    reconciliationLimitation: null,
    // Never treat multi-month GST as annual aggregate unless full-year source exists.
    annualTurnoverNotComputed: monthlyTurnoverCount >= 2,
  };
}

export function buildAuditorAnalysisFromFacts(
  facts: ChanakyaDocumentExtractedFact[],
): ChanakyaCreditAuditorAnalysis {
  const obs: ChanakyaCreditAuditorObservation[] = facts
    .filter((f) => AUDITOR_KEYS.has(f.key))
    .map((f, i) => ({
      id: `aud:${f.id}:${i}`,
      category: /going concern/i.test(f.value)
        ? "going_concern"
        : /emphasis of matter/i.test(f.value)
          ? "emphasis_of_matter"
          : /qualified|opinion/i.test(f.value)
            ? "audit_opinion"
            : "disclosure",
      observation: f.value,
      provenance: factProvenance(f),
    }));

  return {
    availability: sectionAvailability(obs.length),
    observations: obs,
  };
}

export function buildBusinessAnalysis(input: {
  stated?: StatedCreditWorkbenchInput;
  opportunityFields?: {
    companyName?: string | null;
    employmentTypeCode?: string | null;
    cityLabel?: string | null;
  };
  auditorObservations: ChanakyaCreditAuditorObservation[];
}): ChanakyaCreditBusinessAnalysis {
  const provenance: string[] = [];
  const nature =
    input.stated?.statedNatureOfBusiness?.trim() ||
    input.auditorObservations.find((o) => /business/i.test(o.observation))?.observation ||
    null;
  if (input.stated?.statedNatureOfBusiness?.trim()) provenance.push("credit_workbench_stated");
  if (input.opportunityFields?.companyName) provenance.push("opportunity_registry");

  const profile = {
    availability: "NOT_AVAILABLE" as ChanakyaCreditSectionAvailability,
    businessNature: nature,
    constitution: input.stated?.statedConstitution?.trim() || null,
    vintage: input.stated?.statedBusinessVintage?.trim() || null,
    location: input.stated?.statedPropertyLocation?.trim() || input.opportunityFields?.cityLabel || null,
    businessModel: null as string | null,
    industry: input.opportunityFields?.employmentTypeCode || null,
    operatingProfile: null as string | null,
    provenance,
  };

  const filled = [
    profile.businessNature,
    profile.constitution,
    profile.vintage,
    profile.location,
    profile.industry,
  ].filter(Boolean).length;

  profile.availability =
    filled >= 3 ? "AVAILABLE" : filled >= 1 ? "PARTIAL" : "NOT_AVAILABLE";

  return { availability: profile.availability, profile };
}

export function buildPropertyAnalysis(input: {
  stated?: StatedCreditWorkbenchInput;
  facts: ChanakyaDocumentExtractedFact[];
  reads: ChanakyaDocumentContentReadResult[];
}): ChanakyaCreditPropertyAnalysis {
  const propertyDocs = input.reads
    .filter(
      (r) =>
        r.familyHint === "property" ||
        /property|valuation|title|sale deed/i.test(r.displayName),
    )
    .map((r) => r.displayName);

  const valuationReadable = input.reads.some(
    (r) => /valuation/i.test(r.displayName) && isBankStatementReadable(r),
  );

  const provenance: string[] = [];
  if (input.stated?.statedPropertyType) provenance.push("credit_workbench_stated");
  if (propertyDocs.length) provenance.push("document_intelligence");

  const fields = [
    input.stated?.statedPropertyType,
    input.stated?.statedPropertyValue,
    input.stated?.statedPropertyLocation,
  ].filter((v) => v?.trim()).length;

  return {
    availability:
      fields >= 2 || propertyDocs.length > 0
        ? fields >= 2
          ? "AVAILABLE"
          : "PARTIAL"
        : "NOT_AVAILABLE",
    propertyType: input.stated?.statedPropertyType?.trim() || null,
    location: input.stated?.statedPropertyLocation?.trim() || null,
    statedValue: input.stated?.statedPropertyValue?.trim() || null,
    valuationStated: null,
    ownershipEvidence: propertyDocs.length ? `${propertyDocs.length} property-related document(s) on record` : null,
    existingCharge: null,
    proposedSecurity: input.stated?.statedPropertyType?.trim() || null,
    documentsAvailable: propertyDocs,
    valuationDocumentAvailable: valuationReadable,
    provenance,
  };
}

export function mapCrossDocStatusToReconciliation(
  status: ChanakyaCrossDocumentComparison["status"],
): ChanakyaCreditReconciliationStatus {
  switch (status) {
    case "corroborated":
      return "CORROBORATED";
    case "inconsistent":
      return "BROADLY_CONSISTENT";
    case "mismatch":
      return "VARIANCE_IDENTIFIED";
    case "unavailable":
    default:
      return "NOT_AVAILABLE";
  }
}

export function buildGstVsFinancials(input: {
  financialProfile: ChanakyaCreditFinancialProfile;
  gstAnalysis: ChanakyaCreditGstAnalysis;
}): ChanakyaCreditGstVsFinancials {
  const revenueFacts = input.financialProfile.allFacts.filter(
    (f) => f.field === "revenue" && f.provenance.confidence !== "ambiguous",
  );
  const latestRevenue = revenueFacts[revenueFacts.length - 1];
  const reliableGstReturns = input.gstAnalysis.returns.filter(
    (r) =>
      r.taxableTurnover &&
      r.provenance.every((p) => p.confidence !== "ambiguous" && p.confidence !== "low"),
  );
  const gstPeriodsConsidered = reliableGstReturns
    .map((r) => r.returnPeriod)
    .filter((p): p is string => Boolean(p?.trim()));
  const primaryGst = reliableGstReturns[0] ?? null;
  const gstTurnover = primaryGst?.taxableTurnover ?? null;
  const gstPeriod = primaryGst?.returnPeriod ?? input.gstAnalysis.returns[0]?.returnPeriod ?? null;

  if (!latestRevenue?.value && !gstTurnover) {
    return {
      availability: "NOT_AVAILABLE",
      status: "NOT_AVAILABLE",
      comparisonOutcome: "NOT_AVAILABLE",
      periodAlignment: "NOT_AVAILABLE",
      financialTurnover: null,
      gstTurnover: null,
      financialPeriod: null,
      gstPeriod: null,
      gstPeriodsConsidered: [],
      explanation: null,
    };
  }

  if (!latestRevenue?.value || !gstTurnover) {
    return {
      availability: "NOT_AVAILABLE",
      status: "NOT_AVAILABLE",
      comparisonOutcome: "NOT_AVAILABLE",
      periodAlignment: "INSUFFICIENT",
      financialTurnover: latestRevenue?.value ?? null,
      gstTurnover: gstTurnover ?? null,
      financialPeriod: latestRevenue?.financialYear ?? null,
      gstPeriod,
      gstPeriodsConsidered,
      explanation:
        "GST vs financial reconciliation is not available — one or both turnover sources lack reliable values.",
    };
  }

  const periodCheck = assessGstFinancialPeriodAlignment({
    financialPeriod: latestRevenue.financialYear,
    gstPeriods: gstPeriodsConsidered.length ? gstPeriodsConsidered : [gstPeriod],
    gstReturnCountWithTurnover: reliableGstReturns.length,
  });

  if (!periodCheck.comparable) {
    return {
      availability: "AVAILABLE",
      status: "NOT_COMPARABLE",
      comparisonOutcome: "NOT_COMPARABLE",
      periodAlignment: periodCheck.alignment,
      financialTurnover: latestRevenue.value,
      gstTurnover,
      financialPeriod: latestRevenue.financialYear,
      gstPeriod,
      gstPeriodsConsidered,
      explanation: periodCheck.explanation,
    };
  }

  const numFin = parseFinancialNumeric(latestRevenue.value, latestRevenue.unit);
  const numGst = parseFinancialNumeric(gstTurnover, "inr");
  if (numFin == null || numGst == null) {
    return {
      availability: "AVAILABLE",
      status: "NOT_RECONCILABLE",
      comparisonOutcome: "NOT_COMPARABLE",
      periodAlignment: periodCheck.alignment,
      financialTurnover: latestRevenue.value,
      gstTurnover,
      financialPeriod: latestRevenue.financialYear,
      gstPeriod,
      gstPeriodsConsidered,
      explanation:
        "Both GST and financial turnover values are present but could not be normalized for numeric comparison (unit/scale uncertainty).",
    };
  }

  const ratio = Math.min(numFin, numGst) / Math.max(numFin, numGst);
  const mapped = mapNumericRatioToComparisonOutcome(ratio);
  let explanation: string;
  if (mapped.outcome === "MATCH") {
    explanation =
      mapped.status === "CORROBORATED"
        ? "GST taxable turnover aligns with extracted financial revenue for comparable periods (MATCH)."
        : "GST taxable turnover is broadly consistent with extracted financial revenue for comparable periods (MATCH).";
  } else {
    explanation =
      "GST taxable turnover differs from reported financial revenue for comparable periods (VARIANCE) — evidence-based variance requiring verification; not treated as misconduct.";
  }

  return {
    availability: "AVAILABLE",
    status: mapped.status,
    comparisonOutcome: mapped.outcome,
    periodAlignment: periodCheck.alignment,
    financialTurnover: latestRevenue.value,
    gstTurnover,
    financialPeriod: latestRevenue.financialYear,
    gstPeriod,
    gstPeriodsConsidered,
    explanation,
  };
}

export function buildReconciliationRows(input: {
  facts: ChanakyaDocumentExtractedFact[];
  crossDocumentComparisons: ChanakyaCrossDocumentComparison[];
  stated?: StatedCreditWorkbenchInput;
  gstVsFinancials: ChanakyaCreditGstVsFinancials;
  bankVsTurnover?: ChanakyaCreditBankVsTurnoverReconciliation;
}): ChanakyaCreditReconciliation {
  const rows: ChanakyaCreditReconciliationRow[] = [];

  for (const cmp of input.crossDocumentComparisons) {
    const left = input.facts.find((f) => f.id === cmp.leftFactId);
    const right = input.facts.find((f) => f.id === cmp.rightFactId);
    if (!left || !right) continue;
    rows.push({
      id: cmp.id,
      field: cmp.factKey,
      sourceA: left.provenance.displayName,
      sourceB: right.provenance.displayName,
      valueA: left.value,
      valueB: right.value,
      status: mapCrossDocStatusToReconciliation(cmp.status),
      explanation: cmp.note,
      provenance: [factProvenance(left), factProvenance(right)],
    });
  }

  const statedTurnover = input.stated?.statedTurnover?.trim();
  const docRevenue = input.facts.find((f) => f.key === "revenue");
  if (statedTurnover && docRevenue) {
    const numA = parseFinancialNumeric(statedTurnover, null);
    const numB = parseFinancialNumeric(docRevenue.value, docRevenue.unit);
    let status: ChanakyaCreditReconciliationStatus = "NOT_RECONCILABLE";
    if (numA != null && numB != null) {
      const ratio = Math.min(numA, numB) / Math.max(numA, numB);
      if (ratio >= 0.98) status = "CORROBORATED";
      else if (ratio >= 0.85) status = "BROADLY_CONSISTENT";
      else status = "VARIANCE_IDENTIFIED";
    }
    rows.push({
      id: "recon:stated_turnover:doc_revenue",
      field: "turnover",
      sourceA: "Credit Workbench stated turnover",
      sourceB: docRevenue.provenance.displayName,
      valueA: statedTurnover,
      valueB: docRevenue.value,
      status,
      explanation:
        status === "VARIANCE_IDENTIFIED"
          ? "Stated turnover differs from extracted financial revenue — variance requiring verification."
          : "Stated turnover compared against extracted financial revenue.",
      provenance: [factProvenance(docRevenue)],
    });
  }

  if (input.gstVsFinancials.availability === "AVAILABLE") {
    rows.push({
      id: "recon:gst_vs_financial_turnover",
      field: "turnover",
      sourceA: "Financial statements (revenue)",
      sourceB: "GST returns (taxable turnover)",
      valueA: input.gstVsFinancials.financialTurnover,
      valueB: input.gstVsFinancials.gstTurnover,
      status: input.gstVsFinancials.status,
      explanation: input.gstVsFinancials.explanation ?? "GST vs financial turnover comparison.",
      provenance: [],
    });
  }

  if (input.bankVsTurnover && input.bankVsTurnover.availability !== "NOT_AVAILABLE") {
    rows.push({
      id: "recon:bank_vs_gst_turnover",
      field: "turnover",
      sourceA: "Bank statements (total credits)",
      sourceB: "GST returns (taxable turnover)",
      valueA: input.bankVsTurnover.bankCredits,
      valueB: input.bankVsTurnover.gstTurnover,
      status: input.bankVsTurnover.status,
      explanation:
        input.bankVsTurnover.explanation ??
        "Bank vs GST turnover comparison for available periods.",
      provenance: [],
    });
  }

  return {
    availability: sectionAvailability(rows.length),
    rows,
    gstVsFinancials: input.gstVsFinancials,
    bankVsTurnover:
      input.bankVsTurnover ?? {
        availability: "NOT_AVAILABLE",
        status: "NOT_AVAILABLE",
        bankCredits: null,
        gstTurnover: null,
        financialTurnover: null,
        bankPeriod: null,
        gstPeriod: null,
        financialPeriod: null,
        explanation: null,
      },
  };
}

function assessSection(
  positiveCount: number,
  concernCount: number,
  evidenceAvailable: boolean,
): ChanakyaCreditAssessmentSection {
  if (!evidenceAvailable) {
    return {
      state: "INSUFFICIENT_EVIDENCE",
      summary: "Insufficient extracted evidence to form an assessment for this section.",
    };
  }
  if (concernCount === 0 && positiveCount > 0) {
    return { state: "POSITIVE", summary: "Evidence supports a generally positive view for this section." };
  }
  if (positiveCount > concernCount) {
    return { state: "GENERALLY_POSITIVE", summary: "Evidence is broadly positive with some mixed signals." };
  }
  if (positiveCount > 0 && concernCount > 0) {
    return { state: "MIXED", summary: "Both supportive and cautionary evidence is present." };
  }
  if (concernCount > 0) {
    return { state: "CAUTION", summary: "Evidence indicates caution — review underlying documents." };
  }
  return { state: "INSUFFICIENT_EVIDENCE", summary: "Limited evidence available for this section." };
}

function buildCreditAssessment(input: {
  financialProfile: ChanakyaCreditFinancialProfile;
  financialTrends: ChanakyaCreditFinancialTrends;
  bankingAnalysis: ChanakyaCreditBankingAnalysis;
  businessAnalysis: ChanakyaCreditBusinessAnalysis;
  propertyAnalysis: ChanakyaCreditPropertyAnalysis;
  gstAnalysis: ChanakyaCreditGstAnalysis;
  positives: ChanakyaCreditEvidenceItem[];
  concerns: ChanakyaCreditEvidenceItem[];
  documentsReadable: number;
}): ChanakyaCreditAssessment {
  const finEvidence = input.financialProfile.availability !== "NOT_AVAILABLE";
  const bankEvidence = input.bankingAnalysis.availability !== "NOT_AVAILABLE";
  const bizEvidence = input.businessAnalysis.availability !== "NOT_AVAILABLE";
  const secEvidence = input.propertyAnalysis.availability !== "NOT_AVAILABLE";
  const docEvidence = input.documentsReadable > 0;

  const finPos = input.positives.filter((p) => /revenue|profit|net worth|margin/i.test(p.statement)).length;
  const finCon = input.concerns.filter((c) => /revenue|profit|leverage|receivable/i.test(c.statement)).length;

  const sections = {
    financialAssessment: assessSection(finPos, finCon, finEvidence),
    businessAssessment: assessSection(0, 0, bizEvidence),
    bankingAssessment: assessSection(0, 0, bankEvidence),
    securityAssessment: assessSection(0, 0, secEvidence),
    commercialAssessment: {
      state: "NOT_AVAILABLE" as ChanakyaCreditAssessmentState,
      summary: "Commercial assessment deferred to commercial intelligence slice.",
    },
    documentAssessment: assessSection(0, input.concerns.filter((c) => /missing|unreadable/i.test(c.statement)).length, docEvidence),
  };

  const overallPositive = input.positives.length;
  const overallConcern = input.concerns.length;
  let overallState: ChanakyaCreditAssessmentState = "INSUFFICIENT_EVIDENCE";
  if (finEvidence || bankEvidence || bizEvidence) {
    if (overallConcern === 0 && overallPositive > 0) overallState = "GENERALLY_POSITIVE";
    else if (overallPositive > overallConcern) overallState = "GENERALLY_POSITIVE";
    else if (overallPositive > 0 && overallConcern > 0) overallState = "MIXED";
    else if (overallConcern > 0) overallState = "CAUTION";
    else overallState = "INSUFFICIENT_EVIDENCE";
  }

  const anySection =
    finEvidence || bankEvidence || bizEvidence || secEvidence || docEvidence;

  return {
    availability: anySection ? (combineAvailability(
      input.financialProfile.availability,
      input.bankingAnalysis.availability,
      input.businessAnalysis.availability,
    )) : "NOT_AVAILABLE",
    overallAssessment: {
      state: overallState,
      summary:
        "Advisory internal credit view based on available document intelligence and stated fields — not a sanction or approval.",
    },
    ...sections,
  };
}

export function buildKeyPositives(input: {
  financialTrends: ChanakyaCreditFinancialTrends;
  reconciliation: ChanakyaCreditReconciliation;
  bankingAnalysis: ChanakyaCreditBankingAnalysis;
  propertyAnalysis: ChanakyaCreditPropertyAnalysis;
  businessAnalysis: ChanakyaCreditBusinessAnalysis;
}): ChanakyaCreditEvidenceItem[] {
  const out: ChanakyaCreditEvidenceItem[] = [];

  for (const trend of input.financialTrends.metrics) {
    if (trend.direction === "UP" && trend.growthPercent != null && trend.growthPercent > 5) {
      out.push({
        id: `pos:trend:${trend.metric}`,
        category: "POSITIVE",
        statement: trend.interpretation ?? `${trend.label} growth observed.`,
        evidence: [`${trend.growthPercent}% change (${trend.period})`],
        provenance: trend.provenance,
      });
    }
  }

  if (input.reconciliation.gstVsFinancials.status === "CORROBORATED") {
    out.push({
      id: "pos:gst_financial_corroborated",
      category: "POSITIVE",
      statement: "GST taxable turnover corroborates extracted financial revenue for available periods.",
      evidence: [input.reconciliation.gstVsFinancials.explanation ?? "Corroborated comparison"],
      provenance: [],
    });
  }

  if (input.bankingAnalysis.availability === "AVAILABLE") {
    out.push({
      id: "pos:banking_readable",
      category: "POSITIVE",
      statement: "Readable bank statement evidence is available for review.",
      evidence: input.bankingAnalysis.accounts.map((a) => a.documentName),
      provenance: input.bankingAnalysis.accounts.flatMap((a) => a.provenance),
    });
  }

  if (input.propertyAnalysis.documentsAvailable.length > 0 && input.propertyAnalysis.statedValue) {
    out.push({
      id: "pos:property_documented",
      category: "POSITIVE",
      statement: "Property/security context is documented with stated value and supporting documents on record.",
      evidence: input.propertyAnalysis.documentsAvailable,
      provenance: [],
    });
  }

  if (input.businessAnalysis.profile.vintage) {
    out.push({
      id: "pos:business_vintage",
      category: "POSITIVE",
      statement: `Business vintage captured: ${input.businessAnalysis.profile.vintage}.`,
      evidence: input.businessAnalysis.profile.provenance,
      provenance: [],
    });
  }

  return out.filter((p) => assertNoForbiddenCreditLanguage(p.statement));
}

export function buildKeyConcerns(input: {
  financialTrends: ChanakyaCreditFinancialTrends;
  reconciliation: ChanakyaCreditReconciliation;
  bankingAnalysis: ChanakyaCreditBankingAnalysis;
  auditorAnalysis: ChanakyaCreditAuditorAnalysis;
  financialProfile: ChanakyaCreditFinancialProfile;
  reads: ChanakyaDocumentContentReadResult[];
}): ChanakyaCreditEvidenceItem[] {
  const out: ChanakyaCreditEvidenceItem[] = [];

  for (const trend of input.financialTrends.metrics) {
    if (trend.direction === "DOWN" && trend.growthPercent != null && trend.growthPercent < -5) {
      out.push({
        id: `con:trend:${trend.metric}`,
        category: "CONCERN",
        statement: trend.interpretation ?? `${trend.label} decline observed.`,
        evidence: [`${trend.growthPercent}% change (${trend.period})`],
        provenance: trend.provenance,
      });
    }
    if (trend.metric === "borrowings" && trend.direction === "UP") {
      out.push({
        id: "con:borrowings_up",
        category: "CONCERN",
        statement: "Borrowings increased during the reviewed period.",
        evidence: trend.values.map((v) => `${v.period}: ${v.value}`),
        provenance: trend.provenance,
      });
    }
    if (trend.metric === "trade_receivables" && trend.direction === "UP") {
      out.push({
        id: "con:receivables_up",
        category: "CONCERN",
        statement: "Trade receivables increased during the reviewed period.",
        evidence: trend.values.map((v) => `${v.period}: ${v.value}`),
        provenance: trend.provenance,
      });
    }
  }

  if (input.reconciliation.gstVsFinancials.status === "VARIANCE_IDENTIFIED") {
    out.push({
      id: "con:gst_financial_variance",
      category: "CONCERN",
      statement:
        "GST turnover differs from reported financial turnover for available periods — reconciliation may be required.",
      evidence: [input.reconciliation.gstVsFinancials.explanation ?? "Variance identified"],
      provenance: [],
    });
  }

  for (const obs of input.auditorAnalysis.observations) {
    if (/qualified|emphasis|going concern|adverse/i.test(obs.observation)) {
      out.push({
        id: obs.id,
        category: "CONCERN",
        statement: `Audit report contains a notable observation: ${obs.observation.slice(0, 200)}`,
        evidence: [obs.provenance.documentName],
        provenance: [obs.provenance],
      });
    }
  }

  const ocrRequired = input.reads.filter((r) => r.status === "ocr_required").length;
  const ocrFailed = input.reads.filter((r) => r.status === "ocr_failed").length;
  if (ocrRequired > 0) {
    out.push({
      id: "con:ocr_required",
      category: "CONCERN",
      statement: `${ocrRequired} document(s) require OCR and were not content-read in this run.`,
      evidence: ["Document intelligence limitation — not an automatic credit negative."],
      provenance: [],
    });
  }
  if (ocrFailed > 0) {
    out.push({
      id: "con:ocr_failed",
      category: "CONCERN",
      statement: `${ocrFailed} document(s) failed OCR after provider attempt — content remains unavailable.`,
      evidence: ["OCR_FAILED — quality-gated; not treated as readable."],
      provenance: [],
    });
  }

  if (input.financialProfile.years.length === 1) {
    out.push({
      id: "limit:single_year_financials",
      category: "CONCERN",
      statement: "Only one financial year of extracted statement facts is available — multi-year trend evidence is limited.",
      evidence: [input.financialProfile.years[0]!],
      provenance: [],
    });
  }

  return out.filter((c) => assertNoForbiddenCreditLanguage(c.statement));
}

export function buildMitigants(input: {
  concerns: ChanakyaCreditEvidenceItem[];
  positives: ChanakyaCreditEvidenceItem[];
}): ChanakyaCreditEvidenceItem[] {
  const out: ChanakyaCreditEvidenceItem[] = [];
  const hasReceivableConcern = input.concerns.some((c) => c.id === "con:receivables_up");
  const hasRevenueGrowth = input.positives.some((p) => p.id.startsWith("pos:trend:revenue"));

  if (hasReceivableConcern && hasRevenueGrowth) {
    out.push({
      id: "mit:receivables_with_revenue_growth",
      category: "MITIGANT",
      statement:
        "Receivables increased while revenue also grew — may reflect business expansion rather than collection stress based on available evidence.",
      evidence: ["Concurrent revenue growth trend"],
      provenance: [],
    });
  }

  return out.filter((m) => assertNoForbiddenCreditLanguage(m.statement));
}

export function buildCreditInternalRecommendations(input: {
  financialProfile: ChanakyaCreditFinancialProfile;
  bankingAnalysis: ChanakyaCreditBankingAnalysis;
  gstAnalysis: ChanakyaCreditGstAnalysis;
  propertyAnalysis: ChanakyaCreditPropertyAnalysis;
  reconciliation: ChanakyaCreditReconciliation;
  auditorAnalysis: ChanakyaCreditAuditorAnalysis;
  reads: ChanakyaDocumentContentReadResult[];
}): ChanakyaCreditInternalRecommendation[] {
  const recs: ChanakyaCreditInternalRecommendation[] = [];

  if (input.financialProfile.availability === "NOT_AVAILABLE") {
    recs.push({
      id: "rec:financials",
      recommendation: "Obtain latest audited financial statements (P&L and Balance Sheet).",
      reason: "No structured financial statement facts were extracted.",
      internalOnly: true,
      provenance: "credit_intelligence_gap_analysis",
    });
  } else if (input.financialProfile.years.length < 2) {
    recs.push({
      id: "rec:multi_year_financials",
      recommendation: "Obtain additional year financials if available to strengthen trend analysis.",
      reason: "Fewer than two financial years with reliable year association were extracted.",
      internalOnly: true,
      provenance: "credit_intelligence_gap_analysis",
    });
  }

  if (input.bankingAnalysis.availability === "NOT_AVAILABLE") {
    recs.push({
      id: "rec:bank_statements",
      recommendation: "Obtain readable bank statements for the review period.",
      reason: input.bankingAnalysis.limitation ?? "Banking analysis unavailable.",
      internalOnly: true,
      provenance: "credit_intelligence_gap_analysis",
    });
  }

  if (input.gstAnalysis.availability === "NOT_AVAILABLE") {
    recs.push({
      id: "rec:gst_returns",
      recommendation: "Obtain GSTR-1 / GSTR-3B returns for turnover corroboration.",
      reason: "No GST return facts extracted.",
      internalOnly: true,
      provenance: "credit_intelligence_gap_analysis",
    });
  }

  if (input.reconciliation.gstVsFinancials.status === "VARIANCE_IDENTIFIED") {
    recs.push({
      id: "rec:reconcile_turnover",
      recommendation: "Reconcile GST turnover with financial statement revenue.",
      reason: "Variance identified between GST and financial turnover.",
      internalOnly: true,
      provenance: "credit_intelligence_reconciliation",
    });
  }

  if (input.auditorAnalysis.observations.some((o) => /qualified|emphasis/i.test(o.observation))) {
    recs.push({
      id: "rec:audit_qualification",
      recommendation: "Review audit qualification / emphasis-of-matter with the borrower.",
      reason: "Auditor report contains notable observations.",
      internalOnly: true,
      provenance: "credit_intelligence_auditor",
    });
  }

  if (!input.propertyAnalysis.valuationDocumentAvailable && input.propertyAnalysis.statedValue) {
    recs.push({
      id: "rec:valuation",
      recommendation: "Obtain a readable valuation report if security assessment is required.",
      reason: "Stated property value exists without extracted valuation report facts.",
      internalOnly: true,
      provenance: "credit_intelligence_property",
    });
  }

  const unreadable = input.reads.filter(
    (r) => r.status === "ocr_required" || r.status === "ocr_failed" || r.status === "no_binary",
  );
  if (unreadable.length > 0) {
    recs.push({
      id: "rec:unreadable_docs",
      recommendation: "Re-upload or OCR unreadable documents required for credit review.",
      reason: `${unreadable.length} document(s) could not be content-read.`,
      internalOnly: true,
      provenance: "document_intelligence",
    });
  }

  return recs;
}

export type CreditIntelligenceAssemblyInput = {
  opportunityId: string;
  organizationId?: string | null;
  structuredFacts: ChanakyaDocumentExtractedFact[];
  crossDocumentComparisons: ChanakyaCrossDocumentComparison[];
  reads: ChanakyaDocumentContentReadResult[];
  /** CO-023 — optional declared file sizes for metadata-only bank inventory. */
  fileSizeByDocId?: Map<string, number>;
  binarySourceByDocId?: Map<string, "inline" | "object_store" | "none">;
  storageKeyByDocId?: Map<string, boolean>;
  binaryAbsentReasonByDocId?: Map<string, string>;
  stated?: StatedCreditWorkbenchInput;
  opportunityFields?: {
    companyName?: string | null;
    employmentTypeCode?: string | null;
    cityLabel?: string | null;
    requestedAmount?: number | null;
    transactionType?: string | null;
  };
  webResearchAvailable?: boolean;
  limitations?: string[];
};

export function assembleCreditIntelligence(
  input: CreditIntelligenceAssemblyInput,
): ChanakyaCreditIntelligenceContext {
  const financialProfile = buildFinancialProfileFromFacts(input.structuredFacts);
  const financialFactQuality = buildFinancialFactQuality(input.structuredFacts);
  const financialTrends = buildFinancialTrendsFromFacts(input.structuredFacts);
  const gstAnalysisBase = buildGstAnalysisFromFacts(input.structuredFacts);
  const bankingAnalysis = buildBankingAnalysisFromEvidence({
    facts: input.structuredFacts,
    reads: input.reads,
    fileSizeByDocId: input.fileSizeByDocId,
    binarySourceByDocId: input.binarySourceByDocId,
    storageKeyByDocId: input.storageKeyByDocId,
    binaryAbsentReasonByDocId: input.binaryAbsentReasonByDocId,
    financialProfile,
    gstAnalysis: gstAnalysisBase,
  });
  const auditorAnalysis = buildAuditorAnalysisFromFacts(input.structuredFacts);
  const businessAnalysis = buildBusinessAnalysis({
    stated: input.stated,
    opportunityFields: input.opportunityFields,
    auditorObservations: auditorAnalysis.observations,
  });
  const propertyAnalysis = buildPropertyAnalysis({
    stated: input.stated,
    facts: input.structuredFacts,
    reads: input.reads,
  });
  const externalResearch: ChanakyaCreditExternalResearch = {
    availability: input.webResearchAvailable ? "NOT_AVAILABLE" : "NOT_AVAILABLE",
    note: input.webResearchAvailable
      ? "External research capability exists but is not enabled for this compile path."
      : "External company research is not available in this environment.",
  };
  const gstVsFinancials = buildGstVsFinancials({ financialProfile, gstAnalysis: gstAnalysisBase });
  const gstAnalysis: ChanakyaCreditGstAnalysis = {
    ...gstAnalysisBase,
    reconciliationLimitation: buildGstReconciliationLimitation({
      gstAnalysis: gstAnalysisBase,
      gstVsFinancials,
      financialProfile,
    }),
  };
  const reconciliation = buildReconciliationRows({
    facts: input.structuredFacts,
    crossDocumentComparisons: input.crossDocumentComparisons,
    stated: input.stated,
    gstVsFinancials,
    bankVsTurnover: bankingAnalysis.bankVsTurnover,
  });
  const creditRatios: ChanakyaCreditRatios = {
    availability: "NOT_AVAILABLE",
    note: "FOIR / DSCR / LTV / leverage ratios require a configured underwriting engine — not computed in CHANAKYA credit intelligence.",
  };

  const documentsReadable = input.reads.filter(
    (r) => r.status === "content_read" || r.status === "content_read_partial",
  ).length;

  const keyPositives = buildKeyPositives({
    financialTrends,
    reconciliation,
    bankingAnalysis,
    propertyAnalysis,
    businessAnalysis,
  });
  const keyConcerns = buildKeyConcerns({
    financialTrends,
    reconciliation,
    bankingAnalysis,
    auditorAnalysis,
    financialProfile,
    reads: input.reads,
  });
  const mitigants = buildMitigants({ concerns: keyConcerns, positives: keyPositives });
  const creditAssessment = buildCreditAssessment({
    financialProfile,
    financialTrends,
    bankingAnalysis,
    businessAnalysis,
    propertyAnalysis,
    gstAnalysis,
    positives: keyPositives,
    concerns: keyConcerns,
    documentsReadable,
  });

  const internalRecommendations = buildCreditInternalRecommendations({
    financialProfile,
    bankingAnalysis,
    gstAnalysis,
    propertyAnalysis,
    reconciliation,
    auditorAnalysis,
    reads: input.reads,
  });

  const limitations = [
    ...(input.limitations ?? []),
    ...financialFactQuality.limitations.slice(0, 4),
    "Credit intelligence is advisory and read-only — never a sanction or approval.",
    "Financial numbers originate only from document intelligence extraction or stated Credit Workbench fields.",
    creditRatios.note,
    externalResearch.note,
  ];

  const availability = combineAvailability(
    financialProfile.availability,
    financialTrends.availability,
    bankingAnalysis.availability,
    gstAnalysis.availability,
    businessAnalysis.availability,
    auditorAnalysis.availability,
    propertyAnalysis.availability,
    reconciliation.availability,
  );

  return {
    availability,
    readOnly: true,
    opportunityId: input.opportunityId,
    financialProfile,
    financialFactQuality,
    financialTrends,
    bankingAnalysis,
    gstAnalysis,
    businessAnalysis,
    auditorAnalysis,
    propertyAnalysis,
    externalResearch,
    reconciliation,
    creditRatios,
    keyPositives,
    keyConcerns,
    mitigants,
    creditAssessment,
    internalRecommendations,
    limitations,
    provenance: [
      "chanakya_document_intelligence",
      "opportunity_registry",
      "credit_workbench_stated",
    ],
  };
}
