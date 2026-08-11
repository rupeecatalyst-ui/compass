/**
 * CO-ORG-003 — Map EAR → Mission Control Situation Room activity feed.
 */

import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import type { ActivityFeedItem, SituationSeverity } from "@/mission-control/situation-room/types";

function severityForKind(kind: string): SituationSeverity {
  if (kind === "stage_change" || kind === "workflow") return "medium";
  if (kind === "tasks") return "high";
  if (kind === "documents") return "medium";
  if (kind === "chanakya" || kind === "mission_control") return "info";
  return "low";
}

function categoryForKind(kind: string): string {
  switch (kind) {
    case "tasks":
      return "Tasks";
    case "documents":
      return "Documents";
    case "stage_change":
    case "workflow":
      return "Operations";
    case "communications":
    case "dialogue":
    case "notes":
      return "Communications";
    case "chanakya":
      return "CHANAKYA";
    case "mission_control":
      return "Mission Control";
    case "opportunity":
      return "Opportunity";
    default:
      return "Enterprise";
  }
}

export function mapEarEventToMissionControlActivity(
  event: EnterpriseActivityEvent,
): ActivityFeedItem {
  return {
    id: event.id,
    timestamp: event.occurredAt,
    category: categoryForKind(event.eventKind),
    title: event.title,
    description: event.summary ?? "",
    sourceModule: String(event.sourceSystem),
    severity: severityForKind(event.eventKind),
  };
}
