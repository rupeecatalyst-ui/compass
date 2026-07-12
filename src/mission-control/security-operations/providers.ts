/**
 * Security Operations Center — providers.
 * Consumes Enterprise Security Framework (no auth / MFA / audit execution).
 */

import {
  createEnterpriseSecurityFramework,
  projectComplianceSnapshot,
  projectDomainSignal,
  projectHealthFromDomains,
  projectIdentityPlaceholder,
  projectSecurityEvent,
  projectSecuritySummary,
  projectSecurityThreat,
  projectSessionsToSummary,
} from "../shared/enterprise-security-framework";
import type {
  ComplianceStatusModel,
  IdentityOverviewModel,
  SecurityAlertItem,
  SecurityDomain,
  SecurityDomainId,
  SecurityEvent,
  SecurityEventKind,
  SecurityHealthIndicator,
  SecurityHealthStatus,
  SecurityOperationsModel,
  SecurityQuickAction,
  SecuritySeverity,
  SecuritySummaryModel,
  SessionSummaryModel,
  ThreatItem,
} from "./types";

export interface SecurityProvider {
  getSummary(): Promise<SecuritySummaryModel>;
  listHealth(): Promise<readonly SecurityHealthIndicator[]>;
  listDomains(): Promise<readonly SecurityDomain[]>;
  listEvents(): Promise<readonly SecurityEvent[]>;
  listAlerts(): Promise<readonly SecurityAlertItem[]>;
  listQuickActions(): Promise<readonly SecurityQuickAction[]>;
  getOperationsModel(): Promise<SecurityOperationsModel>;
}

export interface ThreatProvider {
  listThreats(): Promise<readonly ThreatItem[]>;
}

export interface ComplianceProvider {
  getComplianceStatus(): Promise<ComplianceStatusModel>;
}

export interface IdentityProvider {
  getIdentityOverview(): Promise<IdentityOverviewModel>;
  getSessionSummary(): Promise<SessionSummaryModel>;
}

const framework = createEnterpriseSecurityFramework();

function asHealth(status: string): SecurityHealthStatus {
  const allowed: SecurityHealthStatus[] = [
    "healthy",
    "watch",
    "elevated",
    "critical",
    "unknown",
  ];
  return (allowed.includes(status as SecurityHealthStatus)
    ? status
    : "unknown") as SecurityHealthStatus;
}

function asSeverity(severity: string): SecuritySeverity {
  const allowed: SecuritySeverity[] = ["critical", "high", "medium", "low", "info"];
  return (allowed.includes(severity as SecuritySeverity)
    ? severity
    : "info") as SecuritySeverity;
}

function asDomainId(id: string): SecurityDomainId {
  const allowed: SecurityDomainId[] = [
    "identity",
    "authentication",
    "authorization",
    "mfa",
    "sessions",
    "permissions",
    "break_glass",
    "audit",
    "compliance",
    "threat_detection",
  ];
  return (allowed.includes(id as SecurityDomainId) ? id : "identity") as SecurityDomainId;
}

function asEventKind(kind: string): SecurityEventKind {
  const allowed: SecurityEventKind[] = [
    "threat",
    "identity",
    "session",
    "policy",
    "compliance",
    "access",
  ];
  return (allowed.includes(kind as SecurityEventKind) ? kind : "access") as SecurityEventKind;
}

export function createThreatProvider(): ThreatProvider {
  return {
    async listThreats() {
      const threats = await framework.threatProvider.listThreats();
      return threats.map((t) => {
        const p = projectSecurityThreat(t);
        return {
          id: p.id,
          title: p.title,
          summary: p.summary,
          severity: asSeverity(p.severity),
          category: p.category,
          sourceModule: p.sourceModule,
          detectedAt: p.detectedAt,
          recommendedAction: p.recommendedAction,
          viewDetailsAction: p.viewDetailsAction,
        };
      });
    },
  };
}

export function createComplianceProvider(): ComplianceProvider {
  return {
    async getComplianceStatus() {
      const snap = await framework.complianceProvider.getComplianceSnapshot();
      if (!snap) {
        return {
          overallLabel: "Unknown",
          status: "unknown",
          controlsPassingLabel: "—",
          openFindingsLabel: "—",
          nextReviewLabel: "—",
          summary: "No compliance snapshot registered.",
        };
      }
      const p = projectComplianceSnapshot(snap);
      return {
        overallLabel: p.overallLabel,
        status: asHealth(p.status),
        controlsPassingLabel: p.controlsPassingLabel,
        openFindingsLabel: p.openFindingsLabel,
        nextReviewLabel: p.nextReviewLabel,
        summary: p.summary,
      };
    },
  };
}

