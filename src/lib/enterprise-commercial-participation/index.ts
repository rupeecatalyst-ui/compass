/**
 * CO-OPP-003 — Commercial Participation helpers (read-only resolve).
 * Users never enter commission % on Opportunity — resolved from Wealth Partner Commercial Profile.
 */

import type { OpportunityParticipationRoleCode } from "@/constants/opportunity-business-source";
import { isOpportunityParticipationRoleCode } from "@/constants/opportunity-business-source";

export type WealthPartnerCommercialProfileInput = {
  commercialReferralSharePercent?: number | null;
  commercialSoleExecutorSharePercent?: number | null;
  commercialJointExecutorSharePercent?: number | null;
  commercialEffectiveFrom?: string | Date | null;
  commercialStatus?: string | null;
};

/**
 * Resolve % of Rupee Catalyst revenue for a Participation Role.
 * Returns null when profile inactive, missing, or role unknown — never invents %.
 */
export function resolveCommercialRevenueSharePercent(
  profile: WealthPartnerCommercialProfileInput | null | undefined,
  participationRole: string | null | undefined,
): number | null {
  if (!profile) return null;
  const status = (profile.commercialStatus ?? "active").toLowerCase();
  if (status !== "active") return null;
  if (!isOpportunityParticipationRoleCode(participationRole)) return null;
  const role = participationRole as OpportunityParticipationRoleCode;
  const raw =
    role === "referral"
      ? profile.commercialReferralSharePercent
      : role === "sole_executor"
        ? profile.commercialSoleExecutorSharePercent
        : profile.commercialJointExecutorSharePercent;
  if (raw == null || !Number.isFinite(Number(raw))) return null;
  const n = Number(raw);
  if (n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

export function commercialProfileIsConfigured(
  profile: WealthPartnerCommercialProfileInput | null | undefined,
): boolean {
  if (!profile) return false;
  return (
    profile.commercialReferralSharePercent != null ||
    profile.commercialSoleExecutorSharePercent != null ||
    profile.commercialJointExecutorSharePercent != null
  );
}
