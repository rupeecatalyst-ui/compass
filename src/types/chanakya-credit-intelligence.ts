/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-010 — Financial & Credit Analysis contract.
 * Evidence-first · read-only · never invents financial numbers.
 */

import type { ChanakyaFieldAvailability } from "./chanakya-enterprise-read-context";
import type {
  ChanakyaBankDocumentAvailabilityState,
  ChanakyaBankEvidenceTier,
} from "./chanakya-document-intelligence";

export type ChanakyaCreditSectionAvailability =
  | "AVAILABLE"
  | "PARTIAL"
  | "NOT_AVAILABLE";

export type ChanakyaCreditTrendDirection =
  | "UP"
  | "DOWN"
  | "FLAT"
  | "NOT_AVAILABLE";

export type ChanakyaCreditReconciliationStatus =
  | "CORROBORATED"
  | "BROADLY_CONSISTENT"
  | "VARIANCE_IDENTIFIED"
  | "INCONSISTENT"
  | "NOT_RECONCILABLE"
  /** Period/unit mismatch — values present but must not be compared as equivalents. */
  | "NOT_COMPARABLE"
  | "NOT_AVAILABLE";

/** CO-022 — lender/internal presentation outcome for GST vs financial turnover. */
export type ChanakyaGstComparisonOutcome =
  | "MATCH"
  | "VARIANCE"
  | "NOT_COMPARABLE"
  | "NOT_AVAILABLE";

export type ChanakyaGstPeriodAlignment =
  | "ALIGNED"
  | "MISMATCH"
  | "INSUFFICIENT"
  | "NOT_AVAILABLE";

export type ChanakyaCreditAssessmentState =
  | "POSITIVE"
  | "GENERALLY_POSITIVE"
  | "MIXED"
  | "CAUTION"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_AVAILABLE";

export interface ChanakyaCreditFactProvenance {
  documentId: string;
  documentName: string;
  opportunityId: string;
  section: string | null;
  financialYear: string | null;
  field: string;
  value: string;
  unit: string | null;
  extractionMethod: string;
  confidence: string;
  source: "document_intelligence";
}

export interface ChanakyaCreditFinancialFact {
  field: string;
  label: string;
  value: string;
  unit: string | null;
  financialYear: string | null;
  section: "P&L" | "Balance Sheet" | "Other";
  provenance: ChanakyaCreditFactProvenance;
}

export interface ChanakyaCreditFinancialFactQualityItem {
  metric: string;
  value: string;
  period: string | null;
  unit: string | null;
  documentId: string;
  documentName: string;
  section: string | null;
  extractionMethod: string;
  confidence: string;
  disposition: "promoted" | "downgraded" | "rejected_pattern";
  reason: string | null;
}

export interface ChanakyaCreditFinancialFactQuality {
  availability: ChanakyaCreditSectionAvailability;
  promotedCount: number;
  downgradedCount: number;
  rejectedCount: number;
  items: ChanakyaCreditFinancialFactQualityItem[];
  limitations: string[];
}

export interface ChanakyaCreditFinancialProfile {
  availability: ChanakyaCreditSectionAvailability;
  years: string[];
  factsByYear: Record<string, ChanakyaCreditFinancialFact[]>;
  allFacts: ChanakyaCreditFinancialFact[];
}

export interface ChanakyaCreditTrendPoint {
  period: string;
  value: string;
  numericValue: number | null;
}

export interface ChanakyaCreditMetricTrend {
  metric: string;
  label: string;
  available: boolean;
  trendStatus: ChanakyaCreditSectionAvailability;
  direction: ChanakyaCreditTrendDirection;
  period: string | null;
  values: ChanakyaCreditTrendPoint[];
  growthPercent: number | null;
  calculation: string | null;
  provenance: ChanakyaCreditFactProvenance[];
  interpretation: string | null;
}

export interface ChanakyaCreditChartSeries {
  available: boolean;
  points: Array<{ period: string; value: string }>;
}

export interface ChanakyaCreditFinancialTrends {
  availability: ChanakyaCreditSectionAvailability;
  metrics: ChanakyaCreditMetricTrend[];
  chartData: {
    revenue: ChanakyaCreditChartSeries;
    netProfit: ChanakyaCreditChartSeries;
    netWorth: ChanakyaCreditChartSeries;
    borrowings: ChanakyaCreditChartSeries;
  };
  interpretations: string[];
}

export interface ChanakyaCreditBankAccountSummary {
  documentId: string;
  documentName: string;
  /** CO-013 — explicit document availability state. */
  availabilityState: ChanakyaBankDocumentAvailabilityState;
  /** CO-023 — PRESENT / READABLE / FINANCIALLY_USEFUL evidence tier. */
  evidenceTier: ChanakyaBankEvidenceTier;
  /** CO-023 — when false, average balance must not be inferred from open/close. */
  statementPeriodComplete: boolean;
  bankName: string | null;
  statementPeriod: string | null;
  accountType: string | null;
  openingBalance: string | null;
  closingBalance: string | null;
  transactionCount: number | null;
  totalCredits: string | null;
  totalDebits: string | null;
  averageBalance: string | null;
  emiIndicators: string[];
  chequeReturnIndicators: string[];
  concentrationObservations: string[];
  facts: ChanakyaCreditFinancialFact[];
  provenance: ChanakyaCreditFactProvenance[];
}

