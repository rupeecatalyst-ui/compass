/**
 * Source Module Registry — metadata for future insight producers.
 * No runtime bindings, no queries, no intelligence.
 */

import type { ExecutiveSourceModule } from "../contracts";
import type { ExecutiveSourceModuleStatus } from "../types";

export interface ExecutiveSourceModuleRegistryPort {
  register(module: ExecutiveSourceModule): void;
  unregister(id: string): void;
  get(id: string): ExecutiveSourceModule | undefined;
  list(): ExecutiveSourceModule[];
  listByStatus(status: ExecutiveSourceModuleStatus): ExecutiveSourceModule[];
}

const SEED_MODULES: ExecutiveSourceModule[] = [
  {
    id: "workflow-engine",
    displayName: "Workflow Engine",
    description: "Process and SLA posture insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["workflow", "sla"],
  },
  {
    id: "credit-risk-engine",
    displayName: "Credit & Risk Engine",
    description: "Credit and risk posture insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["credit", "risk"],
  },
  {
    id: "opportunity-lifecycle",
    displayName: "Opportunity Lifecycle",
    description: "Pipeline and opportunity lifecycle insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["opportunity", "commercial"],
  },
  {
    id: "customer-360",
    displayName: "Customer 360",
    description: "Customer relationship insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["customer"],
  },
  {
    id: "partner-management",
    displayName: "Partner Management",
    description: "Partner and lender network insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["partner", "lender"],
  },
  {
    id: "document-intelligence",
    displayName: "Document Intelligence",
    description: "Document pipeline insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["document"],
  },
  {
    id: "product-intelligence",
    displayName: "Product Intelligence",
    description: "Product performance insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["product"],
  },
  {
    id: "security-operations",
    displayName: "Security Operations",
    description: "Security posture insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["security"],
  },
  {
    id: "observability",
    displayName: "Observability",
    description: "Platform health and observability insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["observability"],
  },
  {
    id: "mission-replay",
    displayName: "Mission Replay",
    description: "Historical mission timeline insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["replay"],
  },
  {
    id: "digital-twin",
    displayName: "Digital Twin",
    description: "Enterprise twin simulation insights",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["twin", "simulation"],
  },
];

export function createExecutiveSourceModuleRegistry(
  seed: ExecutiveSourceModule[] = SEED_MODULES,
): ExecutiveSourceModuleRegistryPort {
  const store = new Map<string, ExecutiveSourceModule>(seed.map((m) => [m.id, m]));

  return {
    register(module) {
      store.set(module.id, module);
    },
    unregister(id) {
      store.delete(id);
    },
    get(id) {
      return store.get(id);
    },
    list() {
      return [...store.values()];
    },
    listByStatus(status) {
      return [...store.values()].filter((m) => m.status === status);
    },
  };
}

export const defaultExecutiveSourceModuleRegistry = createExecutiveSourceModuleRegistry();

export function listRegisteredExecutiveSourceModules(): ExecutiveSourceModule[] {
  return defaultExecutiveSourceModuleRegistry.list();
}
