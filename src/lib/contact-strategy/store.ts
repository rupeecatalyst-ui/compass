/**
 * CO-SPRINT-092 — Contact Strategy Workspace store.
 * Relationship actions expire after 30 days. No automation beyond local expiry.
 */

export type ContactStrategyActivityType =
  | "meeting"
  | "phone_call"
  | "follow_up"
  | "discussion"
  | "relationship_activity";

export const CONTACT_STRATEGY_ACTIVITY_OPTIONS: {
  id: ContactStrategyActivityType;
  label: string;
}[] = [
  { id: "meeting", label: "Meeting" },
  { id: "phone_call", label: "Phone Call" },
  { id: "follow_up", label: "Follow-up" },
  { id: "discussion", label: "Discussion" },
  { id: "relationship_activity", label: "Relationship Activity" },
];

export interface ContactStrategyAction {
  id: string;
  contactId: string;
  contactName: string;
  activityType: ContactStrategyActivityType;
  notes?: string;
  loggedAt: string;
  /** ISO timestamp — loggedAt + 30 days */
  expiresAt: string;
  loggedBy: string;
}

const STORE_KEY = "catalyst.contact-strategy.actions";
const DAY_MS = 24 * 60 * 60 * 1000;
export const CONTACT_STRATEGY_VISIBLE_DAYS = 30;

function readAll(): ContactStrategyAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ContactStrategyAction[]) : [];
  } catch {
    return [];
  }
}

function writeAll(actions: ContactStrategyAction[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(actions));
}

export function expiresAtFrom(loggedAt: string): string {
  return new Date(new Date(loggedAt).getTime() + CONTACT_STRATEGY_VISIBLE_DAYS * DAY_MS).toISOString();
}

export function isActionActive(action: ContactStrategyAction, now = Date.now()): boolean {
  return new Date(action.expiresAt).getTime() > now;
}

/** Active (non-expired) relationship actions — right panel. */
export function listActiveContactStrategyActions(now = Date.now()): ContactStrategyAction[] {
  const active = readAll().filter((a) => isActionActive(a, now));
  // Persist prune of expired rows (lightweight local hygiene)
  const all = readAll();
  if (all.length !== active.length) writeAll(active);
  return active.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
}

export function listContactIdsWithActiveActions(now = Date.now()): Set<string> {
  return new Set(listActiveContactStrategyActions(now).map((a) => a.contactId));
}

export function logContactStrategyAction(input: {
  contactId: string;
  contactName: string;
  activityType: ContactStrategyActivityType;
  notes?: string;
  loggedBy?: string;
}): ContactStrategyAction {
  const loggedAt = new Date().toISOString();
  const action: ContactStrategyAction = {
    id: `csa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    contactId: input.contactId,
    contactName: input.contactName,
    activityType: input.activityType,
    notes: input.notes?.trim() || undefined,
    loggedAt,
    expiresAt: expiresAtFrom(loggedAt),
    loggedBy: input.loggedBy ?? "RM",
  };
  const next = [action, ...readAll().filter((a) => isActionActive(a))];
  writeAll(next);
  return action;
}

export function activityTypeLabel(type: ContactStrategyActivityType): string {
  return CONTACT_STRATEGY_ACTIVITY_OPTIONS.find((o) => o.id === type)?.label ?? type;
}
