/**
 * Alert Publisher Registry — metadata for engines that publish alerts.
 */

import type { AlertPublisherRegistryPort, EnterpriseAlertPublisher } from "../contracts";

const SEED_PUBLISHERS: EnterpriseAlertPublisher[] = [
  {
    id: "workflow-engine",
    displayName: "Workflow Engine",
    description: "Process and SLA alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["workflow", "sla"],
    sourceId: "source-workflow-engine",
  },
  {
    id: "credit-risk-engine",
    displayName: "Credit & Risk Engine",
    description: "Credit and risk alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["credit", "risk"],
    sourceId: "source-credit-risk-engine",
  },
  /** @deprecated Prefer credit-risk-engine — retained for compatibility */
  {
    id: "credit-engine",
    displayName: "Credit & Risk Engine",
    description: "Alias for Credit & Risk Engine",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["credit", "risk"],
    sourceId: "source-credit-risk-engine",
  },
  {
    id: "customer-360",
    displayName: "Customer 360",
    description: "Customer relationship alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["customer"],
    sourceId: "source-customer-360",
  },
  {
    id: "partner-management",
    displayName: "Partner Management",
    description: "Partner and lender network alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["partner"],
    sourceId: "source-partner-management",
  },
  /** @deprecated Prefer partner-management */
  {
    id: "partner-engine",
    displayName: "Partner Management",
    description: "Alias for Partner Management",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["partner"],
    sourceId: "source-partner-management",
  },
  {
    id: "document-intelligence",
    displayName: "Document Intelligence",
    description: "Document pipeline alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["document"],
    sourceId: "source-document-intelligence",
  },
  {
    id: "product-intelligence",
    displayName: "Product Intelligence",
    description: "Product performance alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["product"],
    sourceId: "source-product-intelligence",
  },
  {
    id: "mission-control",
    displayName: "Mission Control",
    description: "Control-plane and command alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["mission-control"],
    sourceId: "source-mission-control",
  },
  {
    id: "security-operations",
    displayName: "Security Operations",
    description: "Security posture alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["security"],
    sourceId: "source-security-operations",
  },
  {
    id: "observability",
    displayName: "Observability",
    description: "Platform and infrastructure alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["observability"],
    sourceId: "source-observability",
  },
  {
    id: "digital-twin",
    displayName: "Digital Twin",
    description: "Enterprise twin simulation alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["twin", "simulation"],
    sourceId: "source-digital-twin",
  },
  {
    id: "mission-replay",
    displayName: "Mission Replay",
    description: "Historical mission timeline alerts",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["replay"],
    sourceId: "source-mission-replay",
  },
  {
    id: "ai-control-tower",
    displayName: "AI Control Tower",
    description: "AI governance alerts (no AI execution here)",
    status: "planned",
    version: "0.0.0",
    capabilityTags: ["ai"],
    sourceId: "source-ai-control-tower",
  },
];

export function createAlertPublisherRegistry(
  seed: EnterpriseAlertPublisher[] = SEED_PUBLISHERS,
): AlertPublisherRegistryPort {
  const store = new Map<string, EnterpriseAlertPublisher>(seed.map((p) => [p.id, p]));

  return {
    register(publisher) {
      store.set(publisher.id, publisher);
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

export const defaultAlertPublisherRegistry = createAlertPublisherRegistry();

export function listRegisteredAlertPublishers(): EnterpriseAlertPublisher[] {
  return defaultAlertPublisherRegistry.list();
}
