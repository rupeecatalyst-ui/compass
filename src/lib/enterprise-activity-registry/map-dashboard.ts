/**
 * CO-ORG-003 — Map EAR events → Dashboard ActivityEvent shape.
 */

import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import type { ActivityEvent } from "@/types/catalyst-one";
import { ROUTES } from "@/constants/routes";

export function mapEarEventToDashboardActivity(
  event: EnterpriseActivityEvent,
): ActivityEvent {
  let type: ActivityEvent["type"] = "system";
  let href: string = ROUTES.DASHBOARD;

  switch (event.eventKind) {
    case "tasks":
      type = "task";
      href = ROUTES.TASKS;
      break;
    case "documents":
      type = "document";
      href = ROUTES.DOCUMENTS;
      break;
    case "stage_change":
    case "opportunity":
    case "workflow":
      type = "loan";
      href = event.opportunityId
        ? `${ROUTES.MY_OPPORTUNITIES}?opportunityId=${encodeURIComponent(event.opportunityId)}`
        : ROUTES.MY_DEALS;
      break;
    case "communications":
    case "dialogue":
    case "notes":
      type = "customer";
      href = event.opportunityId
        ? `${ROUTES.MY_OPPORTUNITIES}?opportunityId=${encodeURIComponent(event.opportunityId)}`
        : event.dealId
          ? ROUTES.MY_DEALS
          : event.contactId
            ? ROUTES.CONTACTS
            : ROUTES.DASHBOARD;
      break;
    default:
      type = "system";
      href = ROUTES.DASHBOARD;
  }

  return {
    id: event.id,
    title: event.title,
    description: event.summary ?? "",
    timestamp: event.occurredAt,
    type,
    actor: event.actorName ?? undefined,
    fileId: event.dealId ?? event.opportunityId ?? undefined,
    href,
  };
}
