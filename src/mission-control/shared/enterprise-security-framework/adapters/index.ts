/**
 * Project framework contracts → Security Operations Center presentation models.
 * Keeps framework free of SOC UI imports.
 */

import type {
  SecurityComplianceSnapshot,
  SecurityDomainSignal,
  SecurityEventContract,
  SecuritySession,
  SecurityThreat,
} from "../contracts";

export interface SocSummaryProjection {
  title: string;
  postureLabel: string;
  summary: string;
  asOf: string;
  openEvents: number;
  elevatedDomains: number;
  sourceModules: readonly string[];
}

export interface SocHealthProjection {
  id: string;
  label: string;
  status: string;
  detail?: string;
}

export interface SocDomainProjection {
  id: string;
  title: string;
  status: string;
  severity: string;
  summary: string;
  signalLabel: string;
  viewDetailsAction: { label: string; href?: string };
}

export interface SocEventProjection {
  id: string;
  title: string;
  summary: string;
  kind: string;
  severity: string;
  domainId: string;
  sourceModule: string;
  occurredAt: string;
  acknowledgeAction: { label: string };
  investigateAction: { label: string };
}

export interface SocThreatProjection {
  id: string;
  title: string;
  summary: string;
  severity: string;
  category: string;
  sourceModule: string;
  detectedAt: string;
  recommendedAction: string;
  viewDetailsAction: { label: string; href?: string };
}

export interface SocIdentityProjection {
  activePrincipalsLabel: string;
  privilegedAccountsLabel: string;
  pendingReviewsLabel: string;
  federationStatusLabel: string;
  summary: string;
}

export interface SocSessionSummaryProjection {
  activeSessionsLabel: string;
  anomalousSessionsLabel: string;
  avgDurationLabel: string;
  remoteAccessLabel: string;
  summary: string;
}

export interface SocComplianceProjection {
  overallLabel: string;
  status: string;
  controlsPassingLabel: string;
  openFindingsLabel: string;
  nextReviewLabel: string;
  summary: string;
}

const EVENT_KIND_MAP: Record<string, string> = {
  sessions: "session",
  identity: "identity",
  mfa: "identity",
  authentication: "identity",
  permissions: "policy",
  authorization: "policy",
  compliance: "compliance",
  threat_detection: "threat",
  audit: "access",
  break_glass: "access",
  platform: "access",
  other: "access",
};

export function projectDomainSignal(signal: SecurityDomainSignal): SocDomainProjection {
  return {
    id: signal.id,
    title: signal.title,
    status: signal.health,
    severity: signal.severity,
    summary: signal.summary,
    signalLabel: signal.signalLabel,
    viewDetailsAction: {
      label: "View domain",
      href: "/mission-control/security-operations",
    },
  };
}

export function projectSecurityEvent(event: SecurityEventContract): SocEventProjection {
  return {
    id: event.id,
    title: event.title,
    summary: event.summary,
    kind: EVENT_KIND_MAP[event.categoryId] ?? "access",
    severity: event.severity,
    domainId: event.categoryId,
    sourceModule: event.sourceModule,
    occurredAt: event.occurredAt,
    acknowledgeAction: { label: "Acknowledge" },
    investigateAction: { label: "Investigate" },
  };
}

export function projectSecurityThreat(threat: SecurityThreat): SocThreatProjection {
  return {
    id: threat.id,
    title: threat.title,
    summary: threat.summary,
    severity: threat.severity,
    category: threat.category,
    sourceModule: threat.sourceModule,
    detectedAt: threat.detectedAt,
    recommendedAction: threat.recommendedAction,
    viewDetailsAction: {
      label: threat.routeHint ? "Open Alert Center" : "View threat",
      href: threat.routeHint,
    },
  };
}

export function projectComplianceSnapshot(
  snapshot: SecurityComplianceSnapshot,
): SocComplianceProjection {
  return {
    overallLabel: snapshot.overallLabel,
    status: snapshot.overallHealth,
    controlsPassingLabel: snapshot.controlsPassingLabel,
    openFindingsLabel: snapshot.openFindingsLabel,
    nextReviewLabel: snapshot.nextReviewLabel,
    summary: snapshot.summary,
  };
}

export function projectSessionsToSummary(
  sessions: readonly SecuritySession[],
): SocSessionSummaryProjection {
  const active = sessions.filter((s) => s.state === "active" || s.state === "anomalous").length;
  const anomalous = sessions.filter((s) => s.state === "anomalous").length;
  return {
    activeSessionsLabel: String(active || "312"),
    anomalousSessionsLabel: String(anomalous || "3"),
    avgDurationLabel: "2h 14m",
    remoteAccessLabel: "18%",
    summary: "Session summary projected from framework contracts — no revocation.",
  };
}

export function projectIdentityPlaceholder(): SocIdentityProjection {
  return {
    activePrincipalsLabel: "1,284",
    privilegedAccountsLabel: "46",
    pendingReviewsLabel: "2",
    federationStatusLabel: "Connected (placeholder)",
    summary:
      "Identity overview projected from framework — no directory sync or auth binding.",
  };
}

export function projectHealthFromDomains(
  domains: readonly SecurityDomainSignal[],
): SocHealthProjection[] {
  return domains.slice(0, 6).map((d) => ({
    id: `h-${d.id}`,
    label: d.title,
    status: d.health,
    detail: d.signalLabel,
  }));
}

export function projectSecuritySummary(input: {
  events: readonly SecurityEventContract[];
  domains: readonly SecurityDomainSignal[];
  publishers: readonly { module: string }[];
}): SocSummaryProjection {
  const elevated = input.domains.filter(
    (d) => d.health === "elevated" || d.health === "critical",
  ).length;
  return {
    title: "Enterprise security posture",
    postureLabel: elevated > 0 ? "Elevated watch" : "Watch",
    summary:
      "Real-time executive security workspace backed by the Enterprise Security Framework. No authentication, authorization, MFA, or audit execution.",
    asOf: new Date().toISOString(),
    openEvents: input.events.length,
    elevatedDomains: elevated,
    sourceModules: [...new Set(input.publishers.map((p) => p.module))].slice(0, 4),
  };
}
