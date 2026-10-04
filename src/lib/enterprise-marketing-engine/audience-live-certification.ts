/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Audience source certification for future live send.
 * Google Sheets/workbook architecture is preserved. Uncertified sources cannot become live-eligible.
 */

import {
  MARKETING_PHASE1_LIVE_RECIPIENT_CEILING,
  MARKETING_SMTP_BLOCK,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";

export const MARKETING_AUDIENCE_LIVE_UNCERTIFIED = "AUDIENCE_NOT_CERTIFIED" as const;

export type MarketingAudienceCertificationStatus = "DRAFT" | "CERTIFIED" | "REJECTED" | "INCOMPLETE";

export type MarketingAudienceLiveCertificationInput = {
  sourceBindingId?: string | null;
  sourceWorkbookId?: string | null;
  sourceTabId?: string | null;
  authorisedWorkbookId?: string | null;
  authorised?: boolean;
  mappingConfirmed?: boolean;
  snapshotHash?: string | null;
  frozenAt?: string | null;
  eligibleCount?: number | null;
  invalidCount?: number | null;
  duplicateCount?: number | null;
  suppressedCount?: number | null;
  frozenRecipientCount?: number | null;
  certificationStatus?: MarketingAudienceCertificationStatus | null;
};

export type MarketingAudienceLiveCertification = {
  certified: boolean;
  liveEligible: false;
  status: MarketingAudienceCertificationStatus;
  sourceWorkbookId: string | null;
  sourceTabId: string | null;
  sourceBindingId: string | null;
  sourceFingerprint: string | null;
  freezeTimestamp: string | null;
  eligibleCount: number | null;
  invalidCount: number | null;
  duplicateCount: number | null;
  suppressedCount: number | null;
  frozenRecipientCount: number | null;
  reasons: string[];
};

function present(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

function counted(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function assessMarketingAudienceLiveCertification(
  input: MarketingAudienceLiveCertificationInput,
): MarketingAudienceLiveCertification {
  const reasons: string[] = [];
  const sourceWorkbookId = input.sourceWorkbookId?.trim() || null;
  const sourceTabId = input.sourceTabId?.trim() || null;
  const sourceBindingId = input.sourceBindingId?.trim() || null;
  const authorisedWorkbookId = input.authorisedWorkbookId?.trim() || null;
  const snapshotHash = input.snapshotHash?.trim() || null;
  const freezeTimestamp = input.frozenAt?.trim() || null;

  if (!present(sourceBindingId)) reasons.push("SOURCE_BINDING_MISSING");
  if (!present(sourceWorkbookId)) reasons.push("SOURCE_WORKBOOK_MISSING");
  if (!present(sourceTabId)) reasons.push("SOURCE_TAB_MISSING");
  if (input.authorised !== true) reasons.push("SOURCE_NOT_AUTHORISED");
  if (authorisedWorkbookId && sourceWorkbookId && authorisedWorkbookId !== sourceWorkbookId) {
    reasons.push("SOURCE_WORKBOOK_NOT_AUTHORISED");
  }
  if (input.mappingConfirmed !== true) reasons.push("MAPPING_NOT_CONFIRMED");
  if (!present(snapshotHash)) reasons.push("SOURCE_FINGERPRINT_MISSING");
  if (!present(freezeTimestamp)) reasons.push("SNAPSHOT_NOT_FROZEN");
  if (!counted(input.eligibleCount)) reasons.push("ELIGIBLE_COUNT_MISSING");
  if (!counted(input.invalidCount)) reasons.push("INVALID_COUNT_MISSING");
  if (!counted(input.duplicateCount)) reasons.push("DUPLICATE_COUNT_MISSING");
  if (!counted(input.suppressedCount)) reasons.push("SUPPRESSED_COUNT_MISSING");
  if (!counted(input.frozenRecipientCount)) reasons.push("FROZEN_RECIPIENT_COUNT_MISSING");
  if (input.certificationStatus !== "CERTIFIED") reasons.push(MARKETING_AUDIENCE_LIVE_UNCERTIFIED);
  if (
    counted(input.frozenRecipientCount) &&
    input.frozenRecipientCount! > MARKETING_PHASE1_LIVE_RECIPIENT_CEILING
  ) {
    reasons.push(MARKETING_SMTP_BLOCK.audienceLimitExceeded);
  }

  const certified = reasons.length === 0;
  return {
    certified,
    liveEligible: false,
    status: certified ? "CERTIFIED" : input.certificationStatus === "REJECTED" ? "REJECTED" : "INCOMPLETE",
    sourceWorkbookId,
    sourceTabId,
    sourceBindingId,
    sourceFingerprint: snapshotHash,
    freezeTimestamp,
    eligibleCount: counted(input.eligibleCount) ? input.eligibleCount! : null,
    invalidCount: counted(input.invalidCount) ? input.invalidCount! : null,
    duplicateCount: counted(input.duplicateCount) ? input.duplicateCount! : null,
    suppressedCount: counted(input.suppressedCount) ? input.suppressedCount! : null,
    frozenRecipientCount: counted(input.frozenRecipientCount) ? input.frozenRecipientCount! : null,
    reasons: certified ? [] : reasons,
  };
}

export function assertMarketingAudienceCertifiedForLiveSend(
  input: MarketingAudienceLiveCertificationInput,
): never {
  const assessment = assessMarketingAudienceLiveCertification(input);
  throw Object.assign(
    new Error(assessment.reasons[0] ?? MARKETING_AUDIENCE_LIVE_UNCERTIFIED),
    {
      statusCode: 403,
      code: MARKETING_AUDIENCE_LIVE_UNCERTIFIED,
      reasons: assessment.reasons,
      liveEligible: false,
    },
  );
}
