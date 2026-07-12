/**
 * Feature Registry — pluggable Mission Control modules.
 */

import type { MissionControlFeatureFlag, MissionControlModuleStatus } from "../shared/constants";
import type { MissionControlPermission } from "../shared/types";

export interface MissionControlFeatureModule {
  id: string;
  displayName: string;
  route: string;
  icon: string;
  permissions: MissionControlPermission[];
  featureFlag: MissionControlFeatureFlag;
  version: string;
  status: MissionControlModuleStatus;
  dependencies: string[];
  description?: string;
}

export type FeatureRegistry = ReadonlyMap<string, MissionControlFeatureModule>;

export interface FeatureRegistryPort {
  register(module: MissionControlFeatureModule): void;
  unregister(id: string): void;
  get(id: string): MissionControlFeatureModule | undefined;
  list(): MissionControlFeatureModule[];
  listActive(): MissionControlFeatureModule[];
}
