/**

 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 / 003B

 * Read-only enterprise intelligence context contracts for CHANAKYA.

 * Values must never invent business facts; use FieldAvailability markers.

 */



export const CHANAKYA_ENTERPRISE_READ_MODES = [

  "summary",

  "opportunity",

  "domain",

  "enterprise",

  "transaction",

] as const;



export type ChanakyaEnterpriseReadMode =

  (typeof CHANAKYA_ENTERPRISE_READ_MODES)[number];



export const CHANAKYA_ENTERPRISE_READ_DOMAINS = [

  "executive",

  "transactions",

  "credit",

  "documents",

  "commercial",

  "relationships",

  "execution",

  "productLender",

  "research",

] as const;



export type ChanakyaEnterpriseReadDomain =

  (typeof CHANAKYA_ENTERPRISE_READ_DOMAINS)[number];



/** Honest availability — never fabricate missing values. */

export const CHANAKYA_FIELD_AVAILABILITY = {

  AVAILABLE: "AVAILABLE",

  NOT_AVAILABLE: "NOT_AVAILABLE",

  REDACTED: "REDACTED",

  NOT_APPLICABLE: "NOT_APPLICABLE",

  UNKNOWN: "UNKNOWN",

} as const;



export type ChanakyaFieldAvailability =

  (typeof CHANAKYA_FIELD_AVAILABILITY)[keyof typeof CHANAKYA_FIELD_AVAILABILITY];



/** CO-CHANAKYA-003B — attention evidence domain grouping (only domains with evidence are exposed). */

export const CHANAKYA_ATTENTION_DOMAINS = [

  "activity",

  "documents",

  "tasks",

  "lender_stage",

  "credit_readiness",

  "post_disbursement",

  "accounting",

  "sla_exception",

] as const;



export type ChanakyaAttentionDomain =

  (typeof CHANAKYA_ATTENTION_DOMAINS)[number];



export type ChanakyaProvenanceField<T = unknown> = {

  value: T | null;

  availability: ChanakyaFieldAvailability;

  sourceDomain: ChanakyaEnterpriseReadDomain | "system";

  provenance: string;

  confidence?: number | null;

  note?: string | null;

};



export type ChanakyaContextEntityRef = {

  entityKind: string;

  entityId: string;

  label?: string | null;

};



export type ChanakyaDomainContextSlice = {

  domain: ChanakyaEnterpriseReadDomain;

  status: ChanakyaFieldAvailability;

  organizationId: string | null;

  compiledAt: string;

  entityRefs: ChanakyaContextEntityRef[];

  summary: string;

  /** Normalised, privacy-safe payload (no customer mobile/email). */

  payload: Record<string, unknown>;

  limitations: string[];

};



export type ChanakyaOpportunity360Context = {

  opportunityId: string;

  opportunityNumber: string | null;

  organizationId: string | null;

  compiledAt: string;

  slices: Partial<Record<ChanakyaEnterpriseReadDomain, ChanakyaDomainContextSlice>>;

  limitations: string[];

};



export type ChanakyaDeal360Context = {

  dealId: string;

  dealNumber: string | null;

  opportunityId: string | null;

  organizationId: string | null;

  compiledAt: string;

  slices: Partial<Record<ChanakyaEnterpriseReadDomain, ChanakyaDomainContextSlice>>;

  limitations: string[];

};



/** Observable attention reason with provenance — never speculative. */

export type ChanakyaAttentionReasonEvidence = {

  domain: ChanakyaAttentionDomain;

  statement: string;

  source: string;

  entityId?: string | null;

  observedAt?: string | null;

  availability: ChanakyaFieldAvailability;

};



/** Evidence-backed attention row — not a fabricated risk score. */

/** CO-CHANAKYA-003D — supported change intelligence time windows. */

export const CHANAKYA_CHANGE_PERIODS = [
  "today",
  "since_yesterday",
  "last_7_days",
] as const;

export type ChanakyaChangePeriod =
  (typeof CHANAKYA_CHANGE_PERIODS)[number];

