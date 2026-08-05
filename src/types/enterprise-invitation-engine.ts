/**
 * CO-INV-001 — Enterprise Invitation Engine domain types.
 * Reusable across Wealth Partner, Employees, Customers, Lender Users, Channel / Referral Partners.
 */
export type EnterpriseInvitationInviteeKind =
  | "wealth_partner"
  | "internal_employee"
  | "customer"
  | "lender_user"
  | "channel_partner"
  | "referral_partner";

export type EnterpriseInvitationStatus =
  | "draft"
  | "link_generated"
  | "invite_sent"
  | "activated"
  | "expired"
  | "cancelled";

export type EnterpriseInvitationAuditEvent =
  | "link_generated"
  | "invite_sent"
  | "resent"
  | "activated"
  | "cancelled"
  | "expired";

export type EnterpriseInvitationRedirectTarget = "catalyst_connect" | "catalyst_one" | "custom";

export interface EnterpriseInvitationRecord {
  id: string;
  organizationId: string;
  inviteeKind: EnterpriseInvitationInviteeKind;
  entityId: string;
  entityLabel?: string | null;
  recipientEmail: string;
  recipientName: string;
  status: EnterpriseInvitationStatus;
  /** Present only immediately after generate / regenerate — never reloaded from storage. */
  activationToken?: string | null;
  expiresAt: string;
  activatedAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  maxUses: number;
  useCount: number;
  previousInvitationId?: string | null;
  redirectTarget: EnterpriseInvitationRedirectTarget;
  customRedirectUrl?: string | null;
  lastSentAt?: string | null;
  deliveryMode?: "simulated" | "queued" | "live" | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseInvitationAuditRecord {
  id: string;
  organizationId: string;
  invitationId: string;
  eventType: EnterpriseInvitationAuditEvent;
  actorUserId?: string | null;
  actorLabel: string;
  detail?: string | null;
  createdAt: string;
}

export interface EnterpriseCommunicationSenderConfig {
  organizationId: string;
  displayName: string;
  senderEmail: string;
  supportEmail: string;
  supportPhone?: string | null;
  modifiedBy: string;
  updatedAt: string;
}

export interface InvitationEmailPayload {
  subject: string;
  html: string;
  text: string;
  fromDisplayName: string;
  fromEmail: string;
  toEmail: string;
  toName: string;
}

export interface ActivateInvitationInput {
  token: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  fullName?: string;
  mobile?: string;
  profileCity?: string;
}

export interface ActivateInvitationResult {
  invitationId: string;
  inviteeKind: EnterpriseInvitationInviteeKind;
  entityId: string;
  redirectUrl: string;
  recipientEmail: string;
}
