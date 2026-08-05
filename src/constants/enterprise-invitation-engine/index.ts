/**
 * CO-INV-001 — Enterprise Invitation Engine constants.
 */

import type {
  EnterpriseInvitationInviteeKind,
  EnterpriseInvitationStatus,
} from "@/types/enterprise-invitation-engine";

export const CO_INV_001_ENGINE_VERSION = 1;

export const ENTERPRISE_INVITATION_TOKEN_PREFIX = "einvtok_";

/** Default invitation TTL — 7 days. */
export const ENTERPRISE_INVITATION_DEFAULT_TTL_DAYS = 7;

export const ENTERPRISE_INVITATION_STATUS_LABELS: Record<
  EnterpriseInvitationStatus,
  string
> = {
  draft: "Draft",
  link_generated: "Link Generated",
  invite_sent: "Invite Sent",
  activated: "Activated",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const ENTERPRISE_INVITATION_INVITEE_KIND_LABELS: Record<
  EnterpriseInvitationInviteeKind,
  string
> = {
  wealth_partner: "Wealth Partner",
  internal_employee: "Internal Employee",
  customer: "Customer",
  lender_user: "Lender User",
  channel_partner: "Channel Partner",
  referral_partner: "Referral Partner",
};

export function buildEnterpriseInvitationPath(token: string): string {
  return `/activate/${encodeURIComponent(token)}`;
}
