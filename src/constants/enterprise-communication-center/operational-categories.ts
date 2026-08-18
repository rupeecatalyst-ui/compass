/**
 * CO-C1-OPERATIONAL-EMAIL-001 — Operational communication categories.
 * Maps business audiences to ECC profiles. Common operational senders today;
 * architecture retains room for dedicated profiles later.
 */

import type { EnterpriseCommunicationProfileCode } from "@/types/enterprise-communication-center";

export type OperationalEmailCategoryId =
  | "customer"
  | "wealth_partner"
  | "lender"
  | "internal_employee"
  | "accounting_finance"
  | "system_transactional";

export interface OperationalEmailCategoryDef {
  id: OperationalEmailCategoryId;
  label: string;
  description: string;
  /** Current ECC profile used until dedicated profiles are introduced. */
  profileCode: EnterpriseCommunicationProfileCode;
  dedicatedProfileReady: boolean;
}

export const OPERATIONAL_EMAIL_CATEGORIES: readonly OperationalEmailCategoryDef[] = [
  {
    id: "customer",
    label: "Customer",
    description: "Customer invitations, notifications, loan/document updates.",
    profileCode: "CUSTOMERS",
    dedicatedProfileReady: true,
  },
  {
    id: "wealth_partner",
    label: "Wealth Partner",
    description: "Partner invitations, activation, and operational partner mail.",
    profileCode: "CHANNEL_PARTNERS",
    dedicatedProfileReady: true,
  },
  {
    id: "lender",
    label: "Lender",
    description: "Lender operational communication (shared Connect profile until dedicated).",
    profileCode: "CUSTOMERS",
    dedicatedProfileReady: false,
  },
  {
    id: "internal_employee",
    label: "Internal Employee",
    description: "Internal operational notices (shared Connect profile until dedicated).",
    profileCode: "CUSTOMERS",
    dedicatedProfileReady: false,
  },
  {
    id: "accounting_finance",
    label: "Accounting / Finance",
    description: "Invoice and payout operational mail (shared Connect profile until dedicated).",
    profileCode: "CUSTOMERS",
    dedicatedProfileReady: false,
  },
  {
    id: "system_transactional",
    label: "System / Transactional",
    description: "System and transactional notifications (shared Connect profile until dedicated).",
    profileCode: "CUSTOMERS",
    dedicatedProfileReady: false,
  },
] as const;
