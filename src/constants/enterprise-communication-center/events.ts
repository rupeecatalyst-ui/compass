/**
 * CO-ECC-001 — Event → Communication Profile mapping (SSOT).
 * Modules emit an event type; ECC resolves the sender profile.
 */
import type {
  EnterpriseCommunicationEventMapping,
  EnterpriseCommunicationEventType,
  EnterpriseCommunicationProfileCode,
} from "@/types/enterprise-communication-center";

export const ECC_EVENT_MAPPINGS: readonly EnterpriseCommunicationEventMapping[] = [
  {
    eventType: "wealth_partner_invitation",
    label: "Wealth Partner Invite",
    profileCode: "CHANNEL_PARTNERS",
    description: "Invitation / activation emails for Wealth Partners",
  },
  {
    eventType: "wealth_partner_activation",
    label: "Wealth Partner Activation",
    profileCode: "CHANNEL_PARTNERS",
    description: "Post-activation and onboarding partner messages",
  },
  {
    eventType: "channel_partner_communication",
    label: "Channel Partner Communication",
    profileCode: "CHANNEL_PARTNERS",
    description: "General channel partner outreach",
  },
  {
    eventType: "referral_partner_communication",
    label: "Referral Partner Communication",
    profileCode: "CHANNEL_PARTNERS",
    description: "Referral associate communications",
  },
  {
    eventType: "partner_announcement",
    label: "Partner Announcement",
    profileCode: "CHANNEL_PARTNERS",
    description: "Broadcast announcements to partners",
  },
  {
    eventType: "customer_invitation",
    label: "Customer Invitation",
    profileCode: "CUSTOMERS",
    description: "Customer portal / engagement invitations",
  },
  {
    eventType: "customer_notification",
    label: "Customer Notification",
    profileCode: "CUSTOMERS",
    description: "General customer notifications",
  },
  {
    eventType: "loan_status_update",
    label: "Loan Status Update",
    profileCode: "CUSTOMERS",
    description: "Loan stage and status updates to customers",
  },
  {
    eventType: "document_request",
    label: "Document Request",
    profileCode: "CUSTOMERS",
    description: "Document collection requests to customers",
  },
  {
    eventType: "customer_communication",
    label: "Customer Communication",
    profileCode: "CUSTOMERS",
    description: "General customer communications",
  },
] as const;

export function resolveProfileCodeForEvent(
  eventType: EnterpriseCommunicationEventType,
): EnterpriseCommunicationProfileCode {
  const row = ECC_EVENT_MAPPINGS.find((m) => m.eventType === eventType);
  if (!row) {
    throw new Error(`No Communication Profile mapped for event: ${eventType}`);
  }
  return row.profileCode;
}

/** Email templates reference a profile (or event) — never a literal From address. */
export const ECC_EMAIL_TEMPLATE_PROFILE_REFS = {
  enterprise_invitation_activation: {
    eventType: "wealth_partner_invitation" as const,
    profileCode: "CHANNEL_PARTNERS" as const,
  },
  document_request_customer: {
    eventType: "document_request" as const,
    profileCode: "CUSTOMERS" as const,
  },
} as const;