/** Evidence-backed change domains — only present when SSOT supplies evidence. */

export const CHANAKYA_CHANGE_DOMAINS = [
  "activity",
  "documents",
  "tasks",
  "stage",
  "lender",
  "credit_readiness",
  "post_disbursement",
  "accounting",
  "payment",
  "invoice",
  "system_exception",
] as const;

export type ChanakyaChangeDomain =
  (typeof CHANAKYA_CHANGE_DOMAINS)[number];

export const CHANAKYA_CHANGE_TYPES = [
  "STAGE_CHANGED",
  "LENDER_STAGE_CHANGED",
  "DOCUMENT_ADDED",
  "DOCUMENT_STATUS_CHANGED",
  "DOCUMENT_REQUIREMENT_CHANGED",
  "TASK_CREATED",
  "TASK_COMPLETED",
  "TASK_BECAME_OVERDUE",
  "ACTIVITY_RESUMED",
  "ACTIVITY_STOPPED",
  "INVOICE_RAISED",
  "INVOICE_SHARED",
  "PAYMENT_RECEIVED",
  "PAYMENT_STATUS_CHANGED",
  "CREDIT_NOTE_CREATED",
  "POST_DISBURSEMENT_CONFIRMATION_RECEIVED",
  "POST_DISBURSEMENT_CONFIRMATION_PENDING",
  "SYSTEM_EXCEPTION_OPENED",
  "SYSTEM_EXCEPTION_RESOLVED",
  "ACTIVITY_DETERIORATED",
] as const;

export type ChanakyaChangeType =
  (typeof CHANAKYA_CHANGE_TYPES)[number];

export type ChanakyaChangeRecord = {
  changeId: string;
  entityKind: string;
  entityId: string;
  opportunityId?: string | null;
  dealId?: string | null;
  opportunityNumber?: string | null;
  dealNumber?: string | null;
  domain: ChanakyaChangeDomain;
  changeType: ChanakyaChangeType;
  title: string;
  previousValue?: string | null;
  currentValue?: string | null;
  changedAt: string;
  source: string;
  sourceEntityId?: string | null;
  observedAt: string;
  availability: ChanakyaFieldAvailability;
  /** Reuses operational timeline / Radar meaningful-event classification — not a new score. */
  significance?: "meaningful" | "informational" | null;
};

export type ChanakyaAttentionChangeRecord = {
  changeId: string;
  domain: ChanakyaAttentionDomain | ChanakyaChangeDomain;
  changeType: ChanakyaChangeType;
  statement: string;
  previousAttention?: string | null;
  currentAttention?: string | null;
  changedAt: string;
  source: string;
  availability: ChanakyaFieldAvailability;
};

export type ChanakyaChangeIntelligenceContext = {
  availability: ChanakyaFieldAvailability;
  readOnly: true;
  period: {
    key: ChanakyaChangePeriod;
    label: string;
    startAt: string;
    endAt: string;
    timeZone: string;
    startDay: string;
    endDay: string;
  };
  summary: string;
  changes: ChanakyaChangeRecord[];
  attentionChanges: ChanakyaAttentionChangeRecord[];
  domainBreakdown: Partial<
    Record<ChanakyaChangeDomain, ChanakyaChangeRecord[]>
  >;
  provenance: string[];
  limitations: string[];
};

/** CO-CHANAKYA-003E — evidence-first lender fit (not underwriting / approval). */

export const CHANAKYA_LENDER_FIT_STATUSES = [
  "POTENTIALLY_RELEVANT",
  "CURRENTLY_ASSIGNED",
  "INSUFFICIENT_EVIDENCE",
  "NOT_AVAILABLE",
] as const;

export type ChanakyaLenderFitStatus =
  (typeof CHANAKYA_LENDER_FIT_STATUSES)[number];

export type ChanakyaLenderFitReason = {
  statement: string;
  source: string;
  availability: ChanakyaFieldAvailability;
};

