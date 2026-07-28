/**
 * CO-BIZ-005 Phase 7 — Quick actions (navigation only — Action Center remains entity context).
 */

import { ROUTES } from "@/constants/routes";
import { buildDashboardHref } from "@/lib/lead-opportunity-journey/active-context";
import type { RmQuickAction } from "@/types/enterprise-rm-workspace";

export function projectRmQuickActions(): RmQuickAction[] {
  return [
    {
      id: "call_customer",
      label: "Call Customer",
      href: ROUTES.CONTACTS,
      description: "Open Contacts to start or continue a customer call.",
    },
    {
      id: "open_opportunity",
      label: "Open Opportunity",
      href: ROUTES.MY_OPPORTUNITIES,
      description: "Jump to your Opportunity work queue.",
    },
    {
      id: "open_deal",
      label: "Open Deal",
      href: ROUTES.MY_DEALS,
      description: "Jump to your Deal registry.",
    },
    {
      id: "upload_document",
      label: "Upload Document",
      href: buildDashboardHref(ROUTES.DOCUMENT_CENTER),
      description: "Open Document Center for registry uploads.",
    },
    {
      id: "assign_task",
      label: "Assign Task",
      href: ROUTES.TASKS,
      description: "Create or assign work in the Enterprise Task Engine.",
    },
    {
      id: "create_note",
      label: "Create Note",
      href: ROUTES.MY_OPPORTUNITIES,
      description: "Open an Opportunity to add notes in context.",
    },
  ];
}
