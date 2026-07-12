/**
 * Audit Pipeline — interfaces only. No persistence.
 * TODO(SPR-007.2): append to enterprise audit store.
 */

export type MissionControlAuditOutcome = "success" | "failure" | "denied" | "partial";

export interface MissionControlAuditEvent {
  timestamp: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  device?: string;
  correlationId: string;
  outcome: MissionControlAuditOutcome;
}

export interface MissionControlAuditPipeline {
  emit(event: Omit<MissionControlAuditEvent, "timestamp" | "correlationId"> & {
    correlationId?: string;
    timestamp?: string;
  }): Promise<MissionControlAuditEvent>;
}

export function createMissionControlAuditPipelineStub(): MissionControlAuditPipeline {
  return {
    async emit(event) {
      return {
        timestamp: event.timestamp ?? new Date().toISOString(),
        correlationId: event.correlationId ?? crypto.randomUUID(),
        user: event.user,
        role: event.role,
        action: event.action,
        resource: event.resource,
        oldValue: event.oldValue,
        newValue: event.newValue,
        ipAddress: event.ipAddress,
        device: event.device,
        outcome: event.outcome,
      };
    },
  };
}
