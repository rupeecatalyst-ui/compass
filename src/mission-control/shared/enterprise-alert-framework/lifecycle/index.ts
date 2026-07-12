/**
 * Alert lifecycle — declarative states and transitions only.
 * Not a workflow engine; no side effects beyond in-memory bookkeeping.
 */

import type {
  EnterpriseAlertEvent,
  EnterpriseAlertLifecycle,
  EnterpriseAlertLifecycleTransition,
} from "../contracts";
import type { AlertLifecycleState } from "../types";

export const ALERT_LIFECYCLE_DEFINITIONS: readonly EnterpriseAlertLifecycle[] = [
  {
    state: "generated",
    label: "Generated",
    description: "Alert created by a source engine — not yet published to Mission Control",
    allowedTransitions: ["published", "archived"],
    terminal: false,
    order: 10,
  },
  {
    state: "published",
    label: "Published",
    description: "Alert accepted into the publishing framework bus",
    allowedTransitions: ["acknowledged", "assigned", "resolved", "archived"],
    terminal: false,
    order: 20,
  },
  {
    state: "acknowledged",
    label: "Acknowledged",
    description: "Alert acknowledged by an authorized consumer",
    allowedTransitions: ["assigned", "resolved", "archived"],
    terminal: false,
    order: 30,
  },
  {
    state: "assigned",
    label: "Assigned",
    description: "Alert assigned for follow-up (placeholder ownership)",
    allowedTransitions: ["acknowledged", "resolved", "archived"],
    terminal: false,
    order: 40,
  },
  {
    state: "resolved",
    label: "Resolved",
    description: "Alert marked resolved",
    allowedTransitions: ["archived"],
    terminal: false,
    order: 50,
  },
  {
    state: "archived",
    label: "Archived",
    description: "Alert archived for retention",
    allowedTransitions: [],
    terminal: true,
    order: 60,
  },
];

const BY_STATE = new Map(ALERT_LIFECYCLE_DEFINITIONS.map((d) => [d.state, d]));

export function getAlertLifecycleDefinition(
  state: AlertLifecycleState,
): EnterpriseAlertLifecycle | undefined {
  return BY_STATE.get(state);
}

export function listAlertLifecycleDefinitions(): EnterpriseAlertLifecycle[] {
  return [...ALERT_LIFECYCLE_DEFINITIONS].sort((a, b) => a.order - b.order);
}

export function canTransitionAlertLifecycle(
  from: AlertLifecycleState,
  to: AlertLifecycleState,
): boolean {
  const def = BY_STATE.get(from);
  if (!def) return false;
  return def.allowedTransitions.includes(to);
}

export interface AlertLifecycleTransitionResult {
  ok: boolean;
  event?: EnterpriseAlertEvent;
  transition?: EnterpriseAlertLifecycleTransition;
  message: string;
}

/**
 * Applies a placeholder lifecycle transition on an event copy.
 * Does not persist or notify.
 */
export function transitionAlertLifecycle(
  event: EnterpriseAlertEvent,
  to: AlertLifecycleState,
  options?: { actorHint?: string; note?: string; at?: string },
): AlertLifecycleTransitionResult {
  const from = event.lifecycleState;
  if (!canTransitionAlertLifecycle(from, to)) {
    return {
      ok: false,
      message: `Transition ${from} → ${to} is not allowed in the placeholder lifecycle.`,
    };
  }

  const at = options?.at ?? new Date().toISOString();
  const next: EnterpriseAlertEvent = {
    ...event,
    lifecycleState: to,
    acknowledgedAt: to === "acknowledged" ? at : event.acknowledgedAt,
    resolvedAt: to === "resolved" ? at : event.resolvedAt,
    archivedAt: to === "archived" ? at : event.archivedAt,
    assignedToHint:
      to === "assigned" ? (options?.actorHint ?? event.assignedToHint ?? "placeholder-assignee") : event.assignedToHint,
  };

  return {
    ok: true,
    event: next,
    transition: {
      eventId: event.id,
      from,
      to,
      at,
      actorHint: options?.actorHint,
      note: options?.note,
    },
    message: `Lifecycle moved ${from} → ${to} (placeholder only).`,
  };
}
