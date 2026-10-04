/**
 * Field Control placement and value audit uses the Enterprise Decision Ledger.
 * No second audit store is introduced.
 */
import { EDL_CHANGE_CATEGORIES, EDL_CHANGE_TYPES, EDL_IMPACT_SCOPES } from "@/constants/enterprise-decision-ledger";
import { recordEnterpriseDecision } from "@/lib/enterprise-decision-ledger/ledger-registry";

export const CUSTOM_FIELD_AUDIT_ACTIONS = [
  "placement_created",
  "placement_activated",
  "placement_deactivated",
  "value_created",
  "value_updated",
  "value_cleared",
] as const;

export type CustomFieldAuditAction = (typeof CUSTOM_FIELD_AUDIT_ACTIONS)[number];

export type CustomFieldAuditEvent = {
  action: CustomFieldAuditAction;
  actorUserId: string;
  organizationId: string | null;
  fieldLineageId: string;
  entityId: string | null;
  previousValue: unknown;
  newValue: unknown;
};

const JUSTIFICATION: Record<CustomFieldAuditAction, string> = {
  placement_created: "Recorded an inactive internal custom field placement.",
  placement_activated: "Activated an internal custom field placement.",
  placement_deactivated: "Deactivated an internal custom field placement.",
  value_created: "Captured an organization custom field value.",
  value_updated: "Updated an organization custom field value.",
  value_cleared: "Cleared an organization custom field value.",
};

/**
 * Holds custom-value audit events until the surrounding database transaction
 * completes. Placement audits keep calling recordCustomFieldAudit directly.
 */
export function createOperationalCustomValueAuditBuffer() {
  const events: CustomFieldAuditEvent[] = [];
  return {
    capture(event: CustomFieldAuditEvent) {
      if (event.actorUserId.trim().length === 0) {
        throw new Error("Field Control audit requires an actor.");
      }
      events.push(event);
    },
    publish() {
      for (const event of events) {
        if (event.actorUserId.trim().length === 0) {
          throw new Error("Field Control audit requires an actor.");
        }
      }
      const ready = events.splice(0, events.length);
      for (const event of ready) recordCustomFieldAudit(event);
    },
  };
}

export function recordCustomFieldAudit(event: CustomFieldAuditEvent): void {
  if (event.actorUserId.trim().length === 0) {
    throw new Error("Field Control audit requires an actor.");
  }
  const valueAction = event.action.startsWith("value_");
  recordEnterpriseDecision({
    requestedBy: event.actorUserId,
    approvedBy: event.actorUserId,
    implementedBy: event.actorUserId,
    previousValue: event.previousValue,
    newValue: event.newValue,
    businessJustification: JUSTIFICATION[event.action],
    effectiveFrom: new Date().toISOString(),
    versionNumber: "1",
    impactScope: valueAction ? EDL_IMPACT_SCOPES.ORGANIZATION : EDL_IMPACT_SCOPES.GLOBAL,
    changeType:
      event.action === "value_cleared"
        ? EDL_CHANGE_TYPES.ARCHIVED
        : event.action === "placement_created" || event.action === "value_created"
          ? EDL_CHANGE_TYPES.CREATED
          : EDL_CHANGE_TYPES.UPDATED,
    changeCategory: EDL_CHANGE_CATEGORIES.FIELD_DEFINITION,
    relatedEngine: "field_control_master",
    relatedEntityType: valueAction ? "field_control_custom_value" : "field_control_placement",
    relatedEntityId: event.entityId ?? event.fieldLineageId,
    relatedEntityLabel: event.fieldLineageId,
    tenantId: event.organizationId ?? undefined,
    metadata: {
      action: event.action,
      fieldLineageId: event.fieldLineageId,
      organizationId: event.organizationId,
    },
  });
}
