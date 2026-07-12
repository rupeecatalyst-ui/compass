import type { MissionControlStatusIndicatorModel } from "../shared/types";

export interface MissionControlHealthPort {
  listSubsystemStatus(): Promise<MissionControlStatusIndicatorModel[]>;
}

export const MISSION_CONTROL_SUBSYSTEM_IDS = [
  "api",
  "database",
  "queue",
  "scheduler",
  "email",
  "sms",
  "whatsapp",
  "ocr",
  "ai",
  "storage",
  "background_jobs",
] as const;

export function createMissionControlHealthStub(): MissionControlHealthPort {
  return {
    async listSubsystemStatus() {
      return MISSION_CONTROL_SUBSYSTEM_IDS.map((id) => ({
        id,
        label: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        state: "unknown" as const,
      }));
    },
  };
}
