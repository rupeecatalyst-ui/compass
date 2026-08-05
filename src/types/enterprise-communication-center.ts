/**
 * CO-ECC-001 — Enterprise Communication Center domain types.
 */
export type EnterpriseCommunicationProfileCode =
  | "CHANNEL_PARTNERS"
  | "CUSTOMERS";

/** Modules specify a communication event — never a raw email address. */
export type EnterpriseCommunicationEventType =
  | "wealth_partner_invitation"
  | "wealth_partner_activation"
  | "channel_partner_communication"
  | "referral_partner_communication"
  | "partner_announcement"
  | "customer_invitation"
  | "customer_notification"
  | "loan_status_update"
  | "document_request"
  | "customer_communication";

export type EnterpriseCommunicationSmtpProvider =
  | "none"
  | "smtp"
  | "ses"
  | "sendgrid"
  | "resend"
  | "other";

export interface EnterpriseCommunicationProfileRecord {
  id: string;
  organizationId: string;
  profileCode: EnterpriseCommunicationProfileCode;
  displayName: string;
  senderEmail: string;
  replyToEmail?: string | null;
  smtpProvider: EnterpriseCommunicationSmtpProvider;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  /** True when a credential is stored — never return the secret to clients. */
  smtpCredentialConfigured: boolean;
  signature?: string | null;
  footer?: string | null;
  logoUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  usedFor: string[];
  active: boolean;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseCommunicationEventMapping {
  eventType: EnterpriseCommunicationEventType;
  label: string;
  profileCode: EnterpriseCommunicationProfileCode;
  description: string;
}

export interface ResolvedCommunicationIdentity {
  eventType?: EnterpriseCommunicationEventType;
  profileCode: EnterpriseCommunicationProfileCode;
  displayName: string;
  senderEmail: string;
  replyToEmail: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  signature: string | null;
  footer: string | null;
  logoUrl: string | null;
  active: boolean;
  source: "org_profile" | "profile_seed";
}

export interface UpdateCommunicationProfileInput {
  displayName?: string;
  senderEmail?: string;
  replyToEmail?: string | null;
  smtpProvider?: EnterpriseCommunicationSmtpProvider;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  /** Omit to leave unchanged; empty string clears. */
  smtpPassword?: string | null;
  signature?: string | null;
  footer?: string | null;
  logoUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  usedFor?: string[];
  active?: boolean;
  modifiedBy: string;
}
