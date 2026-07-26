/**
 * CO-BIZ-004 — Application timeline (read-only EDC + Document Request events).
 */

import {
  ECE_CUSTOMER_SAFE_EDC_TYPES,
  ECE_HIDDEN_TIMELINE_TITLES,
} from "@/constants/enterprise-customer-engagement";
import { listEdcTimelineByContext } from "@/lib/enterprise-dialogue-center";
import type { DocumentRequestCommEvent } from "@/types/document-requests";
import type { EceTimelineEvent } from "@/types/enterprise-customer-engagement";

function categoryFor(
  eventType: string,
  title: string,
): EceTimelineEvent["category"] {
  const t = title.toLowerCase();
  if (eventType === "stage_change" || eventType === "workflow") return "milestone";
  if (eventType === "document_upload" || eventType === "document_verification") return "document";
  if (t.includes("approv") || t.includes("sanction") || t.includes("disburs")) return "approval";
  if (eventType === "email" || eventType === "notification") return "communication";
  if (t.includes("customer") || t.includes("upload")) return "customer_action";
  return "other";
}

export function projectCustomerTimeline(input: {
  opportunityId: string;
  communications?: DocumentRequestCommEvent[];
}): EceTimelineEvent[] {
  const edc = listEdcTimelineByContext("opportunity", input.opportunityId)
    .filter((e) => ECE_CUSTOMER_SAFE_EDC_TYPES.has(e.eventType))
    .filter((e) => !ECE_HIDDEN_TIMELINE_TITLES.has(e.title))
    .filter((e) => e.eventType !== "internal_message" && e.eventType !== "task")
    .map((e) => ({
      id: e.id,
      at: e.occurredOn,
      title: e.title,
      description: e.description,
      category: categoryFor(e.eventType, e.title),
      eventType: e.eventType,
    }));

  const fromComm = (input.communications ?? [])
    .filter(
      (c) =>
        c.kind === "customer_uploaded" ||
        c.kind === "verification_completed" ||
        c.kind === "reminder_sent" ||
        c.kind === "email_sent" ||
        c.kind === "whatsapp_sent",
    )
    .map((c) => ({
      id: `comm:${c.id}`,
      at: c.at,
      title:
        c.kind === "customer_uploaded"
          ? "You uploaded a document"
          : c.kind === "verification_completed"
            ? "Document verification update"
            : c.kind === "reminder_sent"
              ? "Reminder sent"
              : "Message from your team",
      description: c.detail || "",
      category: (c.kind === "customer_uploaded"
        ? "customer_action"
        : c.kind === "verification_completed"
          ? "document"
          : "communication") as EceTimelineEvent["category"],
      eventType: c.kind,
    }));

  const merged = [...edc, ...fromComm];
  const seen = new Set<string>();
  return merged
    .filter((e) => {
      const key = `${e.at}|${e.title}|${e.description.slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}
