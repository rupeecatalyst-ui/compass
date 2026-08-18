/**
 * CO-C1-EMAIL-CONFIG-001 / CO-C1-FOLLOWUP-002 — Centrally managed Rupee Catalyst
 * corporate identity for operational communications (not Marketing Engine).
 * Organization admins override display fields via ECC profiles; this SSOT supplies
 * brand defaults reused by email signature + WhatsApp identity builders.
 */

export const RUPEE_CATALYST_CORPORATE_BRAND = {
  legalName: "Rupee Catalyst",
  tagline: "Funding Growth. Building Wealth.",
  addressLines: [
    "Rupee Catalyst",
    "India — Corporate Office",
  ] as const,
  websiteUrl: "https://www.rupeecatalyst.com",
  marketingChannels: [
    { label: "Website", url: "https://www.rupeecatalyst.com" },
    { label: "LinkedIn", url: "https://www.linkedin.com/company/rupee-catalyst" },
  ] as const,
  /** Official logo path — never redraw; presentation may resolve via asset library later. */
  logoPath: "/brand/rupee-catalyst-logo.svg",
  supportPhone: "+91 98219 84181",
} as const;

/**
 * Operational email template catalogue (extensible config — not Marketing campaign templates).
 * Codes are stable; copy may be overridden by org configuration later.
 */
export type OperationalEmailTemplateCode =
  | "welcome"
  | "document_request"
  | "followup_login"
  | "followup_status"
  | "followup_approval"
  | "followup_disbursement"
  | "followup_documents"
  | "partner_communication"
  | "lender_communication"
  | "opportunity_update"
  | "accounting_communication"
  | "invoice_communication"
  | "payout_communication"
  | "internal_notification"
  | "system_notification";

export interface OperationalEmailTemplateDef {
  code: OperationalEmailTemplateCode;
  name: string;
  description: string;
  active: boolean;
}

export const OPERATIONAL_EMAIL_TEMPLATE_CATALOG: readonly OperationalEmailTemplateDef[] = [
  {
    code: "welcome",
    name: "Welcome",
    description: "Operational welcome / onboarding message",
    active: true,
  },
  {
    code: "document_request",
    name: "Document Request",
    description: "Request pending documents from a transaction party",
    active: true,
  },
  {
    code: "followup_login",
    name: "Login Follow-up",
    description: "Follow-up on lender login status",
    active: true,
  },
  {
    code: "followup_status",
    name: "Status Follow-up",
    description: "General status follow-up for the current stage",
    active: true,
  },
  {
    code: "followup_approval",
    name: "Approval Follow-up",
    description: "Follow-up on soft / final approval",
    active: true,
  },
  {
    code: "followup_disbursement",
    name: "Disbursement Follow-up",
    description: "Follow-up on disbursement progress",
    active: true,
  },
  {
    code: "followup_documents",
    name: "Documents Follow-up",
    description: "Follow-up on outstanding documents",
    active: true,
  },
  {
    code: "partner_communication",
    name: "Partner Communication",
    description: "Operational message to Wealth Partners",
    active: true,
  },
  {
    code: "lender_communication",
    name: "Lender Communication",
    description: "Operational message to lender contacts",
    active: true,
  },
  {
    code: "opportunity_update",
    name: "Opportunity Update",
    description: "Operational opportunity / deal status update",
    active: true,
  },
  {
    code: "accounting_communication",
    name: "Accounting Communication",
    description: "Accounting / finance operational message",
    active: true,
  },
  {
    code: "invoice_communication",
    name: "Invoice Communication",
    description: "Invoice-related operational message",
    active: true,
  },
  {
    code: "payout_communication",
    name: "Payout Communication",
    description: "Payout-related operational message",
    active: true,
  },
  {
    code: "internal_notification",
    name: "Internal Notification",
    description: "Internal employee operational notification",
    active: true,
  },
  {
    code: "system_notification",
    name: "System Notification",
    description: "System / transactional notification",
    active: true,
  },
] as const;
