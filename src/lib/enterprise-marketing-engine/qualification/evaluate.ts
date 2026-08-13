/**
 * CO-MARKETING-MKT-11 — Derive business qualification state from intent + policy.
 * Opens/clicks never become QUALIFIED. Mass conversion is not a state transition.
 */

import {
  MARKETING_DEFAULT_QUALIFICATION_POLICY,
  MARKETING_EXPLICIT_INTENTS,
  MARKETING_RESPONSE_INTENTS,
} from "@/constants/enterprise-marketing-engine/qualification";
import type {
  MarketingQualificationBusinessState,
  MarketingQualificationIntent,
  MarketingQualificationPolicy,
} from "@/types/enterprise-marketing-qualification";

export function hasMarketingIdentity(input: {
  matchEmail?: string | null;
  matchPhone?: string | null;
}): boolean {
  const email = (input.matchEmail ?? "").trim();
  const phone = (input.matchPhone ?? "").replace(/\D/g, "");
  return email.includes("@") || phone.length >= 10;
}

export function evaluateMarketingQualificationState(input: {
  intent: MarketingQualificationIntent;
  matchEmail?: string | null;
  matchPhone?: string | null;
  policy?: MarketingQualificationPolicy;
  operatorConfirmed?: boolean;
}): MarketingQualificationBusinessState {
  const policy = input.policy ?? MARKETING_DEFAULT_QUALIFICATION_POLICY;
  if (input.intent === "unsubscribe") return "SUPPRESSED";
  if (input.intent === "not_interested") return "NOT_INTERESTED";
  if (input.intent === "none") return "UNQUALIFIED";
  if (input.intent === "open" || input.intent === "click") return "ENGAGED";

  const isResponse = MARKETING_RESPONSE_INTENTS.includes(input.intent);
  if (!isResponse) return "UNQUALIFIED";

  const identityOk = !policy.requireIdentity || hasMarketingIdentity(input);
  const explicitOk =
    !policy.requireExplicitIntent || MARKETING_EXPLICIT_INTENTS.includes(input.intent);
  const confirmOk = !policy.requireOperatorConfirm || input.operatorConfirmed === true;

  if (!identityOk) return "QUALIFICATION_REQUIRED";
  if (!explicitOk) return "RESPONSE_RECEIVED";
  if (!confirmOk) return "QUALIFICATION_REQUIRED";
  return "QUALIFIED";
}

export function canHandoffMarketingQualification(
  businessState: MarketingQualificationBusinessState,
): boolean {
  return businessState === "QUALIFIED";
}
