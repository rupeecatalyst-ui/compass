/**
 * CO-MARKETING-MKT-03 — Audience definition types (config only — never row mirror).
 */

import type {
  MarketingFilterOp,
  MarketingSuppressionReason,
} from "@/constants/enterprise-marketing-engine/audience";
import type {
  MarketingColumnMap,
  MarketingConfirmedColumnMapping,
} from "@/types/enterprise-marketing-durability";

export type MarketingFilterRule = {
  id: string;
  /**
   * Source column header, or special tokens:
   * `__email__` | `__phone__` resolve via detected columns.
   */
  field: string;
  op: MarketingFilterOp;
  value?: string | string[];
};

/** Next unassigned eligible recipients from one workbook tab. Absent means the full selected dataset. */
export type MarketingAudienceSegmentClause = {
  mode: "next_unassigned";
  /** Capped by the phase-1 audience ceiling at scan time. */
  eligibleCap: number;
};

export type MarketingFilterDefinition = {
  version: 1;
  logic: "AND" | "OR";
  rules: MarketingFilterRule[];
  segment?: MarketingAudienceSegmentClause | null;
};

export type MarketingSuppressionPolicy = {
  /** Apply org suppression ledger during eligibility. */
  applyOrgSuppression: boolean;
  /** If empty and applyOrgSuppression, all reasons apply. */
  reasons: MarketingSuppressionReason[];
};

export type MarketingEligibilityRules = {
  requireIdentity: boolean;
  requireValidEmailIfPresent: boolean;
  excludeDuplicatesInScan: boolean;
  /** When true, skip identities already sent/delivered on a prior campaign in this org. */
  excludePreviouslyContacted?: boolean;
  /**
   * When true, only a verifiable granted consent value is eligible.
   * Missing or unknown permission is excluded. It is never treated as granted.
   * Absent or false preserves the current organisation consent policy.
   */
  requireVerifiableMarketingPermission?: boolean;
};

export type MarketingAudienceDefinition = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  bindingId: string;
  datasetId: string;
  /** Display cache only — tabs remain dynamically discovered. */
  datasetDisplayName?: string | null;
  filterDefinition: MarketingFilterDefinition;
  /** Rows matching exclusion rules are removed even if they pass inclusion. */
  exclusionDefinition: MarketingFilterDefinition;
  columnMap: MarketingColumnMap | null;
  mapping: MarketingConfirmedColumnMapping | null;
  mappingConfirmed: boolean;
  suppressionPolicy: MarketingSuppressionPolicy;
  eligibilityRules: MarketingEligibilityRules;
  lastSnapshotId?: string | null;
  lastSnapshotHash?: string | null;
  campaignId?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Preview response — counts + fields; no unnecessary PII. */
export type MarketingAudiencePreviewResult = {
  audienceId?: string | null;
  bindingId: string;
  datasetId: string;
  availableFields: string[];
  detectedColumns: {
    emailColumn: string | null;
    phoneColumn: string | null;
    externalKeyColumn: string | null;
  };
  scannedRows: number;
  /** False when an approval scan stopped before the source dataset was exhausted. */
  scanComplete: boolean;
  audienceLimitStatus: "within_limit" | "over_limit";
  scanCapped: boolean;
/** Preview diagnostics may paginate; 0 means the approval/full scan had no cap. */
  scanMaxRows: number;
  estimatedSourceRows: number | null;
  mappingConfirmed: boolean;
  usingSuggestedMapping: boolean;
  counts: {
    totalRows: number;
    scanned: number;
    validEmails: number;
    invalidEmails: number;
    /** Null when the scan stopped early and the eligible audience was not calculated. */
    eligible: number | null;
    excludedByFilter: number;
    invalid: number;
    duplicate: number;
    suppressed: number;
    previouslyContacted: number;
  };
  /** Non-PII row diagnostics for operator trust (row # + issue codes only). */
  sampleDiagnostics: Array<{
    sourceRowNumber?: number;
    disposition:
      | "eligible"
      | "excluded"
      | "invalid"
      | "duplicate"
      | "suppressed"
      | "previously_contacted"
      | "already_assigned";
    issues: string[];
  }>;
  /** Allowlisted mapped fields from eligible preview rows — never mobile/consent/email. */
  sampleRecipients: import("@/lib/enterprise-marketing-engine/personalisation-catalogue").MarketingPersonalisationSampleRecipient[];
  notice: string;
};

export type MarketingSuppressionRecord = {
  id: string;
  organizationId: string;
  fingerprint: string;
  reason: MarketingSuppressionReason;
  channel?: "EMAIL" | "WHATSAPP" | "ALL";
  note?: string | null;
  createdAt: string;
};
