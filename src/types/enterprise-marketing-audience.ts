/**
 * CO-MARKETING-MKT-03 — Audience definition types (config only — never row mirror).
 */

import type {
  MarketingFilterOp,
  MarketingSuppressionReason,
} from "@/constants/enterprise-marketing-engine/audience";

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

export type MarketingFilterDefinition = {
  version: 1;
  logic: "AND" | "OR";
  rules: MarketingFilterRule[];
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
  suppressionPolicy: MarketingSuppressionPolicy;
  eligibilityRules: MarketingEligibilityRules;
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
  scanCapped: boolean;
  scanMaxRows: number;
  estimatedSourceRows: number | null;
  counts: {
    scanned: number;
    eligible: number;
    excludedByFilter: number;
    invalid: number;
    duplicate: number;
    suppressed: number;
  };
  /** Non-PII row diagnostics for operator trust (row # + issue codes only). */
  sampleDiagnostics: Array<{
    sourceRowNumber?: number;
    disposition: "eligible" | "excluded" | "invalid" | "duplicate" | "suppressed";
    issues: string[];
  }>;
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
