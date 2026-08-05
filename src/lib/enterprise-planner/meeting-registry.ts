/**
 * CO-TASKS-PLANNER-001 — Meeting Registry (Catalyst One owned).
 * Lightweight in-memory registry; future Google/Outlook sync maps into these DTOs.
 */

export type EnterpriseMeetingRecord = {
  id: string;
  title: string;
  kind:
    | "customer_meeting"
    | "bank_meeting"
    | "site_visit"
    | "training"
    | "campaign";
  startsAt: string;
  endsAt?: string;
  entityLabel?: string;
  entityKind?: string;
  entityId?: string;
  assigneeRef?: string;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
};

const g = globalThis as typeof globalThis & {
  __c1MeetingRegistry?: EnterpriseMeetingRecord[];
};

function store(): EnterpriseMeetingRecord[] {
  if (!g.__c1MeetingRegistry) g.__c1MeetingRegistry = [];
  return g.__c1MeetingRegistry;
}

export function listEnterpriseMeetings(): EnterpriseMeetingRecord[] {
  return [...store()];
}

export function upsertEnterpriseMeeting(
  record: EnterpriseMeetingRecord,
): EnterpriseMeetingRecord {
  const rows = store();
  const idx = rows.findIndex((r) => r.id === record.id);
  if (idx >= 0) rows[idx] = record;
  else rows.push(record);
  return record;
}

export function clearEnterpriseMeetings(): void {
  g.__c1MeetingRegistry = [];
}
