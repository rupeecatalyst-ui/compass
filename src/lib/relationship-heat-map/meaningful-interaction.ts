/**
 * CO-C1-CHART-READABILITY-001 — Meaningful relationship interactions.
 * Viewing a profile, sync, stage movement, draft comms, or incomplete tasks
 * must never reset the activity clock.
 */

import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";

export type MeaningfulInteractionChannel =
  | "Call"
  | "Email"
  | "WhatsApp"
  | "Message"
  | "Meeting"
  | "Follow-up"
  | "Operational interaction";

const EXCLUDED_KIND = new Set([
  "stage_change",
  "workflow",
  "opportunity",
  "documents",
  "chanakya",
  "mission_control",
]);

const EXCLUDED_SOURCE = new Set(["chanakya", "mission_control"]);

const NOISE_TITLE =
  /\b(view|viewed|profile|hydrat|sync|synchron|draft|unsent|heartbeat|background|automat|seed|recalc)\b/i;

function haystack(event: Pick<EnterpriseActivityEvent, "title" | "summary"> & { payload?: Record<string, unknown> | null }): string {
  const payloadText =
    event.payload && typeof event.payload === "object"
      ? JSON.stringify(event.payload)
      : "";
  return `${event.title || ""} ${event.summary || ""} ${payloadText}`.toLowerCase();
}

function isCompletedTask(event: EnterpriseActivityEvent): boolean {
  if (event.eventKind !== "tasks") return false;
  const text = haystack(event);
  if (/\b(creat|opened|assigned|new task)\b/.test(text) && !/\b(complet|done|closed)\b/.test(text)) {
    return false;
  }
  const status = String(event.payload?.status ?? event.payload?.taskStatus ?? "").toLowerCase();
  if (status && ["open", "pending", "draft", "cancelled", "canceled"].includes(status)) {
    return false;
  }
  return /\b(complet|completed|done|closed)\b/.test(text) || status === "completed" || status === "done";
}

function isDialogueOrNoteInteraction(event: EnterpriseActivityEvent): boolean {
  if (event.eventKind !== "dialogue" && event.eventKind !== "notes") return false;
  const text = haystack(event);
  return /\b(call|meeting|whatsapp|message|sms|follow-?up|email)\b/.test(text);
}

export function classifyMeaningfulInteractionChannel(
  event: Pick<EnterpriseActivityEvent, "eventKind" | "sourceSystem" | "title" | "summary"> & {
    payload?: Record<string, unknown> | null;
  },
): MeaningfulInteractionChannel {
  const text = haystack(event);
  if (/\bcall\b/.test(text)) return "Call";
  if (/\bwhatsapp\b/.test(text)) return "WhatsApp";
  if (/\bmeeting\b/.test(text)) return "Meeting";
  if (/\bfollow-?up\b/.test(text)) return "Follow-up";
  if (event.sourceSystem === "inbound_email" || event.sourceSystem === "outbox" || /\bemail\b/.test(text)) {
    return "Email";
  }
  if (/\b(message|sms)\b/.test(text)) return "Message";
  return "Operational interaction";
}

export function isMeaningfulRelationshipInteraction(event: EnterpriseActivityEvent): boolean {
  const kind = String(event.eventKind || "").toLowerCase();
  const source = String(event.sourceSystem || "").toLowerCase();
  if (EXCLUDED_KIND.has(kind)) return false;
  if (EXCLUDED_SOURCE.has(source)) return false;
  if (NOISE_TITLE.test(`${event.title || ""} ${event.summary || ""}`)) return false;

  if (kind === "communications") return true;
  if (source === "inbound_email" || source === "outbox") return true;
  if (isCompletedTask(event)) return true;
  if (isDialogueOrNoteInteraction(event)) return true;
  return false;
}

export function latestMeaningfulInteraction(
  events: EnterpriseActivityEvent[],
  contactId: string,
): EnterpriseActivityEvent | null {
  const id = contactId.trim();
  if (!id) return null;
  const aliases = new Set([id, `ecm:contact:${id}`]);
  let latest: EnterpriseActivityEvent | null = null;
  for (const event of events) {
    const cid = String(event.contactId || "").trim();
    if (!cid || !aliases.has(cid)) continue;
    if (!isMeaningfulRelationshipInteraction(event)) continue;
    if (!latest || Date.parse(event.occurredAt) > Date.parse(latest.occurredAt)) {
      latest = event;
    }
  }
  return latest;
}

export function daysSinceIso(iso?: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - t) / 86400000);
}
