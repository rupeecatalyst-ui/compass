/**
 * CO-MARKETING-HOSTINGER-SMTP-001 — Phase 1 live audience ceiling (50). Fail closed. Never truncate.
 */

import {
  MARKETING_PHASE1_LIVE_RECIPIENT_CEILING,
  MARKETING_SMTP_BLOCK,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";

export function assessMarketingPhase1LiveAudienceCeiling(recipientCount: number): {
  ok: boolean;
  code: string | null;
  ceiling: typeof MARKETING_PHASE1_LIVE_RECIPIENT_CEILING;
  recipientCount: number;
} {
  const count = Number.isFinite(recipientCount) ? recipientCount : Number.POSITIVE_INFINITY;
  if (count > MARKETING_PHASE1_LIVE_RECIPIENT_CEILING) {
    return {
      ok: false,
      code: MARKETING_SMTP_BLOCK.audienceLimitExceeded,
      ceiling: MARKETING_PHASE1_LIVE_RECIPIENT_CEILING,
      recipientCount: count,
    };
  }
  return {
    ok: true,
    code: null,
    ceiling: MARKETING_PHASE1_LIVE_RECIPIENT_CEILING,
    recipientCount: count,
  };
}

export function assertMarketingPhase1LiveAudienceCeiling(recipientCount: number): void {
  const assessment = assessMarketingPhase1LiveAudienceCeiling(recipientCount);
  if (assessment.ok) return;
  throw Object.assign(
    new Error(
      `Phase 1 live Marketing campaigns cannot exceed ${MARKETING_PHASE1_LIVE_RECIPIENT_CEILING} recipients.`,
    ),
    { statusCode: 403, code: MARKETING_SMTP_BLOCK.audienceLimitExceeded, ...assessment },
  );
}
