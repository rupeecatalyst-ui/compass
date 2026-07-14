/**
 * CF-CHANAKYA-015 — Daily Enterprise Memory (observe only).
 * No ChatGPT calls during normal business operations.
 */

import type { ChanakyaDayMemory, ChanakyaMemoryEvent, ChanakyaMemoryEventKind } from "@/types/chanakya-phase5-intelligence";

const STORAGE_KEY = "c1:chanakya-phase5:day-memory";

function businessDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readAll(): Record<string, ChanakyaMemoryEvent[]> {
  if (typeof window === "undefined") return memoryStore;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...memoryStore };
    return { ...memoryStore, ...(JSON.parse(raw) as Record<string, ChanakyaMemoryEvent[]>) };
  } catch {
    return { ...memoryStore };
  }
}

function writeAll(map: Record<string, ChanakyaMemoryEvent[]>) {
  memoryStore = map;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** In-process store (SSR-safe); sessionStorage mirrors on client. */
let memoryStore: Record<string, ChanakyaMemoryEvent[]> = {};

export function observeChanakyaMemoryEvent(
  input: Omit<ChanakyaMemoryEvent, "id" | "businessDay" | "occurredAt"> & {
    businessDay?: string;
    occurredAt?: string;
  },
): ChanakyaMemoryEvent {
  const businessDay = input.businessDay ?? businessDayKey();
  const event: ChanakyaMemoryEvent = {
    ...input,
    id: `mem:${businessDay}:${crypto.randomUUID()}`,
    businessDay,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
  const map = readAll();
  const list = map[businessDay] ?? [];
  map[businessDay] = [event, ...list].slice(0, 500);
  writeAll(map);
  return event;
}

export function listChanakyaMemoryEvents(businessDay?: string): ChanakyaMemoryEvent[] {
  const day = businessDay ?? businessDayKey();
  return readAll()[day] ?? [];
}

export function getChanakyaDayMemory(businessDay?: string): ChanakyaDayMemory {
  const day = businessDay ?? businessDayKey();
  const events = listChanakyaMemoryEvents(day);
  return { businessDay: day, events, eventCount: events.length };
}

export function seedDemoChanakyaDayMemory(businessDay?: string): ChanakyaDayMemory {
  const day = businessDay ?? businessDayKey();
  const existing = listChanakyaMemoryEvents(day);
  if (existing.length > 0) return getChanakyaDayMemory(day);

  const samples: Array<{
    kind: ChanakyaMemoryEventKind;
    summary: string;
    context: Record<string, string>;
    customerName?: string;
    product?: string;
    lender?: string;
    stage?: string;
    loanFileId?: string;
  }> = [
    {
      kind: "customer_dialogue",
      summary: "Customer confirmed income documents will arrive by EOD.",
      context: { channel: "call", topic: "documents" },
      customerName: "Rahul Kapoor",
      product: "Home Loan",
      stage: "document_collection",
      loanFileId: "lf-001",
    },
    {
      kind: "banker_dialogue",
      summary: "HDFC RM requested updated bank statements for LAP login.",
      context: { channel: "whatsapp", topic: "login_readiness" },
      customerName: "Meera Shah",
      product: "Loan Against Property",
      lender: "HDFC Bank",
      stage: "prelogin",
      loanFileId: "lf-002",
    },
    {
      kind: "loan_stage_movement",
      summary: "Case moved from Pre-Login to Login WIP.",
      context: { from: "prelogin", to: "login_wip" },
      customerName: "Amit Verma",
      product: "Working Capital",
      lender: "ICICI Bank",
      stage: "login_wip",
      loanFileId: "lf-003",
    },
    {
      kind: "task",
      summary: "Follow-up Documents marked pending for tomorrow.",
      context: { taskStatus: "pending" },
      customerName: "Rahul Kapoor",
      product: "Home Loan",
      stage: "document_collection",
    },
    {
      kind: "workflow_decision",
      summary: "Primary lender confirmed after eligibility review in Catalyst One.",
      context: { decisionOwner: "catalyst_one" },
      customerName: "Meera Shah",
      product: "Loan Against Property",
      lender: "HDFC Bank",
      stage: "prelogin",
    },
  ];

  for (const sample of samples) {
    observeChanakyaMemoryEvent({
      ...sample,
      businessDay: day,
      actorId: "chanakya",
    });
  }
  return getChanakyaDayMemory(day);
}

export function clearChanakyaDayMemory(businessDay?: string): void {
  const day = businessDay ?? businessDayKey();
  const map = readAll();
  delete map[day];
  writeAll(map);
}

export { businessDayKey as getChanakyaBusinessDayKey };
