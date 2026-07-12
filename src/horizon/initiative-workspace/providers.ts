/**
 * Initiative Workspace providers — delegate to Horizon domain providers.
 */

import { createInitiativeProvider } from "../providers";
import type {
  HealthSnapshot,
  InitiativeWorkspaceModel,
  ProgressSnapshot,
} from "./types";

export interface InitiativeWorkspaceProvider {
  getWorkspace(): Promise<InitiativeWorkspaceModel>;
}

export interface HierarchyProvider {
  listInitiatives(): Promise<readonly import("../types").Initiative[]>;
}

export interface ProgressProvider {
  listProgress(): Promise<readonly ProgressSnapshot[]>;
}

export interface HealthProvider {
  listHealth(): Promise<readonly HealthSnapshot[]>;
}

export function createHierarchyProvider(): HierarchyProvider {
  const initiatives = createInitiativeProvider();
  return {
    async listInitiatives() {
      return initiatives.listInitiatives();
    },
  };
}

export function createProgressProvider(): ProgressProvider {
  return {
    async listProgress() {
      const list = await createHierarchyProvider().listInitiatives();
      const rows: ProgressSnapshot[] = [];
      for (const init of list) {
        rows.push({ id: init.id, label: init.name, progress: init.progress });
        for (const ws of init.workstreams) {
          rows.push({ id: ws.id, label: ws.name, progress: ws.progress });
        }
      }
      return rows;
    },
  };
}

export function createHealthProvider(): HealthProvider {
  return {
    async listHealth() {
      const list = await createHierarchyProvider().listInitiatives();
      const rows: HealthSnapshot[] = [];
      for (const init of list) {
        rows.push({ id: init.id, label: init.name, health: init.health });
        for (const ws of init.workstreams) {
          rows.push({ id: ws.id, label: ws.name, health: ws.health });
        }
      }
      return rows;
    },
  };
}

export function createInitiativeWorkspaceProvider(): InitiativeWorkspaceProvider {
  const hierarchy = createHierarchyProvider();
  return {
    async getWorkspace() {
      const initiatives = await hierarchy.listInitiatives();
      return {
        initiatives: [...initiatives],
        asOf: new Date().toISOString(),
      };
    },
  };
}
