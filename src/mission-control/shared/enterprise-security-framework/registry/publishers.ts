/**
 * Security publisher registry + in-memory SecurityRegistry.
 * Placeholder publishers for Catalyst One engines.
 */

import type {
  SecurityComplianceSnapshot,
  SecurityDomainSignal,
  SecurityEventContract,
  SecurityPermission,
  SecurityPolicy,
  SecurityPublisher,
  SecurityRegistry,
  SecuritySession,
  SecurityThreat,
} from "../contracts";
import { PLACEHOLDER_SECURITY_POLICIES } from "../policies";

export const PLACEHOLDER_SECURITY_PUBLISHERS: readonly SecurityPublisher[] = [
  {
    id: "workflow-engine",
    displayName: "Workflow Engine",
    description: "Process and stage security signals",
    status: "planned",
    version: "0.1.0",
    module: "Workflow Engine",
    categoryIds: ["audit", "platform"],
    capabilityTags: ["workflow", "sla"],
  },
  {
    id: "credit-risk-engine",
    displayName: "Credit & Risk Engine",
    description: "Credit and risk security-adjacent signals",
    status: "planned",
    version: "0.1.0",
    module: "Credit & Risk Engine",
    categoryIds: ["compliance", "audit"],
    capabilityTags: ["credit", "risk"],
  },
  {
    id: "customer-360",
    displayName: "Customer 360",
    description: "Customer identity and access cues",
    status: "planned",
    version: "0.1.0",
    module: "Customer 360",
    categoryIds: ["identity", "permissions"],
    capabilityTags: ["customer"],
  },
  {
    id: "partner-management",
    displayName: "Partner Management",
    description: "Partner network security posture",
    status: "planned",
    version: "0.1.0",
    module: "Partner Management",
    categoryIds: ["identity", "permissions"],
    capabilityTags: ["partner", "life"],
  },
  {
    id: "document-intelligence",
    displayName: "Document Intelligence",
    description: "Document pipeline integrity signals",
    status: "planned",
    version: "0.1.0",
    module: "Document Intelligence",
    categoryIds: ["compliance", "audit"],
    capabilityTags: ["document"],
  },
  {
    id: "product-intelligence",
    displayName: "Product Intelligence",
    description: "Product configuration security cues",
    status: "planned",
    version: "0.1.0",
    module: "Product Intelligence",
    categoryIds: ["compliance", "platform"],
    capabilityTags: ["product"],
  },
  {
    id: "loan-workspace",
    displayName: "Loan Workspace",
    description: "Deal access and workspace signals",
    status: "planned",
    version: "0.1.0",
    module: "Loan Workspace",
    categoryIds: ["permissions", "audit"],
    capabilityTags: ["loans", "origination"],
  },
  {
    id: "opportunity-lifecycle",
    displayName: "Opportunity Lifecycle",
    description: "Opportunity access and lifecycle cues",
    status: "planned",
    version: "0.1.0",
    module: "Opportunity Lifecycle",
    categoryIds: ["permissions", "audit"],
    capabilityTags: ["opportunities"],
  },
  {
    id: "mission-control",
    displayName: "Mission Control",
    description: "Control-plane security signals",
    status: "active",
    version: "0.1.0",
    module: "Mission Control",
    categoryIds: ["platform", "audit"],
    capabilityTags: ["mission-control", "command"],
  },
  {
    id: "security-operations",
    displayName: "Security Operations",
    description: "SOC publisher of domain posture",
    status: "active",
    version: "0.1.0",
    module: "Security Operations",
    categoryIds: ["identity", "sessions", "threat_detection", "break_glass", "compliance"],
    capabilityTags: ["security", "soc"],
  },
  {
    id: "identity-fabric",
    displayName: "Identity Fabric",
    description: "Identity and MFA coverage signals",
    status: "active",
    version: "0.1.0",
    module: "Identity Fabric",
    categoryIds: ["identity", "authentication", "mfa"],
    capabilityTags: ["identity", "mfa"],
  },
  {
    id: "access-governance",
    displayName: "Access Governance",
    description: "Permission and authorization contracts",
    status: "active",
    version: "0.1.0",
    module: "Access Governance",
    categoryIds: ["authorization", "permissions"],
    capabilityTags: ["authorization", "permissions"],
  },
  {
    id: "threat-detection",
    displayName: "Threat Detection",
    description: "Threat and detection publishers",
    status: "active",
    version: "0.1.0",
    module: "Threat Detection",
    categoryIds: ["threat_detection"],
    capabilityTags: ["threat", "detection"],
  },
  {
    id: "compliance",
    displayName: "Compliance",
    description: "Compliance control publishers",
    status: "active",
    version: "0.1.0",
    module: "Compliance",
    categoryIds: ["compliance", "audit"],
    capabilityTags: ["compliance"],
  },
  {
    id: "horizon",
    displayName: "Horizon",
    description: "Strategic workspace access cues",
    status: "planned",
    version: "0.1.0",
    module: "Horizon",
    categoryIds: ["permissions", "platform"],
    capabilityTags: ["horizon", "strategy"],
  },
  {
    id: "observability",
    displayName: "Observability",
    description: "Platform and infrastructure security signals",
    status: "planned",
    version: "0.1.0",
    module: "Observability",
    categoryIds: ["platform", "threat_detection"],
    capabilityTags: ["observability"],
  },
  {
    id: "digital-twin",
    displayName: "Digital Twin",
    description: "Simulation surface security cues",
    status: "planned",
    version: "0.1.0",
    module: "Digital Twin",
    categoryIds: ["platform"],
    capabilityTags: ["twin"],
  },
  {
    id: "mission-replay",
    displayName: "Mission Replay",
    description: "Historical mission access cues",
    status: "planned",
    version: "0.1.0",
    module: "Mission Replay",
    categoryIds: ["audit", "platform"],
    capabilityTags: ["replay"],
  },
  {
    id: "ai-control-tower",
    displayName: "AI Control Tower",
    description: "AI governance security cues (no AI execution)",
    status: "planned",
    version: "0.1.0",
    module: "AI Control Tower",
    categoryIds: ["compliance", "platform"],
    capabilityTags: ["ai", "governance"],
  },
  {
    id: "task-engine",
    displayName: "Task Engine",
    description: "Task assignment access cues",
    status: "planned",
    version: "0.1.0",
    module: "Task Engine",
    categoryIds: ["permissions", "audit"],
    capabilityTags: ["tasks"],
  },
  {
    id: "dialogue-center",
    displayName: "Dialogue Center",
    description: "Communication access cues",
    status: "planned",
    version: "0.1.0",
    module: "Dialogue Center",
    categoryIds: ["permissions", "audit"],
    capabilityTags: ["dialogue"],
  },
  {
    id: "notification-engine",
    displayName: "Notification Engine",
    description: "Notification channel security cues",
    status: "planned",
    version: "0.1.0",
    module: "Notification Engine",
    categoryIds: ["platform", "audit"],
    capabilityTags: ["notifications"],
  },
  {
    id: "platform-modes",
    displayName: "Platform Modes",
    description: "System mode configuration security",
    status: "planned",
    version: "0.1.0",
    module: "Platform Modes",
    categoryIds: ["platform"],
    capabilityTags: ["configuration"],
  },
];

