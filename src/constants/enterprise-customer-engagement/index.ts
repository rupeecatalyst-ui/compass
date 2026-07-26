/**
 * CO-BIZ-004 — Enterprise Customer Engagement constants.
 */

import type { EceCustomerTaskKind, EcePortalTab } from "@/types/enterprise-customer-engagement";
import type { EteWorkType } from "@/types/enterprise-task-engine";

/** ETE work types that may project as customer-facing actions (allowlist). */
export const ECE_CUSTOMER_VISIBLE_WORK_TYPES: readonly EteWorkType[] = [
  "Document Collection",
  "Reminder",
  "Follow-up",
  "Custom",
] as const;

/** Internal-only ETE work — never shown to customers. */
export const ECE_INTERNAL_WORK_TYPES: readonly EteWorkType[] = [
  "Customer Call",
  "Lender Call",
  "Verification",
  "Approval",
  "Internal Review",
  "Compliance",
  "Accounting",
] as const;

export const ECE_PORTAL_TABS: readonly { id: EcePortalTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tasks", label: "My Actions" },
  { id: "documents", label: "Documents" },
  { id: "timeline", label: "Timeline" },
  { id: "notifications", label: "Updates" },
  { id: "messages", label: "Messages" },
];

export const ECE_CX_WEIGHTS = {
  pending_actions: 0.3,
  response_times: 0.2,
  document_turnaround: 0.3,
  communication_latency: 0.2,
} as const;

export const ECE_MESSAGES_STORAGE_KEY = "catalyst-one:ece-customer-messages:v1";
export const ECE_MESSAGES_UPDATED_EVENT = "catalyst-one:ece-messages-updated";

export const ECE_CUSTOMER_SAFE_EDC_TYPES = new Set([
  "stage_change",
  "progress",
  "document_upload",
  "document_verification",
  "email",
  "notification",
  "workflow",
]);

/** Hide internal noise from customer timeline. */
export const ECE_HIDDEN_TIMELINE_TITLES = new Set([
  "Upload Link Generated",
  "Upload Link Regenerated",
  "LOD Generated",
  "Regenerated LOD",
]);

export function inferCustomerTaskKind(
  title: string,
  label?: string,
): EceCustomerTaskKind {
  const t = `${title} ${label ?? ""}`.toLowerCase();
  if (t.includes("pan")) return "upload_document";
  if (t.includes("aadhaar") || t.includes("aadhar")) return "upload_document";
  if (t.includes("kyc")) return "complete_kyc";
  if (t.includes("bank statement") || t.includes("bank stmt")) return "provide_bank_statement";
  if (t.includes("sign") || t.includes("application")) return "sign_application";
  if (t.includes("query") || t.includes("respond") || t.includes("clarif")) return "respond_to_query";
  if (t.includes("upload") || t.includes("document") || t.includes("replace")) return "upload_document";
  return "other";
}
