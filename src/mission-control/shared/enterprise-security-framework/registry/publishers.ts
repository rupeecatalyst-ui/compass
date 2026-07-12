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
    description: "Loan file access and workspace signals",
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
  const now = Date.now();
  return [
    {
      id: "sevt-session-anomaly",
      title: "Anomalous session pattern",
      summary: "Placeholder session anomaly for framework event bus.",
      categoryId: "sessions",
      severity: "high",
      lifecycle: "detected",
      publisherId: "security-operations",
      sourceModule: "Session Monitor",
      occurredAt: new Date(now - 12 * 60000).toISOString(),
      relatedSessionId: "sess-anomaly-1",
    },
    {
      id: "sevt-mfa-coverage",
      title: "MFA coverage drift signal",
      summary: "Placeholder MFA domain signal — no challenge issued.",
      categoryId: "mfa",
      severity: "medium",
      lifecycle: "acknowledged",
      publisherId: "identity-fabric",
      sourceModule: "Identity Fabric",
      occurredAt: new Date(now - 45 * 60000).toISOString(),
    },
    {
      id: "sevt-policy-review",
      title: "Privileged access review due",
      summary: "Placeholder authorization review cue.",
      categoryId: "permissions",
      severity: "medium",
      lifecycle: "detected",
      publisherId: "access-governance",
      sourceModule: "Access Governance",
      occurredAt: new Date(now - 3 * 3600000).toISOString(),
    },
    {
      id: "sevt-threat-probe",
      title: "Suspicious probe pattern",
      summary: "Placeholder threat detection event.",
      categoryId: "threat_detection",
      severity: "critical",
      lifecycle: "investigating",
      publisherId: "threat-detection",
      sourceModule: "Threat Detection",
      occurredAt: new Date(now - 8 * 60000).toISOString(),
      relatedThreatId: "sthreat-probe",
      routeHint: "/mission-control/alert-center",
    },
  ];
}

export function createPlaceholderSecurityThreats(): SecurityThreat[] {
  const now = Date.now();
  return [
    {
      id: "sthreat-probe",
      title: "Edge probe cluster",
      summary: "Placeholder threat — detection pipeline not connected.",
      severity: "critical",
      category: "Network",
      status: "open",
      sourceModule: "Threat Detection",
      publisherId: "threat-detection",
      detectedAt: new Date(now - 8 * 60000).toISOString(),
      recommendedAction: "Review related timeline events (placeholder).",
      routeHint: "/mission-control/alert-center",
    },
    {
      id: "sthreat-session",
      title: "Credential stuffing watch",
      summary: "Identity-adjacent threat signal for executive visibility.",
      severity: "high",
      category: "Identity",
      status: "watching",
      sourceModule: "Identity Fabric",
      publisherId: "identity-fabric",
      detectedAt: new Date(now - 90 * 60000).toISOString(),
      recommendedAction: "Monitor authentication domain (no enforcement).",
    },
  ];
}

export function createPlaceholderSecuritySessions(): SecuritySession[] {
  const now = Date.now();
  return [
    {
      id: "sess-nominal-1",
      principalHint: "ops.lead@placeholder",
      state: "active",
      deviceHint: "Managed workstation",
      locationHint: "IN-West",
      startedAt: new Date(now - 2 * 3600000).toISOString(),
      lastSeenAt: new Date(now - 5 * 60000).toISOString(),
      riskLabel: "Low",
      publisherId: "security-operations",
    },
    {
      id: "sess-anomaly-1",
      principalHint: "contractor@placeholder",
      state: "anomalous",
      deviceHint: "Unrecognized device",
      locationHint: "Unknown",
      startedAt: new Date(now - 40 * 60000).toISOString(),
      lastSeenAt: new Date(now - 10 * 60000).toISOString(),
      riskLabel: "Elevated",
      publisherId: "security-operations",
    },
  ];
}

export function createPlaceholderSecurityPermissions(): SecurityPermission[] {
  return [
    {
      id: "perm-soc-view",
      resource: "mission-control.security",
      action: "view",
      effect: "allow",
      description: "View Security Operations Center",
      scopeHint: "mission-control",
      publisherId: "access-governance",
    },
    {
      id: "perm-breakglass-activate",
      resource: "security.break_glass",
      action: "activate",
      effect: "audit_only",
      description: "Break-glass activation — not executable in this sprint",
      publisherId: "security-operations",
    },
    {
      id: "perm-session-revoke",
      resource: "security.sessions",
      action: "revoke",
      effect: "deny",
      description: "Session revocation deferred — contract only",
      publisherId: "access-governance",
    },
  ];
}

