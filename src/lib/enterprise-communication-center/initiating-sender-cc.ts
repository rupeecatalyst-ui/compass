/**
 * Manually initiated Catalyst One email must CC the authenticated user's canonical User.email.
 * Does not replace mandatory manager / RC-owner CC. Does not apply to automated system mail.
 */

import {
  canonicalizeEmail,
  dedupeRecipients,
  isValidEmailAddress,
  normalizeEmailForCompare,
} from "@/lib/enterprise-communication-center/recipient-router";
import { DOCUMENT_WORKSPACE_SENDER_CC_MISSING } from "@/constants/document-workspace-refinement-014";

export type InitiatingSenderCcInput = {
  to: string[];
  cc: string[];
  initiatingUser: {
    id: string;
    email: string | null | undefined;
    isActive?: boolean;
  };
};

export type InitiatingSenderCcResult =
  | { ok: true; to: string[]; cc: string[]; senderEmail: string; senderUserId: string }
  | { ok: false; code: "MISSING_OR_INVALID_SENDER_EMAIL"; message: string; to: string[]; cc: string[] };

export function enforceMandatoryInitiatingSenderCc(
  input: InitiatingSenderCcInput,
): InitiatingSenderCcResult {
  const email = input.initiatingUser.email?.trim() || "";
  if (input.initiatingUser.isActive === false || !isValidEmailAddress(email)) {
    return {
      ok: false,
      code: "MISSING_OR_INVALID_SENDER_EMAIL",
      message: DOCUMENT_WORKSPACE_SENDER_CC_MISSING,
      to: input.to,
      cc: input.cc,
    };
  }

  const senderEmail = canonicalizeEmail(email);
  const senderKey = normalizeEmailForCompare(senderEmail);
  const alreadyTo = input.to.some((item) => normalizeEmailForCompare(item) === senderKey);
  const { to, cc } = dedupeRecipients({
    to: input.to,
    cc: alreadyTo ? input.cc : [...input.cc, senderEmail],
  });

  return {
    ok: true,
    to,
    cc,
    senderEmail,
    senderUserId: input.initiatingUser.id,
  };
}

export function senderCcIsLocked(cc: string[], senderEmail: string): boolean {
  const key = normalizeEmailForCompare(senderEmail);
  return cc.some((item) => normalizeEmailForCompare(item) === key);
}