/** CO-CHANAKYA-025 — persisted program fields only when SSOT contains them. */
export type ChanakyaPersistedProgramFieldEvidence = {
  programId: string;
  programCode: string;
  programLabel: string;
  ticketMin?: number | null;
  ticketMax?: number | null;
  roiPercent?: number | null;
  minRoiPercent?: number | null;
  maxRoiPercent?: number | null;
  maxLtvPercent?: number | null;
  maxFoirPercent?: number | null;
  maxDbrPercent?: number | null;
  maxTenureMonths?: number | null;
  eligibleStates?: string[] | null;
  eligibleCities?: string[] | null;
  lifecycleStatus?: string | null;
  /** Field keys with persisted non-null values (excludes identity fields). */
  populatedFields: string[];
  availability: ChanakyaFieldAvailability;
  provenance: string;
};

export type ChanakyaProgramAvailabilityEvidence = {
  programId: string;
  programCode: string;
  programLabel: string;
  parameters: ChanakyaPersistedProgramFieldEvidence;
  relationshipStatus?: "active" | "inactive" | null;
  provenance: string;
};

/** Evidence-based program fit narrative — no scoring or ranking. */
export type ChanakyaProgramFitExplanation = {
  whyMayFit: string[];
  supportingTransactionEvidence: string[];
  missingForStrongerAssessment: string[];
};

export const CHANAKYA_MATRIX_DEPTH_STATUSES = [
  "AVAILABLE",
  "INSUFFICIENT_EVIDENCE",
  "NOT_AVAILABLE",
] as const;

export type ChanakyaMatrixDepthStatus =
  (typeof CHANAKYA_MATRIX_DEPTH_STATUSES)[number];

export type ChanakyaMatrixDepthEvidence = {
  status: ChanakyaMatrixDepthStatus;
  mappedLenderCount: number;
  lendersWithPersistedProgramParameters: number;
  statement: string;
  limitations: string[];
};

export type ChanakyaTransactionLenderSnapshot = {
  productCode?: string | null;
  productName?: string | null;
  assignedLenderCount: number;
  matrixSupportedLenderCount: number;
  programAvailabilityCount: number;
  isSecured?: boolean | null;
  transactionGeography?: string | null;
  availability: ChanakyaFieldAvailability;
  provenance: string;
};

export type ChanakyaLenderFitAssessment = {
  lenderId: string;
  lenderName: string | null;
  lenderCode?: string | null;
  institutionCategory?: string | null;
  fitStatus: ChanakyaLenderFitStatus;
  dealId?: string | null;
  dealNumber?: string | null;
  currentStage?: string | null;
  stageAgeDays?: number | null;
  reasons: ChanakyaLenderFitReason[];
  supportingEvidence: string[];
  limitations: string[];
  /** Legacy flat snapshot for lender-facing formatters — derived from persisted SSOT only. */
  programParameters?: Record<string, unknown> | null;
  /** CO-CHANAKYA-025 — all persisted programs for this lender (unordered, not ranked). */
  programAvailability?: ChanakyaProgramAvailabilityEvidence[];
  /** CO-CHANAKYA-025 — evidence-based fit narrative when sufficient registry depth exists. */
  programMatch?: ChanakyaProgramFitExplanation | null;
  relationshipStatus?: "active" | "inactive" | null;
  provenance: string[];
};

export type ChanakyaProductContextEvidence = {
  productId?: string | null;
  productCode?: string | null;
  productName?: string | null;
  productCategory?: string | null;
  productType?: string | null;
  transactionProduct?: string | null;
  productStatus?: string | null;
  isSecured?: boolean | null;
  availability: ChanakyaFieldAvailability;
  provenance: string;
};

export type ChanakyaPropertyEvidence = {
  propertyType?: string | null;
  location?: string | null;
  statedValue?: string | null;
  existingLoanObligation?: string | null;
  purpose?: string | null;
  availability: ChanakyaFieldAvailability;
  provenance: string;
  note?: string | null;
};

