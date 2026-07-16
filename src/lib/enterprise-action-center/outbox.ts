/**
 * Enterprise Outbox — queue before dispatch with review timer.
 * Presentation store (session). Real delivery remains ENCE simulation until external delivery is enabled.
 */

import { OUTBOX_COUNTDOWN_MS } from "@/constants/enterprise-action-center";
import type { OutboxMessage } from "@/types/enterprise-action-center";

const STORAGE_KEY = "catalyst.enterprise.outbox";
export const OUTBOX_EVENT = "catalyst:enterprise-outbox-changed";

function readAll(): OutboxMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OutboxMessage[]) : [];
  } catch {
    return [];
  }
}

function writeAll(messages: OutboxMessage[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENT));
}

export function listOutboxMessages(): OutboxMessage[] {
  return readAll().sort((a, b) => b.dispatchAtMs - a.dispatchAtMs);
}

export function getOutboxMessage(id: string): OutboxMessage | undefined {
  return readAll().find((m) => m.id === id);
}

export function queueOutboxMessage(
  input: Omit<OutboxMessage, "id" | "status" | "queuedAt" | "dispatchAt" | "dispatchAtMs">,
): OutboxMessage {
  const now = Date.now();
  const message: OutboxMessage = {
    ...input,
    id: `outbox-${now}-${Math.random().toString(36).slice(2, 8)}`,
    status: "queued",
    queuedAt: new Date(now).toISOString(),
    dispatchAt: new Date(now + OUTBOX_COUNTDOWN_MS).toISOString(),
    dispatchAtMs: now + OUTBOX_COUNTDOWN_MS,
  };
  const next = [message, ...readAll().filter((m) => m.status === "queued" || m.status === "paused")];
  writeAll(next);
  return message;
}

export function updateOutboxMessage(
  id: string,
  patch: Partial<OutboxMessage>,
): OutboxMessage | null {
  const all = readAll();
  const idx = all.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const updated = { ...all[idx]!, ...patch };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function pauseOutboxCountdown(id: string): OutboxMessage | null {
  return updateOutboxMessage(id, { status: "paused" });
}

export function resumeOutboxCountdown(id: string): OutboxMessage | null {
  const now = Date.now();
  return updateOutboxMessage(id, {
    status: "queued",
    dispatchAt: new Date(now + OUTBOX_COUNTDOWN_MS).toISOString(),
    dispatchAtMs: now + OUTBOX_COUNTDOWN_MS,
  });
}

export function cancelOutboxMessage(id: string): void {
  writeAll(readAll().filter((m) => m.id !== id));
}

export function markOutboxSent(id: string): OutboxMessage | null {
  return updateOutboxMessage(id, { status: "sent" });
}

export function dueOutboxMessages(now = Date.now()): OutboxMessage[] {
  return readAll().filter((m) => m.status === "queued" && m.dispatchAtMs <= now);
}
