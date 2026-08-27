/**
 * CO-CHANAKYA-026 — Avon-style transaction executive fixtures (OPP-2026-000060).
 * CO-CHANAKYA-031 — aligned to current credit / attention contracts.
 */

import type { ChanakyaAttentionEvidenceRow } from "@/types/chanakya-enterprise-read-context";
import type {
  ChanakyaCreditAssessmentSection,
  ChanakyaCreditBankVsTurnoverReconciliation,
  ChanakyaCreditChartSeries,
  ChanakyaCreditGstVsFinancials,
  ChanakyaCreditIntelligenceContext,
} from "@/types/chanakya-credit-intelligence";
import {
  AVON_PROJECT_FINANCE_OPPORTUNITY,
  AVON_PROJECT_FINANCE_PRODUCT_RECORD,
} from "@/constants/chanakya-credit-intelligence/avon-product-lender-fixtures";

export const AVON_EXECUTIVE_OPPORTUNITY = {
  id: AVON_PROJECT_FINANCE_OPPORTUNITY.id,
  opportunityNumber: AVON_PROJECT_FINANCE_OPPORTUNITY.opportunityNumber,
  primaryContactName: "Avon Appliances Private Ltd",
  companyName: "Avon Appliances Private Ltd",
  productCode: AVON_PROJECT_FINANCE_OPPORTUNITY.productCode,
  productLabel: AVON_PROJECT_FINANCE_OPPORTUNITY.productLabel,
  requestedAmount: AVON_PROJECT_FINANCE_OPPORTUNITY.requestedAmount,
  employmentTypeCode: AVON_PROJECT_FINANCE_OPPORTUNITY.employmentTypeCode,
  cityLabel: AVON_PROJECT_FINANCE_OPPORTUNITY.cityLabel,
  lifecycleStatus: "active",
  relationshipManagerName: "RM Desk",
};

export const AVON_EXECUTIVE_DEAL = {
  id: "deal_avon_pf_060",
  dealNumber: "DEAL-2026-000082",
  lenderName: "Infra Bank A",
  grossStage: "Logged In – WIP",
  subStage: "login",
  stageEnteredAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
};

export const AVON_EXECUTIVE_RADAR_ROW: ChanakyaAttentionEvidenceRow = {
  entityKind: "deal",
  entityId: AVON_EXECUTIVE_DEAL.id,
  opportunityId: AVON_EXECUTIVE_OPPORTUNITY.id,
  dealId: AVON_EXECUTIVE_DEAL.id,
  entityLabel: "Avon Appliances Private Ltd",
  opportunityNumber: AVON_EXECUTIVE_OPPORTUNITY.opportunityNumber,
  dealNumber: AVON_EXECUTIVE_DEAL.dealNumber,
  stageLabel: "Logged In – WIP / login",
  lender: AVON_EXECUTIVE_DEAL.lenderName,
  idleDays: 8,
  pendingDocs: 4,
  quadrant: "follow_up_required",
  severity: "medium",
  classification: "follow_up_required",
  classificationReason: "Stage idle beyond operational threshold with pending documents.",
  ownerLabel: "RM Desk",
  attentionSince: new Date(Date.now() - 8 * 86_400_000).toISOString(),
  recommendedNextArea: "documents",
  why: [
    "8 day(s) without meaningful movement on lender stage.",
    "4 document requirement(s) pending on the Opportunity.",
  ],
  sources: ["chanakya_radar"],
  reasons: [],
  domainBreakdown: {},
  provenance: "chanakya_radar",
};

export const AVON_EXECUTIVE_ENTITY_ATTENTION = {
  attention: "FOLLOW_UP_REQUIRED",
  why: AVON_EXECUTIVE_RADAR_ROW.why,
  recommendedNextArea: "documents",
  matchedDeals: [AVON_EXECUTIVE_RADAR_ROW],
  provenance: "joined_existing_engines",
};

export const AVON_EXECUTIVE_DOCUMENT_READINESS = {
  status: "AVAILABLE",
  documentReadiness: {
    pending: 4,
    criticalPending: 2,
    received: 12,
  },
};

export const AVON_EXECUTIVE_CHANGE = {
  period: {
    key: "since_yesterday" as const,
    label: "Since yesterday",
    startAt: new Date(Date.now() - 86_400_000).toISOString(),
    endAt: new Date().toISOString(),
    timeZone: "Asia/Kolkata",
    startDay: "2026-08-26",
    endDay: "2026-08-27",
  },
  summary:
    "Since yesterday: 1 lender stage movement; 2 document events for OPP-2026-000060.",
  changes: [
    {
      changeId: "chg_1",
      entityKind: "deal",
      entityId: AVON_EXECUTIVE_DEAL.id,
      dealId: AVON_EXECUTIVE_DEAL.id,
      opportunityNumber: AVON_EXECUTIVE_OPPORTUNITY.opportunityNumber,
      dealNumber: AVON_EXECUTIVE_DEAL.dealNumber,
      domain: "lender_pipeline",
      changeType: "LENDER_STAGE_CHANGED",
      title: "Deal moved to Logged In – WIP / login",
      changedAt: new Date(Date.now() - 86_400_000).toISOString(),
      observedAt: new Date(Date.now() - 86_400_000).toISOString(),
      source: "enterprise_activity_registry",
      availability: "AVAILABLE",
      significance: "meaningful",
    },
  ],
  attentionChanges: [],
  domainBreakdown: {},
  provenance: ["enterprise_activity_registry"],
  limitations: [],
};

const EMPTY_CHART: ChanakyaCreditChartSeries = { available: false, points: [] };

