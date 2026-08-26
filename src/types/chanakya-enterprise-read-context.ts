/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002
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

/** Evidence-backed attention row — not a fabricated risk score. */
export type ChanakyaAttentionEvidenceRow = {
  entityKind: "opportunity" | "deal";
  entityId: string;
  entityLabel: string | null;
  opportunityNumber: string | null;
  dealNumber: string | null;
  stageLabel: string | null;
  lender: string | null;
  idleDays: number | null;
  pendingDocs: number | null;
  quadrant: string | null;
  classificationReason: string | null;
  why: string[];
  provenance: string;
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
  sessionId?: string | null;
  actorUserId?: string | null;
  correlationId?: string | null;
  requestHint?: string | null;
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