export interface ChanakyaCreditBankDocumentInventoryItem {
  documentId: string;
  documentName: string;
  availabilityState: ChanakyaBankDocumentAvailabilityState;
  /** CO-023 — derived evidence tier for this document. */
  evidenceTier: ChanakyaBankEvidenceTier;
  binarySource: "inline" | "object_store" | "none";
  fileSizeBytes: number | null;
  limitation: string | null;
}

export interface ChanakyaCreditBankingTrend {
  availability: ChanakyaCreditSectionAvailability;
  direction: ChanakyaCreditTrendDirection;
  observations: string[];
}

export interface ChanakyaCreditBankVsTurnoverReconciliation {
  availability: ChanakyaCreditSectionAvailability;
  status: ChanakyaCreditReconciliationStatus;
  bankCredits: string | null;
  gstTurnover: string | null;
  financialTurnover: string | null;
  bankPeriod: string | null;
  gstPeriod: string | null;
  financialPeriod: string | null;
  explanation: string | null;
}

export interface ChanakyaCreditBankingAnalysis {
  availability: ChanakyaCreditSectionAvailability;
  /** CO-023 — highest evidence tier across bank documents reviewed. */
  evidenceTier: ChanakyaBankEvidenceTier;
  /** Per bank-statement document inventory with explicit availability states. */
  documentInventory: ChanakyaCreditBankDocumentInventoryItem[];
  accounts: ChanakyaCreditBankAccountSummary[];
  /** CO-023 — evidence-first banking trend across readable statements. */
  bankingTrend: ChanakyaCreditBankingTrend;
  aggregate: {
    totalCredits: string | null;
    totalDebits: string | null;
    averageBalance: string | null;
    minimumBalance: string | null;
    maximumBalance: string | null;
    emiIndicators: string[];
    chequeReturnIndicators: string[];
  };
  bankVsTurnover: ChanakyaCreditBankVsTurnoverReconciliation;
  limitation: string | null;
}

export interface ChanakyaCreditGstReturnSummary {
  documentId: string;
  documentName: string;
  gstin: string | null;
  /** GSTR-1 / GSTR-3B / GSTR-9 when detected from the document. */
  returnType: "GSTR-1" | "GSTR-3B" | "GSTR-9" | "UNKNOWN" | null;
  returnPeriod: string | null;
  taxableTurnover: string | null;
  taxLiability: string | null;
  /** Source table/section label from extraction provenance. */
  sourceSection: string | null;
  provenance: ChanakyaCreditFactProvenance[];
}

/** CO-019E — traceable GST material fact for proposal / internal context. */
export type ChanakyaCreditGstFieldCategory =
  | "taxable_turnover"
  | "reported_turnover"
  | "gstin_identity"
  | "other_gst";

export interface ChanakyaCreditGstMaterialFact {
  documentId: string;
  documentName: string;
  returnPeriod: string | null;
  field: string;
  label: string;
  value: string;
  unit: string | null;
  confidence: string;
  extractionMethod: string;
  category: ChanakyaCreditGstFieldCategory;
  /** False for GSTIN identity and ambiguous extractions. */
  lenderFacingEligible: boolean;
}

export interface ChanakyaCreditGstIdentitySummary {
  gstin: string | null;
  /** Return documents sharing the same GSTIN — identity corroboration only. */
  corroborationDocumentCount: number;
  note: string;
}

export interface ChanakyaCreditGstTrendPoint {
  period: string;
  taxableTurnover: string | null;
}

export interface ChanakyaCreditGstAnalysis {
  availability: ChanakyaCreditSectionAvailability;
  returns: ChanakyaCreditGstReturnSummary[];
  /** Material GST facts with full provenance — excludes duplicate GSTIN financial counting. */
  materialFacts: ChanakyaCreditGstMaterialFact[];
  identity: ChanakyaCreditGstIdentitySummary;
  /** Count of lender-facing GST financial insights (excludes GSTIN identity repetition). */
  financialInsightCount: number;
  gstTrend: {
    available: boolean;
    points: ChanakyaCreditGstTrendPoint[];
  };
  periodCoverage: string | null;
  /** Explicit limitation when GST periods cannot reconcile to financial statements. */
  reconciliationLimitation: string | null;
  /** True when monthly GST returns exist but annual aggregate is intentionally not computed. */
  annualTurnoverNotComputed: boolean;
}

export interface ChanakyaCreditGstVsFinancials {
  availability: ChanakyaCreditSectionAvailability;
  status: ChanakyaCreditReconciliationStatus;
  /** CO-022 presentation outcome — MATCH / VARIANCE / NOT_COMPARABLE / NOT_AVAILABLE. */
  comparisonOutcome: ChanakyaGstComparisonOutcome;
  /** Whether GST and financial periods are aligned for numeric comparison. */
  periodAlignment: ChanakyaGstPeriodAlignment;
  financialTurnover: string | null;
  gstTurnover: string | null;
  financialPeriod: string | null;
  gstPeriod: string | null;
  /** All GST periods considered (monthly filings stay period-wise — not annualized). */
  gstPeriodsConsidered: string[];
  explanation: string | null;
}

