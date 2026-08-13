/**
 * CO-MARKETING-MKT-12 — Internal handoff notification copy + deep link (pure).
 * In-app delivery is owned by the Enterprise Notification Engine.
 */

import { ROUTES } from "@/constants/routes";
import { MARKETING_HANDOFF_REQUIRED_ACTION } from "@/constants/enterprise-marketing-engine/notification";
import type { MarketingQualificationIntent } from "@/types/enterprise-marketing-qualification";

export function marketingQualificationReason(intent: MarketingQualificationIntent): string {
  switch (intent) {
    case "explicit_requirement":
      return "Explicit business requirement confirmed by operator";
    case "enquiry":
      return "Customer enquiry received";
    case "reply":
      return "Customer reply received";
    case "not_interested":
      return "Marked not interested";
    case "unsubscribe":
      return "Suppression / unsubscribe";
    case "open":
      return "Campaign open (not a qualification by itself)";
    case "click":
      return "Campaign click (not a qualification by itself)";
    default:
      return "Operator-confirmed qualified marketing response";
  }
}

export function buildMarketingHandoffHref(input: {
  opportunityId?: string | null;
  contactId?: string | null;
}): string {
  const opportunityId = input.opportunityId?.trim();
  if (opportunityId) {
    return `${ROUTES.OPPORTUNITY_WORKSPACE}?opportunityId=${encodeURIComponent(opportunityId)}`;
  }
  const contactId = input.contactId?.trim();
  if (contactId) {
    return `${ROUTES.CONTACTS}?contactId=${encodeURIComponent(contactId)}`;
  }
  return ROUTES.ADMIN_MARKETING_RESPONSES;
}

export function buildMarketingHandoffNotificationBody(input: {
  contactName?: string | null;
  campaignName?: string | null;
  sourceLabel?: string | null;
  qualificationReason: string;
  opportunityId?: string | null;
  assigneeUserId: string;
  requiredAction?: string;
  occurredAt: string;
}): string {
  const lines = [
    `Contact/customer: ${input.contactName?.trim() || "Not Specified"}`,
    `Campaign: ${input.campaignName?.trim() || "Not Specified"}`,
    `Source: ${input.sourceLabel?.trim() || "Marketing"}`,
    `Qualification reason: ${input.qualificationReason}`,
    `Opportunity: ${input.opportunityId?.trim() || "Not Specified"}`,
    `Assigned employee: ${input.assigneeUserId}`,
    `Required action: ${input.requiredAction?.trim() || MARKETING_HANDOFF_REQUIRED_ACTION}`,
    `Timestamp: ${input.occurredAt}`,
  ];
  return lines.join("\n");
}