export type ChanakyaInternalLenderFitRecommendation = {
  id: string;
  statement: string;
  source: string;
  internalOnly: true;
  availability: ChanakyaFieldAvailability;
};

export type ChanakyaProductLenderIntelligenceContext = {
  availability: ChanakyaFieldAvailability;
  readOnly: true;
  productContext: ChanakyaProductContextEvidence;
  assignedLenders: ChanakyaLenderFitAssessment[];
  matrixEvidence: {
    availability: ChanakyaFieldAvailability;
    productCode?: string | null;
    mappedLenderCount: number;
    lenders: Array<{
      lenderId: string;
      lenderCode?: string | null;
      lenderName?: string | null;
      productsSupported?: string[];
      activeRelationship: boolean;
      provenance: string;
    }>;
    limitations: string[];
  };
  /** CO-CHANAKYA-025 — matrix parameter depth (distinct from row mapping). */
  matrixDepth: ChanakyaMatrixDepthEvidence;
  transactionSnapshot: ChanakyaTransactionLenderSnapshot;
  lenderFit: ChanakyaLenderFitAssessment[];
  propertyEvidence: ChanakyaPropertyEvidence;
  missingInformation: Array<{
    field: string;
    statement: string;
    availability: ChanakyaFieldAvailability;
  }>;
  internalRecommendations: ChanakyaInternalLenderFitRecommendation[];
  summary: string;
  limitations: string[];
  provenance: string[];
};

/** CO-CHANAKYA-026 — evidence-backed transaction executive snapshot (20 sections). */

export type ChanakyaExecutiveRecommendedAction = {
  statement: string;
  traceableTo: string[];
  availability: ChanakyaFieldAvailability;
  provenance: string;
};

export type ChanakyaExecutiveEvidenceTrace = {
  section: string;
  source: string;
  statement: string;
};

