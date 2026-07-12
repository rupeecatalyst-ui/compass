/**
 * Configuration / Notifications / Health / Telemetry / Search / Command Center
 * Placeholder ports — no backend.
 */

export interface MissionControlConfigurationPort {
  getEnvironment(): Promise<"development" | "staging" | "production" | "dr">;
  getBuildVersion(): Promise<string>;
}

export function createMissionControlConfigurationStub(): MissionControlConfigurationPort {
  return {
    async getEnvironment() {
      return process.env.NODE_ENV === "production" ? "production" : "development";
    },
    async getBuildVersion() {
      return "0.1.0-foundation";
    },
  };
}