export function createPlaceholderSecurityEvents(): SecurityEventContract[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderSecurityThreats() {
  // CO-ORG-004
  return [];
}

export function createPlaceholderSecuritySessions(): SecuritySession[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderSecurityPermissions(): SecurityPermission[] {
  // CO-ORG-004
  return [];
}

export function createPlaceholderComplianceSnapshot(): SecurityComplianceSnapshot {
  // CO-ORG-004 — no invented control %
  return {
    id: "comp-snap-default",
    overallHealth: "unknown",
    overallLabel: "Not assessed",
    controlsPassingLabel: "—",
    openFindingsLabel: "—",
    nextReviewLabel: "—",
    summary:
      "Compliance posture awaits control evaluation SSOT. Invented passing % removed (CO-ORG-004).",
    asOf: new Date().toISOString(),
    controls: [],
  };
}

export function createPlaceholderDomainSignals(): SecurityDomainSignal[] {
  // CO-ORG-004 — no invented domain health
  return [];
}

export function createSecurityPublisherRegistry(
  seed: readonly SecurityPublisher[] = PLACEHOLDER_SECURITY_PUBLISHERS,
) {
  const store = new Map<string, SecurityPublisher>(seed.map((p) => [p.id, p]));
  return {
    register(publisher: SecurityPublisher) {
      store.set(publisher.id, publisher);
    },
    unregister(id: string) {
      store.delete(id);
    },
    get(id: string) {
      return store.get(id);
    },
    list() {
      return [...store.values()] as readonly SecurityPublisher[];
    },
  };
}

export const defaultSecurityPublisherRegistry = createSecurityPublisherRegistry();

export function listRegisteredSecurityPublishers(): readonly SecurityPublisher[] {
  return defaultSecurityPublisherRegistry.list();
}

export function createSecurityRegistry(options?: {
  publishers?: readonly SecurityPublisher[];
  policies?: readonly SecurityPolicy[];
  events?: readonly SecurityEventContract[];
  threats?: readonly SecurityThreat[];
  sessions?: readonly SecuritySession[];
  permissions?: readonly SecurityPermission[];
  compliance?: SecurityComplianceSnapshot;
  domains?: readonly SecurityDomainSignal[];
}): SecurityRegistry {
  const publishers = new Map(
    (options?.publishers ?? PLACEHOLDER_SECURITY_PUBLISHERS).map((p) => [p.id, p]),
  );
  const policies = new Map(
    (options?.policies ?? PLACEHOLDER_SECURITY_POLICIES).map((p) => [p.id, p]),
  );
  const events = new Map(
    (options?.events ?? createPlaceholderSecurityEvents()).map((e) => [e.id, e]),
  );
  const threats = new Map(
    (options?.threats ?? createPlaceholderSecurityThreats()).map((t) => [t.id, t]),
  );
  const sessions = new Map(
    (options?.sessions ?? createPlaceholderSecuritySessions()).map((s) => [s.id, s]),
  );
  const permissions = new Map(
    (options?.permissions ?? createPlaceholderSecurityPermissions()).map((p) => [p.id, p]),
  );
  let compliance = options?.compliance ?? createPlaceholderComplianceSnapshot();
  let domains = [...(options?.domains ?? createPlaceholderDomainSignals())];

  return {
    registerPublisher(publisher) {
      publishers.set(publisher.id, publisher);
    },
    unregisterPublisher(id) {
      publishers.delete(id);
    },
    getPublisher(id) {
      return publishers.get(id);
    },
    listPublishers() {
      return [...publishers.values()];
    },
    registerPolicy(policy) {
      policies.set(policy.id, policy);
    },
    listPolicies() {
      return [...policies.values()];
    },
    registerEvent(event) {
      events.set(event.id, event);
    },
    listEvents() {
      return [...events.values()];
    },
    registerThreat(threat) {
      threats.set(threat.id, threat);
    },
    listThreats() {
      return [...threats.values()];
    },
    registerSession(session) {
      sessions.set(session.id, session);
    },
    listSessions() {
      return [...sessions.values()];
    },
    registerPermission(permission) {
      permissions.set(permission.id, permission);
    },
    listPermissions() {
      return [...permissions.values()];
    },
    setComplianceSnapshot(snapshot) {
      compliance = snapshot;
    },
    getComplianceSnapshot() {
      return compliance;
    },
    listDomainSignals() {
      return domains;
    },
    setDomainSignals(signals) {
      domains = [...signals];
    },
  };
}

export const defaultSecurityRegistry = createSecurityRegistry();