const EMPTY_ASSESSMENT: ChanakyaCreditAssessmentSection = {
  state: "INSUFFICIENT_EVIDENCE",
  summary: "Insufficient extracted evidence to form an assessment for this section.",
};

const EMPTY_BANK_VS_TURNOVER: ChanakyaCreditBankVsTurnoverReconciliation = {
  availability: "NOT_AVAILABLE",
  status: "NOT_AVAILABLE",
  bankCredits: null,
  gstTurnover: null,
  financialTurnover: null,
  bankPeriod: null,
  gstPeriod: null,
  financialPeriod: null,
  explanation: null,
};

const EMPTY_GST_VS_FINANCIALS: ChanakyaCreditGstVsFinancials = {
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

/** Partial credit stub — honest NOT_AVAILABLE banking/financial depth for Avon executive compose. */
export const AVON_EXECUTIVE_CREDIT_STUB: ChanakyaCreditIntelligenceContext = {
  availability: "PARTIAL",
  readOnly: true,
  opportunityId: AVON_EXECUTIVE_OPPORTUNITY.id,
  financialProfile: {
    availability: "NOT_AVAILABLE",
    years: [],
    factsByYear: {},
    allFacts: [],
  },
  financialFactQuality: {
    availability: "AVAILABLE",
    promotedCount: 0,
    downgradedCount: 0,
    rejectedCount: 0,
    items: [],
    limitations: [],
  },
  financialTrends: {
    availability: "NOT_AVAILABLE",
    metrics: [],
    chartData: {
      revenue: EMPTY_CHART,
      netProfit: EMPTY_CHART,
      netWorth: EMPTY_CHART,
      borrowings: EMPTY_CHART,
    },
    interpretations: [],
  },
  bankingAnalysis: {
    availability: "NOT_AVAILABLE",
    // Empty inventory → aggregate resolver returns PRESENT; honesty is via availability.
    evidenceTier: "PRESENT",
    documentInventory: [],
    accounts: [],
    bankingTrend: {
      availability: "NOT_AVAILABLE",
      direction: "NOT_AVAILABLE",
      observations: [],
    },
    aggregate: {
      totalCredits: null,
      totalDebits: null,
      averageBalance: null,
      minimumBalance: null,
      maximumBalance: null,
      emiIndicators: [],
      chequeReturnIndicators: [],
    },
    bankVsTurnover: EMPTY_BANK_VS_TURNOVER,
    limitation: "Avon Axis statements metadata-only — banking NOT AVAILABLE.",
  },
  gstAnalysis: {
    availability: "NOT_AVAILABLE",
    returns: [],
    materialFacts: [],
    identity: {
      gstin: null,
      corroborationDocumentCount: 0,
      note: "GST returns NOT AVAILABLE for this executive fixture.",
    },
    financialInsightCount: 0,
    gstTrend: { available: false, points: [] },
    periodCoverage: null,
    reconciliationLimitation: null,
    annualTurnoverNotComputed: false,
  },
  businessAnalysis: {
    availability: "NOT_AVAILABLE",
    profile: {
      availability: "NOT_AVAILABLE",
      businessNature: null,
      constitution: null,
      vintage: null,
      location: null,
      businessModel: null,
      industry: null,
      operatingProfile: null,
      provenance: [],
    },
  },
  auditorAnalysis: { availability: "NOT_AVAILABLE", observations: [] },
  propertyAnalysis: {
    availability: "NOT_AVAILABLE",
    propertyType: null,
    location: null,
    statedValue: null,
    valuationStated: null,
    ownershipEvidence: null,
    existingCharge: null,
    proposedSecurity: null,
    documentsAvailable: [],
    valuationDocumentAvailable: false,
    provenance: [],
  },
  externalResearch: {
    availability: "NOT_AVAILABLE",
    note: "External company research is not available in this fixture.",
  },
  reconciliation: {
    availability: "NOT_AVAILABLE",
    rows: [],
    gstVsFinancials: EMPTY_GST_VS_FINANCIALS,
    bankVsTurnover: EMPTY_BANK_VS_TURNOVER,
  },
  creditRatios: {
    availability: "NOT_AVAILABLE",
    note: "FOIR / DSCR / LTV / leverage ratios require a configured underwriting engine — not computed in CHANAKYA credit intelligence.",
  },
  keyPositives: [],
  keyConcerns: [
    {
      id: "concern_bank",
      category: "CONCERN",
      statement: "Bank statements not durably readable for financial use.",
      evidence: ["chanakya_banking_intelligence"],
      provenance: [],
    },
  ],
  mitigants: [],
  creditAssessment: {
    availability: "PARTIAL",
    overallAssessment: {
      state: "INSUFFICIENT_EVIDENCE",
      summary: "Credit intelligence partial — financial and banking depth NOT AVAILABLE.",
    },
    financialAssessment: EMPTY_ASSESSMENT,
    businessAssessment: EMPTY_ASSESSMENT,
    bankingAssessment: EMPTY_ASSESSMENT,
    securityAssessment: EMPTY_ASSESSMENT,
    commercialAssessment: {
      state: "NOT_AVAILABLE",
      summary: "Commercial assessment deferred to commercial intelligence slice.",
    },
    documentAssessment: EMPTY_ASSESSMENT,
  },
  internalRecommendations: [],
  limitations: ["CO-026 Avon executive fixture — banking binary not financially useful."],
  provenance: ["chanakya_credit_intelligence"],
};

void AVON_PROJECT_FINANCE_PRODUCT_RECORD;