export interface ChanakyaCreditAuditorObservation {
  id: string;
  category: string;
  observation: string;
  provenance: ChanakyaCreditFactProvenance;
}

export interface ChanakyaCreditAuditorAnalysis {
  availability: ChanakyaCreditSectionAvailability;
  observations: ChanakyaCreditAuditorObservation[];
}

export interface ChanakyaCreditBusinessProfile {
  availability: ChanakyaCreditSectionAvailability;
  businessNature: string | null;
  constitution: string | null;
  vintage: string | null;
  location: string | null;
  businessModel: string | null;
  industry: string | null;
  operatingProfile: string | null;
  provenance: string[];
}

export interface ChanakyaCreditBusinessAnalysis {
  availability: ChanakyaCreditSectionAvailability;
  profile: ChanakyaCreditBusinessProfile;
}

export interface ChanakyaCreditExternalResearch {
  availability: ChanakyaCreditSectionAvailability;
  note: string;
}

export interface ChanakyaCreditPropertyAnalysis {
  availability: ChanakyaCreditSectionAvailability;
  propertyType: string | null;
  location: string | null;
  statedValue: string | null;
  valuationStated: string | null;
  ownershipEvidence: string | null;
  existingCharge: string | null;
  proposedSecurity: string | null;
  documentsAvailable: string[];
  valuationDocumentAvailable: boolean;
  provenance: string[];
}

export interface ChanakyaCreditReconciliationRow {
  id: string;
  field: string;
  sourceA: string;
  sourceB: string;
  valueA: string | null;
  valueB: string | null;
  status: ChanakyaCreditReconciliationStatus;
  explanation: string;
  provenance: ChanakyaCreditFactProvenance[];
}

export interface ChanakyaCreditReconciliation {
  availability: ChanakyaCreditSectionAvailability;
  rows: ChanakyaCreditReconciliationRow[];
  gstVsFinancials: ChanakyaCreditGstVsFinancials;
  bankVsTurnover: ChanakyaCreditBankVsTurnoverReconciliation;
}

export interface ChanakyaCreditRatios {
  availability: ChanakyaCreditSectionAvailability;
  note: string;
}

export interface ChanakyaCreditEvidenceItem {
  id: string;
  category: "POSITIVE" | "CONCERN" | "MITIGANT";
  statement: string;
  evidence: string[];
  provenance: ChanakyaCreditFactProvenance[];
}

export interface ChanakyaCreditAssessmentSection {
  state: ChanakyaCreditAssessmentState;
  summary: string;
}

export interface ChanakyaCreditAssessment {
  availability: ChanakyaCreditSectionAvailability;
  overallAssessment: ChanakyaCreditAssessmentSection;
  financialAssessment: ChanakyaCreditAssessmentSection;
  businessAssessment: ChanakyaCreditAssessmentSection;
  bankingAssessment: ChanakyaCreditAssessmentSection;
  securityAssessment: ChanakyaCreditAssessmentSection;
  commercialAssessment: ChanakyaCreditAssessmentSection;
  documentAssessment: ChanakyaCreditAssessmentSection;
}

export interface ChanakyaCreditInternalRecommendation {
  id: string;
  recommendation: string;
  reason: string;
  internalOnly: true;
  provenance: string;
}

/** Top-level credit intelligence contract exposed via enterprise-read and proposal gather. */
export interface ChanakyaCreditIntelligenceContext {
  availability: ChanakyaCreditSectionAvailability;
  readOnly: true;
  opportunityId: string;
  financialProfile: ChanakyaCreditFinancialProfile;
  /** CO-019F — promoted vs downgraded/rejected financial extraction quality. */
  financialFactQuality: ChanakyaCreditFinancialFactQuality;
  financialTrends: ChanakyaCreditFinancialTrends;
  bankingAnalysis: ChanakyaCreditBankingAnalysis;
  gstAnalysis: ChanakyaCreditGstAnalysis;
  businessAnalysis: ChanakyaCreditBusinessAnalysis;
  auditorAnalysis: ChanakyaCreditAuditorAnalysis;
  propertyAnalysis: ChanakyaCreditPropertyAnalysis;
  externalResearch: ChanakyaCreditExternalResearch;
  reconciliation: ChanakyaCreditReconciliation;
  creditRatios: ChanakyaCreditRatios;
  keyPositives: ChanakyaCreditEvidenceItem[];
  keyConcerns: ChanakyaCreditEvidenceItem[];
  mitigants: ChanakyaCreditEvidenceItem[];
  creditAssessment: ChanakyaCreditAssessment;
  internalRecommendations: ChanakyaCreditInternalRecommendation[];
  limitations: string[];
  provenance: string[];
}

export type ChanakyaCreditIntelligenceFieldAvailability = ChanakyaFieldAvailability;
