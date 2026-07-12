/**
 * Emergency Services — architecture only. No execution.
 * TODO(SPR-007.2): operator-controlled activation with audit.
 */

export type MissionControlEmergencyCapability =
  | "read_only_mode"
  | "maintenance_mode"
  | "emergency_lock"
  | "disable_integrations"
  | "pause_scheduler"
  | "pause_workflow_engine"
  | "broadcast_notice"
  | "break_glass_activation";

export interface MissionControlEmergencyAction {
  capability: MissionControlEmergencyCapability;
  requestedBy: string;
  reason: string;
  requestedOn: string;
}

export interface MissionControlEmergencyServices {
  /** Declares capability exists — does not execute */
  listCapabilities(): MissionControlEmergencyCapability[];
  /** Architecture stub — always returns not executed */
  requestAction(action: MissionControlEmergencyAction): Promise<{ accepted: false; message: string }>;
}

export function createMissionControlEmergencyServices(): MissionControlEmergencyServices {
  return {
    listCapabilities() {
      return [
        "read_only_mode",
        "maintenance_mode",
        "emergency_lock",
        "disable_integrations",
        "pause_scheduler",
        "pause_workflow_engine",
        "broadcast_notice",
        "break_glass_activation",
      ];
    },
    async requestAction() {
      return {
        accepted: false,
        message: "Emergency execution is not enabled in SPR-007.1 foundation",
      };
    },
  };
}
