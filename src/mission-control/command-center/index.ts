/**
 * Command Center workspace placeholder.
 */

export interface MissionControlCommandCenterPort {
  listAvailableCommands(): Promise<Array<{ id: string; label: string }>>;
}

export function createMissionControlCommandCenterStub(): MissionControlCommandCenterPort {
  return {
    async listAvailableCommands() {
      return [];
    },
  };
}