export function createPlaceholderComplianceSnapshot(): SecurityComplianceSnapshot {
  return {
    id: "comp-snap-default",
    overallHealth: "watch",
    overallLabel: "Watch",
    controlsPassingLabel: "86% placeholder",
    openFindingsLabel: "4 open",
    nextReviewLabel: "In 12 days",
    summary:
      "Compliance posture for executive awareness. No control evaluation or audit runs.",
    asOf: new Date().toISOString(),
    controls: [
      {
        id: "ctrl-access-review",
        name: "Privileged access review",
        frameworkHint: "Internal baseline",
        status: "failing",
        findingCount: 2,
        publisherId: "access-governance",
        summary: "Review backlog placeholder",
      },
      {
        id: "ctrl-mfa-coverage",
        name: "MFA coverage",
        frameworkHint: "Internal baseline",
        status: "not_assessed",
        findingCount: 1,
        publisherId: "identity-fabric",
      },
      {
        id: "ctrl-audit-retention",
        name: "Audit retention",
        frameworkHint: "Internal baseline",
        status: "passing",
        findingCount: 0,
        publisherId: "compliance",
      },
      {
        id: "ctrl-breakglass",
        name: "Break-glass documentation",
        frameworkHint: "Internal baseline",
        status: "passing",
        findingCount: 0,
        publisherId: "security-operations",
      },
    ],
  };
}

export function createPlaceholderDomainSignals(): SecurityDomainSignal[] {
  return [
    {
      id: "identity",
      title: "Identity",
      health: "watch",
      severity: "medium",
      summary: "Directory posture placeholder — no identity engine binding.",
      signalLabel: "2 reviews pending",
      publisherIds: ["identity-fabric", "customer-360"],
    },
    {
      id: "authentication",
      title: "Authentication",
      health: "healthy",
      severity: "low",
      summary: "Sign-in pathways represented for executive awareness only.",
      signalLabel: "Nominal",
      publisherIds: ["identity-fabric"],
    },
    {
      id: "authorization",
      title: "Authorization",
      health: "healthy",
      severity: "info",
      summary: "Permission topology placeholder — enforcement deferred.",
      signalLabel: "Policy map ready",
      publisherIds: ["access-governance"],
    },
    {
      id: "mfa",
      title: "MFA",
      health: "watch",
      severity: "medium",
      summary: "MFA coverage signals only — no challenge execution.",
      signalLabel: "Coverage watch",
      publisherIds: ["identity-fabric"],
    },
    {
      id: "sessions",
      title: "Sessions",
      health: "elevated",
      severity: "high",
      summary: "Active session overview — no revocation here.",
      signalLabel: "3 anomalous",
      publisherIds: ["security-operations"],
    },
    {
      id: "permissions",
      title: "Permissions",
      health: "healthy",
      severity: "low",
      summary: "Role and grant surface architecture — no live evaluation.",
      signalLabel: "Stable",
      publisherIds: ["access-governance"],
    },
    {
      id: "break_glass",
      title: "Break Glass",
      health: "healthy",
      severity: "info",
      summary: "Emergency access readiness — no break-glass activation.",
      signalLabel: "Idle",
      publisherIds: ["security-operations"],
    },
    {
      id: "audit",
      title: "Audit",
      health: "watch",
      severity: "medium",
      summary: "Audit trail awareness — no audit execution.",
      signalLabel: "Pipeline ready",
      publisherIds: ["compliance", "mission-control"],
    },
    {
      id: "compliance",
      title: "Compliance",
      health: "watch",
      severity: "medium",
      summary: "Control status placeholders for executive review.",
      signalLabel: "4 findings open",
      publisherIds: ["compliance"],
    },
    {
      id: "threat_detection",
      title: "Threat Detection",
      health: "elevated",
      severity: "high",
      summary: "Detection signals for the SOC — no sensor APIs.",
      signalLabel: "2 active threats",
      publisherIds: ["threat-detection"],
    },
  ];
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
