/**
 * CO-BIZ-004 — Contextual customer communication (entity-scoped).
 * Persists questions locally and mirrors to EDC — no parallel dialogue engine.
 */

import {
  ECE_MESSAGES_STORAGE_KEY,
  ECE_MESSAGES_UPDATED_EVENT,
} from "@/constants/enterprise-customer-engagement";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import type { EceMessage } from "@/types/enterprise-customer-engagement";

type StoreShape = Record<string, EceMessage[]>;

function readStore(): StoreShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ECE_MESSAGES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoreShape;
  } catch {
    return {};
  }
}

function writeStore(next: StoreShape) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ECE_MESSAGES_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(ECE_MESSAGES_UPDATED_EVENT));
}

export function subscribeEceMessagesUpdated(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(ECE_MESSAGES_UPDATED_EVENT, listener);
  return () => window.removeEventListener(ECE_MESSAGES_UPDATED_EVENT, listener);
}

export function listCustomerMessages(opportunityId: string): EceMessage[] {
  const id = opportunityId.trim();
  if (!id) return [];
  return (readStore()[id] ?? []).slice().sort((a, b) => a.at.localeCompare(b.at));
}

export function postCustomerQuestion(input: {
  opportunityId: string;
  opportunityReference: string;
  body: string;
  customerName?: string;
}): EceMessage {
  const body = input.body.trim();
  if (!body) {
    throw new Error("Message cannot be empty.");
  }
  const message: EceMessage = {
    id: `ece_msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    role: "customer",
    body,
    at: new Date().toISOString(),
    authorLabel: input.customerName?.trim() || "You",
  };
  const store = readStore();
  const key = input.opportunityId.trim();
  store[key] = [...(store[key] ?? []), message];
  writeStore(store);

  try {
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: input.opportunityId },
      eventType: "notification",
      title: "Customer question",
      description: body.slice(0, 280),
      actorId: "customer-engagement",
      expandablePayload: {
        source: "enterprise_customer_engagement",
        opportunityReference: input.opportunityReference,
        messageId: message.id,
      },
    });
  } catch {
    // EDC must never block customer messaging.
  }

  return message;
}

/** Optional RM/system update for portal display (ops can seed structured updates). */
export function postStructuredUpdate(input: {
  opportunityId: string;
  body: string;
  authorLabel?: string;
  role?: "relationship_manager" | "system";
}): EceMessage {
  const message: EceMessage = {
    id: `ece_upd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    role: input.role ?? "relationship_manager",
    body: input.body.trim(),
    at: new Date().toISOString(),
    authorLabel: input.authorLabel?.trim() || "Relationship Manager",
  };
  const store = readStore();
  const key = input.opportunityId.trim();
  store[key] = [...(store[key] ?? []), message];
  writeStore(store);
  return message;
}
