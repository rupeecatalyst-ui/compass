/**
 * CO-TASKS-PLANNER-001 — Reminder Registry (Catalyst One owned).
 */

export type EnterpriseReminderRecord = {
  id: string;
  title: string;
  remindAt: string;
  assigneeRef?: string;
  entityLabel?: string;
  status: "scheduled" | "completed" | "cancelled";
};

const g = globalThis as typeof globalThis & {
  __c1ReminderRegistry?: EnterpriseReminderRecord[];
};

function store(): EnterpriseReminderRecord[] {
  if (!g.__c1ReminderRegistry) g.__c1ReminderRegistry = [];
  return g.__c1ReminderRegistry;
}

export function listEnterpriseReminders(): EnterpriseReminderRecord[] {
  return [...store()];
}

export function upsertEnterpriseReminder(
  record: EnterpriseReminderRecord,
): EnterpriseReminderRecord {
  const rows = store();
  const idx = rows.findIndex((r) => r.id === record.id);
  if (idx >= 0) rows[idx] = record;
  else rows.push(record);
  return record;
}

export function clearEnterpriseReminders(): void {
  g.__c1ReminderRegistry = [];
}
