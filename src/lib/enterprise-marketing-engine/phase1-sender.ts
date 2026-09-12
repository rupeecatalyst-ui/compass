/**
 * CO-MARKETING-HOSTINGER-SMTP-001 — Frozen Phase 1 sender identity.
 */

import {
  MARKETING_PHASE1_FROM_EMAIL,
  MARKETING_PHASE1_FROM_NAME,
  MARKETING_PHASE1_REPLY_TO,
  MARKETING_SMTP_BLOCK,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";

export function isMarketingPhase1Sender(input: {
  fromAddress?: string | null;
  displayName?: string | null;
  replyTo?: string | null;
}): boolean {
  return (
    (input.fromAddress ?? "").trim().toLowerCase() === MARKETING_PHASE1_FROM_EMAIL &&
    (input.displayName ?? "").trim() === MARKETING_PHASE1_FROM_NAME &&
    (input.replyTo ?? "").trim().toLowerCase() === MARKETING_PHASE1_REPLY_TO
  );
}

export function assertMarketingPhase1Sender(input: {
  fromAddress?: string | null;
  displayName?: string | null;
  replyTo?: string | null;
}): void {
  if (isMarketingPhase1Sender(input)) return;
  throw Object.assign(new Error("Phase 1 live Marketing requires the approved Hostinger sender identity"), {
    statusCode: 403,
    code: MARKETING_SMTP_BLOCK.senderNotPhase1,
  });
}
