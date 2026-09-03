/**
 * CO-C1-ACTIVITY-DIALOGUE-TIMELINE-010 — presentation constants.
 * EAR remains the chronology SSOT. This is display configuration only.
 */

import type {
  DetailedTimelineEventType,
  DetailedTimelineStatusFilter,
} from "@/types/activity-dialogue-timeline";

export const ACTIVITY_DIALOGUE_TIMELINE_SPRINT =
  "CO-C1-ACTIVITY-DIALOGUE-TIMELINE-010";

export const ACTIVITY_DIALOGUE_TIMELINE_PAGE_SIZE = 40;
/** Maximum rows requested from the database for one page (page size + look-ahead). */
export const ACTIVITY_DIALOGUE_TIMELINE_MAX_PAGE_SIZE = 100;
export const ACTIVITY_DIALOGUE_TIMELINE_DISPLAY_TIMEZONE = "Asia/Kolkata";

export const ACTIVITY_DIALOGUE_TIMELINE_RESTORE_KEY =
  "catalyst-one:activity-dialogue-timeline:010:restore";

export const DETAILED_TIMELINE_EVENT_TYPE_LABELS: Record<
  DetailedTimelineEventType | "all",
  string
> = {
  all: "All event types",
  communications: "Communications",
  activities: "Activities",
  notes: "Notes",
  documents: "Documents",
  tasks: "Tasks",
  stage_changes: "Stage Changes",
  assignment_changes: "Assignment Changes",
  accounting: "Accounting",
  system_events: "System Events",
};

export const DETAILED_TIMELINE_STATUS_LABELS: Record<
  DetailedTimelineStatusFilter,
  string
> = {
  all: "Any status",
  needs_attention: "Needs attention",
  queued: "Queued",
  delivered: "Delivered",
  completed: "Completed",
  pending_review: "Pending review",
  failed: "Failed",
};

/** Human-readable source workspace — never a raw sourceSystem code as the heading. */
export const DETAILED_TIMELINE_SOURCE_WORKSPACE: Record<string, string> = {
  deal_timeline: "Lender Workflow",
  deal_activity: "Deal Workspace",
  deal_control: "Deal Control",
  document: "Document Workspace",
  document_request: "Document Workspace",
  document_workspace: "Document Workspace",
  customer_portal: "Customer Document Portal",
  customer_document_portal: "Customer Document Portal",
  outbox: "Outbox",
  ence: "Outbox",
  ecie: "Communications",
  inbound_email: "Incoming Email",
  ete: "Task Engine",
  tasks: "Tasks",
  business_notes: "Business Notes",
  opportunity: "Opportunity Workspace",
  opportunity_workspace: "Opportunity Workspace",
  accounting: "Accounting",
  workflow: "Workflow Engine",
  org: "Organisation",
  partner: "Wealth Partner",
  manual: "Manual entry",
  edc: "Dialogue Center",
};

export const DETAILED_TIMELINE_SYSTEM_PROCESS: Record<string, string> = {
  outbox: "the Outbox delivery service",
  ence: "the Outbox delivery service",
  deal_timeline: "Deal stage workflow automation",
  workflow: "the Workflow Engine",
  org: "an organisation policy rule",
  accounting: "the Accounting posting process",
  document_request: "Document Request automation",
  ete: "Task Engine automation",
  inbound_email: "Inbound email matching",
};

export const DETAILED_TIMELINE_EXCLUDED_SOURCES = [
  "sticky_notes",
  "private_sticky_note",
  "chanakya",
  "chanakya_conversation",
  "chanakya_chat",
] as const;

export const DETAILED_TIMELINE_EXCLUDED_KINDS = [
  "chanakya",
  "mission_control",
] as const;
