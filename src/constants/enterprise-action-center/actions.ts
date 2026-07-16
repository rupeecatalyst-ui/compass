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
    id: "send_whatsapp",
    label: "Send WhatsApp",
    description: "Queue a WhatsApp message with an intelligent template.",
    group: "communication",
    entityTypes: ["loan", "opportunity", "customer", "wealth_partner", "lender"],
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
  "send_email",
  "send_whatsapp",
  "upload_documents",
] as const;

/** Strategic Workspace — Action Center as primary entry (nav + contacts). */
export const OPPORTUNITY_REFERENCE_ACTION_IDS = [
  "open_credit_workbench",
  "open_loan_workspace",
  "add_contact",
  "edit_contact",
  "send_email",
  "send_whatsapp",
  "upload_documents",
] as const;

export const OUTBOX_COUNTDOWN_MS = 3 * 60 * 1000;
