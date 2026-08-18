import type { ActionCenterActionDef, ActionCenterEntityType } from "@/types/enterprise-action-center";

/** Catalog of Action Center actions — availability is context-filtered at runtime. */
export const ACTION_CENTER_CATALOG: Array<
  Omit<ActionCenterActionDef, "available" | "reason"> & {
    entityTypes: ActionCenterEntityType[];
  }
> = [
  {
    id: "send_email",
    label: "Send Email",
    description: "Compose a context-aware email without leaving this workspace.",
    group: "communication",
    entityTypes: ["loan", "opportunity", "customer", "wealth_partner", "lender"],
  },
  {
    id: "email_lender",
    label: "Email to Lender",
    description: "Email the assigned lender relationship manager for this Deal.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "email_customer",
    label: "Email to Customer",
    description: "Email the primary borrower on this Opportunity.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "email_partner",
    label: "Email to Partner",
    description: "Email the Channel Partner / Wealth Partner / CA linked to this Deal.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "email_source",
    label: "Email to Source",
    description: "Email the original referral source when available.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "send_whatsapp",
    label: "Send WhatsApp",
    description: "Queue a WhatsApp message with an intelligent template.",
    group: "communication",
    entityTypes: ["loan", "opportunity", "customer", "wealth_partner", "lender"],
  },
  {
    id: "whatsapp_lender",
    label: "WhatsApp to Lender",
    description: "Message the lender RM on WhatsApp for this Deal.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "whatsapp_customer",
    label: "WhatsApp to Customer",
    description: "Message the primary borrower on WhatsApp.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "send_sms",
    label: "SMS",
    description: "Send an SMS without leaving this workspace.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "schedule_meeting",
    label: "Schedule Meeting",
    description: "Schedule a meeting with a Deal participant.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "internal_chat",
    label: "Internal Chat",
    description: "Open internal team chat for this Deal.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "share_documents",
    label: "Share Documents",
    description: "Share Deal documents with a resolved recipient.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "request_documents",
    label: "Request Documents",
    description: "Request missing documents from Customer or Partner.",
    group: "communication",
    entityTypes: ["loan"],
  },
  {
    id: "add_activity",
    label: "Add Activity",
    description: "Log a typed or voice conversation activity without leaving this workspace.",
    group: "communication",
    entityTypes: ["loan", "opportunity", "customer"],
  },
  {
    id: "view_activity",
    label: "Activity",
    description: "Open the chronological activity history for this Deal.",
    group: "navigation",
    entityTypes: ["loan"],
  },
  {
    id: "upload_documents",
    label: "Upload Documents",
    description: "Collect and update the transaction document checklist in place.",
    group: "documents",
    entityTypes: ["loan", "opportunity", "customer"],
  },
  {
    id: "generate_proposal",
    label: "Generate Proposal",
    description: "Prepare a proposal pack for the current case.",
    group: "workflow",
    entityTypes: ["loan", "opportunity"],
  },
  {
    id: "notify_senior",
    label: "Notify Senior",
    description: "Escalate a note to the reporting hierarchy.",
    group: "workflow",
    entityTypes: ["loan", "opportunity"],
  },
  {
    id: "assign_user",
    label: "Assign User",
    description: "Reassign ownership for this transaction.",
    group: "workflow",
    entityTypes: ["loan", "opportunity", "customer"],
  },
  {
    id: "schedule_followup",
    label: "Schedule Follow-up",
    description: "Create a timed follow-up task in context.",
    group: "workflow",
    entityTypes: ["loan", "opportunity", "customer", "wealth_partner"],
  },
  {
    id: "ask_chanakya",
    label: "Ask Chanakya",
    description: "Open Chanakya guidance for this transaction.",
    group: "intelligence",
    entityTypes: ["loan", "opportunity", "customer", "wealth_partner", "lender"],
  },
  {
    id: "view_commercial_summary",
    label: "View Commercial Summary",
    description: "Review commercial participation for this case.",
    group: "commercial",
    entityTypes: ["loan", "opportunity", "wealth_partner"],
  },
  {
    id: "open_credit_workbench",
    label: "Open Credit Workbench",
    description: "Continue credit evaluation without leaving this opportunity context.",
    group: "navigation",
    entityTypes: ["opportunity"],
  },
  {
    id: "open_loan_workspace",
    label: "Open Loan Workspace",
    description: "Enter the loan execution workspace for this opportunity.",
    group: "navigation",
    entityTypes: ["opportunity"],
  },
  {
    id: "add_contact",
    label: "Add Contact",
    description: "Create a contact linked to this opportunity.",
    group: "navigation",
    entityTypes: ["opportunity"],
  },
  {
    id: "edit_contact",
    label: "Edit Contact",
    description: "Update the primary contact for this opportunity.",
    group: "navigation",
    entityTypes: ["opportunity"],
  },
];

/** Reference implementation actions available in Loan Workspace. */
export const LOAN_REFERENCE_ACTION_IDS = [
  "add_activity",
  "send_email",
  "send_whatsapp",
  "upload_documents",
] as const;

/**
 * CO-UX-015 — Deal Workspace Action Center.
 * Email targets are enabled; future channels appear in catalog as Coming soon.
 */
export const DEAL_REFERENCE_ACTION_IDS = [
  "view_activity",
  "add_activity",
  "email_lender",
  "email_customer",
  "email_partner",
  "email_source",
  "send_email",
  "send_whatsapp",
  "upload_documents",
] as const;

/** Strategic Workspace — Action Center as primary entry (nav + contacts). */
export const OPPORTUNITY_REFERENCE_ACTION_IDS = [
  "add_activity",
  "open_credit_workbench",
  "open_loan_workspace",
  "add_contact",
  "edit_contact",
  "send_email",
  "send_whatsapp",
  "upload_documents",
] as const;

export const OUTBOX_COUNTDOWN_MS = 3 * 60 * 1000;

