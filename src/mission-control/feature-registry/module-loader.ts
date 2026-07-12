/**
 * Module Loader — lifecycle interfaces only (SPR-007.1).
 * TODO(SPR-007.2): runtime lazy loading & activation.
 */

export type MissionControlModuleLifecycleState =
  | "unregistered"
  | "registered"
  | "initialized"
  | "active"
  | "suspended"
  | "unloaded";

export interface MissionControlModuleHandle {
  moduleId: string;
  state: MissionControlModuleLifecycleState;
}

export interface MissionControlModuleLoader {
  register(moduleId: string): Promise<MissionControlModuleHandle>;
  initialize(moduleId: string): Promise<MissionControlModuleHandle>;
  activate(moduleId: string): Promise<MissionControlModuleHandle>;
  suspend(moduleId: string): Promise<MissionControlModuleHandle>;
  resume(moduleId: string): Promise<MissionControlModuleHandle>;
  unload(moduleId: string): Promise<void>;
  getHandle(moduleId: string): MissionControlModuleHandle | undefined;
}

/** Placeholder — no runtime implementation in SPR-007.1 */
export function createMissionControlModuleLoaderStub(): MissionControlModuleLoader {
  const handles = new Map<string, MissionControlModuleHandle>();

  const set = (moduleId: string, state: MissionControlModuleLifecycleState) => {
    const handle = { moduleId, state };
    handles.set(moduleId, handle);
    return handle;
  };

  return {
    async register(moduleId) {
      return set(moduleId, "registered");
    },
    async initialize(moduleId) {
      return set(moduleId, "initialized");
    },
    async activate(moduleId) {
      return set(moduleId, "active");
    },
    async suspend(moduleId) {
      return set(moduleId, "suspended");
    },
    async resume(moduleId) {
      return set(moduleId, "active");
    },
    async unload(moduleId) {
      handles.set(moduleId, { moduleId, state: "unloaded" });
    },
    getHandle(moduleId) {
      return handles.get(moduleId);
    },
  };
}