export type ChanakyaTransactionExecutiveSnapshot = {
  availability: ChanakyaFieldAvailability;
  readOnly: true;
  entityKind: "opportunity" | "deal";
  scopeLabel: string | null;
  compiledAt: string;
  /** 1 — Identity */
  identity: {
    opportunityId: ChanakyaProvenanceField<string | null>;
    opportunityNumber: ChanakyaProvenanceField<string | null>;
    dealId: ChanakyaProvenanceField<string | null>;
    dealNumber: ChanakyaProvenanceField<string | null>;
    ownerLabel: ChanakyaProvenanceField<string | null>;
  };
  /** 2 — Borrower / business profile */
  borrowerProfile: {
    primaryContactName: ChanakyaProvenanceField<string | null>;
    companyName: ChanakyaProvenanceField<string | null>;
    employmentTypeCode: ChanakyaProvenanceField<string | null>;
    cityLabel: ChanakyaProvenanceField<string | null>;
    summary: string;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 3 — Product */
  product: ChanakyaProvenanceField<string | null>;
  /** 4 — Requested amount */
  requestedAmount: ChanakyaProvenanceField<number | null>;
  /** 5 — Current stage */
  currentStage: ChanakyaProvenanceField<string | null>;
  /** 6 — Lender(s) */
  lenders: ChanakyaProvenanceField<string[] | null>;
  /** 7 — Stage age */
  stageAge: ChanakyaProvenanceField<{
    idleDays: number | null;
    label: string | null;
  } | null>;
  /** 8 — Last meaningful activity */
  lastMeaningfulActivity: ChanakyaProvenanceField<string | null>;
  /** 9 — Documents */
  documents: {
    summary: string;
    pendingCount: number | null;
    criticalPendingCount: number | null;
    readableDocuments: number | null;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 10 — Tasks */
  tasks: {
    summary: string;
    openCount: number | null;
    overdueCount: number | null;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 11 — Attention (Radar / EBI classifications — no new score) */
  attention: {
    classification: string | null;
    severity: string | null;
    quadrant: string | null;
    why: string[];
    recommendedNextArea: string | null;
    summary: string;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 12 — Changes */
  changes: {
    summary: string;
    materialChangeCount: number;
    recentHeadlines: string[];
    periodLabel: string | null;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 13 — Financial intelligence */
  financialIntelligence: {
    summary: string;
    yearsAvailable: number;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 14 — GST */
  gst: {
    summary: string;
    returnCount: number;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 15 — Banking */
  banking: {
    summary: string;
    statementCount: number;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 16 — Product / Lender */
  productLender: {
    summary: string;
    matrixDepthStatus: string | null;
    assignedLenderCount: number | null;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 17 — Commercial / accounting */
  commercialAccounting: {
    summary: string;
    outstandingInvoiceCount: number | null;
    paymentReceivedCount: number | null;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 18 — Post-disbursement */
  postDisbursement: {
    summary: string;
    confirmationState: string | null;
    availability: ChanakyaFieldAvailability;
    provenance: string;
  };
  /** 19 — Missing information */
  missingInformation: string[];
  /** 20 — Recommended next human action */
  recommendedNextHumanAction: ChanakyaExecutiveRecommendedAction;
  /** Coherent narrative — not a raw API concatenation */
  executiveSynthesis: string;
  evidenceTrace: ChanakyaExecutiveEvidenceTrace[];
  limitations: string[];
  provenance: string[];
};

export type ChanakyaAttentionEvidenceRow = {

  entityKind: "opportunity" | "deal";

  entityId: string;

  opportunityId?: string | null;

  dealId?: string | null;

  entityLabel: string | null;

  opportunityNumber: string | null;

  dealNumber: string | null;

  stageLabel: string | null;

  lender: string | null;

  idleDays: number | null;

  pendingDocs: number | null;

  quadrant: string | null;

  /** Existing Radar priority / quadrant severity — not a new score. */

  severity: string | null;

  /** Existing Radar quadrant / classification label. */

  classification: string | null;

  classificationReason: string | null;

  ownerLabel: string | null;

  /** Visibility keys — used for record-level scoping; omitted from facing answers. */
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  assignedUserIds?: string[] | null;
  daysInStage?: number | null;

  attentionSince: string | null;

  recommendedNextArea: string | null;

  /** Flat observable statements for natural-language assembly. */

  why: string[];

  /** Source engines that contributed evidence. */

  sources: string[];

  /** Structured reasons with domain + provenance. */

  reasons: ChanakyaAttentionReasonEvidence[];

  /** Domains with evidence only — omitted domains have no rows. */

  domainBreakdown: Partial<

    Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>

  >;

  provenance: string;

};



/** CO-CHANAKYA-ENTERPRISE-READ-COVERAGE-047 — portfolio list row with business labels. */

export type ChanakyaPortfolioBusinessRow = ChanakyaAttentionEvidenceRow & {

  customerName: string | null;

  companyName: string | null;

  productLabel: string | null;

  requestedAmount: number | null;

  loanAmountLabel: string | null;

  activityClassification: "active" | "inactive" | null;

  businessSource: {

    sourceCode: string | null;

    sourceContactName: string | null;

    sourceCampaignLabel: string | null;

  } | null;

  wealthPartner: {

    id: string | null;

    name: string | null;

  } | null;

  latestActivityLabel: string | null;

  relationshipManagerName: string | null;

  openTasks: number | null;

};



/** CO-CHANAKYA-048 — portfolio page size aligned with enterpriseDealRepository.searchDeals cap (100). */

export const CHANAKYA_PORTFOLIO_PAGE_DEFAULT = 25;

export const CHANAKYA_PORTFOLIO_PAGE_MAX = 100;



/** CO-CHANAKYA-048 — portfolio hydration honesty + pagination metadata. */

export type ChanakyaPortfolioHydrationAvailability =

  | "AVAILABLE"

  | "TRUE_EMPTY"

  | "FALLBACK_FAILURE"

  | "NOT_AVAILABLE";



export type ChanakyaPortfolioHydrationSource = "ebi_radar" | "enterprise_deal_registry";



export type ChanakyaPortfolioPaginationMeta = {

  totalDeals: number;

  returnedCount: number;

  limit: number;

  page: number;

  hasMore: boolean;

  nextCursor: string | null;

};



export type ChanakyaPortfolioHydrationMeta = {

  source: ChanakyaPortfolioHydrationSource;

  isLiveTrusted: boolean;

  availability: ChanakyaPortfolioHydrationAvailability;

  note?: string;

  fallbackError?: string;

  pagination: ChanakyaPortfolioPaginationMeta;

};



export type ChanakyaEnterpriseReadCompileRequest = {

  mode: ChanakyaEnterpriseReadMode;

  organizationId: string;

  /** Opportunity id or opportunity number (e.g. OPP-2026-000060). */

  opportunityRef?: string | null;

  /** Deal id or deal number (e.g. DEAL-2026-000082). */

  dealRef?: string | null;

  domains?: ChanakyaEnterpriseReadDomain[];

  /** Include truncated document-intelligence excerpts (still no raw binaries). */

  includeDocumentExcerpts?: boolean;

  /** Cap for attention / list payloads. */

  limit?: number;

  /** CO-CHANAKYA-048 — portfolio page cursor (1-based page number as string). */

  portfolioPage?: number;

  /** Alias for portfolioPage from GPT query `cursor`. */

  portfolioCursor?: string | null;

  /** CO-CHANAKYA-003D — change intelligence window (defaults to last_7_days). */

  changePeriod?: ChanakyaChangePeriod | null;

  sessionId?: string | null;

  actorUserId?: string | null;

  /** Role from authenticated employee or GPT OAuth actor — drives hierarchy scope. */
  actorRole?: string | null;

  correlationId?: string | null;

  requestHint?: string | null;

  /** CO-050 — GPT Action compact lane skips heavy optional compile slices when safe. */

  gptCompactView?: import("./chatgpt-enterprise-read-compact").GptEnterpriseReadCompactView | null;

};



export type ChanakyaEnterpriseReadCompileResult = {

  mode: ChanakyaEnterpriseReadMode;

  organizationId: string;

  compiledAt: string;

  correlationId: string;

  readOnly: true;

  opportunity360: ChanakyaOpportunity360Context | null;

  deal360: ChanakyaDeal360Context | null;

  domains: ChanakyaDomainContextSlice[];

  enterpriseSummary: Record<string, unknown> | null;

  transactionAttention: Record<string, unknown> | null;

  /** CO-CHANAKYA-003D — evidence-first change intelligence ("What changed?"). */

  changeIntelligence: ChanakyaChangeIntelligenceContext | null;

  /** CO-CHANAKYA-003E — Product & Lender intelligence (evidence-first fit). */

  productLenderIntelligence: ChanakyaProductLenderIntelligenceContext | null;

  /** CO-CHANAKYA-CREDIT-INTELLIGENCE-010 — Financial & credit analysis (evidence-first). */

  creditIntelligence: import("./chanakya-credit-intelligence").ChanakyaCreditIntelligenceContext | null;

  /** CO-CHANAKYA-026 — Transaction executive snapshot (20 evidence sections). */

  transactionExecutiveSnapshot: ChanakyaTransactionExecutiveSnapshot | null;

  privacy: {

    customerMobile: "REDACTED_OR_OMITTED";

    customerEmail: "REDACTED_OR_OMITTED";

    documentBinaries: "SERVER_CONTROLLED_NOT_RETURNED";

  };

  limitations: string[];

};



export type ChanakyaEnterpriseReadAuditEvent = {

  eventId: string;

  recordedAt: string;

  actorUserId: string | null;

  sessionId: string | null;

  correlationId: string;

  mode: ChanakyaEnterpriseReadMode;

  domains: ChanakyaEnterpriseReadDomain[];

  entityScope: string | null;

  organizationId: string;

  outcome: "success" | "denied" | "error" | "not_found";

  summary: string;

};

