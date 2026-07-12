/**
 * Telemetry — interfaces only.
 * TODO(SPR-007.2): wire observability exporters.
 */

export interface MissionControlTelemetryEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  occurredOn: string;
}

export interface MissionControlTelemetryPort {
  track(event: Omit<MissionControlTelemetryEvent, "occurredOn"> & { occurredOn?: string }): Promise<void>;
}

export function createMissionControlTelemetryStub(): MissionControlTelemetryPort {
  return {
    async track() {
      /* no-op */
    },
  };
}
