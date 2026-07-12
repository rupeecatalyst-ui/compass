/**
 * Alert Source Registry — logical engine origins for published alerts.
 */

import type { AlertSourceRegistryPort, EnterpriseAlertSource } from "../contracts";

const SEED_SOURCES: EnterpriseAlertSource[] = [
  {
    id: "source-workflow-engine",
    displayName: "Workflow Engine",
    status: "planned",
    version: "0.0.0",
    publisherId: "workflow-engine",
    capabilityTags: ["workflow", "sla"],
  },
  {
    id: "source-credit-risk-engine",
    displayName: "Credit & Risk Engine",
    status: "planned",
    version: "0.0.0",
    publisherId: "credit-risk-engine",
    capabilityTags: ["credit", "risk"],
  },
  {
    id: "source-customer-360",
    displayName: "Customer 360",
    status: "planned",
    version: "0.0.0",
    publisherId: "customer-360",
    capabilityTags: ["customer"],
  },
  {
    id: "source-partner-management",
    displayName: "Partner Management",
    status: "planned",
    version: "0.0.0",
    publisherId: "partner-management",
    capabilityTags: ["partner"],
  },
  {
    id: "source-document-intelligence",
    displayName: "Document Intelligence",
    status: "planned",
    version: "0.0.0",
    publisherId: "document-intelligence",
    capabilityTags: ["document"],
  },
  {
    id: "source-product-intelligence",
    displayName: "Product Intelligence",
    status: "planned",
    version: "0.0.0",
    publisherId: "product-intelligence",
    capabilityTags: ["product"],
  },
  {
    id: "source-mission-control",
    displayName: "Mission Control",
    status: "planned",
    version: "0.0.0",
    publisherId: "mission-control",
    capabilityTags: ["mission-control"],
  },
  {
    id: "source-security-operations",
    displayName: "Security Operations",
    status: "planned",
    version: "0.0.0",
    publisherId: "security-operations",
    capabilityTags: ["security"],
  },
  {
    id: "source-observability",
    displayName: "Observability",
    status: "planned",
    version: "0.0.0",
    publisherId: "observability",
    capabilityTags: ["observability"],
  },
  {
    id: "source-digital-twin",
    displayName: "Digital Twin",
    status: "planned",
    version: "0.0.0",
    publisherId: "digital-twin",
    capabilityTags: ["twin"],
  },
  {
    id: "source-mission-replay",
    displayName: "Mission Replay",
    status: "planned",
    version: "0.0.0",
    publisherId: "mission-replay",
    capabilityTags: ["replay"],
  },
  {
    id: "source-ai-control-tower",
    displayName: "AI Control Tower",
    status: "planned",
    version: "0.0.0",
    publisherId: "ai-control-tower",
    capabilityTags: ["ai"],
  },
];

export function createAlertSourceRegistry(
  seed: EnterpriseAlertSource[] = SEED_SOURCES,
): AlertSourceRegistryPort {
  const store = new Map<string, EnterpriseAlertSource>(seed.map((s) => [s.id, s]));

  return {
    register(source) {
      store.set(source.id, source);
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
  };
}

export const defaultAlertSourceRegistry = createAlertSourceRegistry();

export function listRegisteredAlertSources(): EnterpriseAlertSource[] {
  return defaultAlertSourceRegistry.list();
}
