/**
 * Dedicated Document Workspace — presentation identity over Enterprise Document Registry.
 * Not a second document store. Opportunity Documents stage remains the journey view.
 */

export const DOCUMENT_WORKSPACE_TITLE = "Document Workspace";
export const DOCUMENT_WORKSPACE_SUBTITLE =
  "Enterprise Document Registry · Single Source of Truth";

export const DOCUMENT_WORKSPACE_OWNER_TABS = [
  { id: "primary", label: "Primary Applicant" },
  { id: "co_applicants", label: "Co-Applicants" },
  { id: "guarantors", label: "Guarantors" },
  { id: "business", label: "Business / Entity" },
  { id: "shared", label: "Shared Transaction" },
  { id: "property", label: "Property / Security" },
] as const;

export type DocumentWorkspaceOwnerTabId =
  (typeof DOCUMENT_WORKSPACE_OWNER_TABS)[number]["id"];

export const DOCUMENT_WORKSPACE_REVIEW_STATUSES = [
  { id: "pending", label: "Pending" },
  { id: "received", label: "Received" },
  { id: "under_review", label: "Under Review" },
  { id: "accepted", label: "Accepted" },
  { id: "rejected", label: "Rejected" },
  { id: "expired", label: "Expired" },
  { id: "replacement_requested", label: "Replacement requested" },
] as const;

export type DocumentWorkspaceReviewStatus =
  (typeof DOCUMENT_WORKSPACE_REVIEW_STATUSES)[number]["id"];

export const DOCUMENT_WORKSPACE_ACTION_IDS = [
  "request_selected",
  "request_all_pending",
  "custom_email",
  "template_email",
  "whatsapp",
  "create_task",
  "schedule_followup",
  "download_selected",
  "download_pack",
  "send_to_lender",
] as const;

export type DocumentWorkspaceActionId =
  (typeof DOCUMENT_WORKSPACE_ACTION_IDS)[number];

export const DOCUMENT_WORKSPACE_ACTIONS: ReadonlyArray<{
  id: DocumentWorkspaceActionId;
  label: string;
}> = [
  { id: "request_selected", label: "Request Selected" },
  { id: "request_all_pending", label: "Request All Pending" },
  { id: "custom_email", label: "Custom Email" },
  { id: "template_email", label: "Template Email" },
  { id: "whatsapp", label: "WhatsApp / Message" },
  { id: "create_task", label: "Create Task" },
  { id: "schedule_followup", label: "Schedule Follow-up" },
  { id: "download_selected", label: "Download Selected" },
  { id: "download_pack", label: "Download Pack" },
  { id: "send_to_lender", label: "Send to Lender" },
];

export const DOCUMENT_WORKSPACE_PREFS_KEY = "catalyst-one:document-workspace:prefs";