export function createIdentityProvider(): IdentityProvider {
  return {
    async getIdentityOverview() {
      return projectIdentityPlaceholder();
    },
    async getSessionSummary() {
      const sessions = await framework.sessionProvider.listSessions();
      return projectSessionsToSummary(sessions);
    },
  };
}

export function createSecurityProvider(): SecurityProvider {
  const threats = createThreatProvider();
  const compliance = createComplianceProvider();
  const identity = createIdentityProvider();

  return {
    async getSummary() {
      const [events, domains, publishers] = await Promise.all([
        framework.eventProvider.listEvents(),
        framework.domainProvider.listDomainSignals(),
        framework.registryProvider.listPublishers(),
      ]);
      return projectSecuritySummary({ events, domains, publishers });
    },
    async listHealth() {
      const domains = await framework.domainProvider.listDomainSignals();
      return projectHealthFromDomains(domains).map((h) => ({
        id: h.id,
        label: h.label,
        status: asHealth(h.status),
        detail: h.detail,
      }));
    },
    async listDomains() {
      const domains = await framework.domainProvider.listDomainSignals();
      return domains
        .filter((d) =>
          [
            "identity",
            "authentication",
            "authorization",
            "mfa",
            "sessions",
            "permissions",
            "break_glass",
            "audit",
            "compliance",
            "threat_detection",
          ].includes(d.id),
        )
        .map((d) => {
          const p = projectDomainSignal(d);
          return {
            id: asDomainId(p.id),
            title: p.title,
            status: asHealth(p.status),
            severity: asSeverity(p.severity),
            summary: p.summary,
            signalLabel: p.signalLabel,
            viewDetailsAction: p.viewDetailsAction,
          };
        });
    },
    async listEvents() {
      const events = await framework.eventProvider.listEvents();
      return events.map((e) => {
        const p = projectSecurityEvent(e);
        return {
          id: p.id,
          title: p.title,
          summary: p.summary,
          kind: asEventKind(p.kind),
          severity: asSeverity(p.severity),
          domainId: asDomainId(p.domainId),
          sourceModule: p.sourceModule,
          occurredAt: p.occurredAt,
          acknowledgeAction: p.acknowledgeAction,
          investigateAction: p.investigateAction,
        };
      });
    },
    async listAlerts() {
      const threatList = await threats.listThreats();
      return threatList.map((t) => ({
        id: `sa-${t.id}`,
        title: t.title,
        severity: t.severity,
        category: t.category,
        sourceModule: t.sourceModule,
        recommendedAction: t.recommendedAction,
        viewDetailsAction: t.viewDetailsAction,
      }));
    },
    async listQuickActions() {
      return [
        {
          id: "qa-alerts",
          label: "Open Alert Center",
          description: "Jump to enterprise alerts",
          href: "/mission-control/alert-center",
        },
        {
          id: "qa-situation",
          label: "Situation Room",
          description: "Operational awareness war room",
          href: "/mission-control/situation-room",
        },
        {
          id: "qa-search",
          label: "Search Center",
          description: "Find security-related entities",
          href: "/mission-control/search",
        },
        {
          id: "qa-ack",
          label: "Acknowledge selected",
          description: "Placeholder — no lifecycle mutation",
          placeholder: true,
        },
        {
          id: "qa-breakglass",
          label: "Break-glass readiness",
          description: "View only — no activation",
          placeholder: true,
        },
      ];
    },
    async getOperationsModel() {
      const [
        summary,
        health,
        domains,
        events,
        alerts,
        quickActions,
        threatList,
        complianceStatus,
        identityOverview,
        sessions,
      ] = await Promise.all([
        this.getSummary(),
        this.listHealth(),
        this.listDomains(),
        this.listEvents(),
        this.listAlerts(),
        this.listQuickActions(),
        threats.listThreats(),
        compliance.getComplianceStatus(),
        identity.getIdentityOverview(),
        identity.getSessionSummary(),
      ]);

      return {
        summary,
        health,
        domains,
        events,
        threats: threatList,
        identity: identityOverview,
        sessions,
        compliance: complianceStatus,
        alerts,
        quickActions,
      };
    },
  };
}
