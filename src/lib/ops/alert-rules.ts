/**
 * CO-OPS-002 — Derive operational alerts from health + ring samples.
 */

import type {
  OpsDerivedAlert,
  OpsErrorSample,
  OpsHealthSnapshot,
} from "@/types/ops-observability";

function countLoginFailures(errors: readonly OpsErrorSample[], windowMs = 15 * 60_000): number {
  const cutoff = Date.now() - windowMs;
  return errors.filter((e) => {
    if (Date.parse(e.at) < cutoff) return false;
    const action = e.action.toLowerCase();
    const code = e.code.toLowerCase();
    return (
      action.includes("login") ||
      code.includes("invalid_credentials") ||
      code.includes("auth") ||
      code.includes("unauthorized") ||
      code.includes("invalid_token")
    );
  }).length;
}

export function deriveOpsAlerts(input: {
  databaseConnected: boolean;
  persistenceMode: string;
  jwtConfigured: boolean;
  errorRatePct: number;
  recentErrors: readonly OpsErrorSample[];
  migrationHealthy: boolean;
}): OpsDerivedAlert[] {
  const now = new Date().toISOString();
  const alerts: OpsDerivedAlert[] = [];

  if (!input.databaseConnected && input.persistenceMode.toLowerCase().includes("prisma")) {
    alerts.push({
      id: "ops-db-unavailable",
      title: "Database unavailable",
      summary: "Prisma persistence is configured but the database health check failed.",
      severity: "critical",
      category: "infrastructure",
      sourceModule: "CO-OPS-002 Health",
      generatedAt: now,
      recommendedAction: "Verify DATABASE_URL, Supabase project status, and migration connectivity.",
      code: "DATABASE_UNAVAILABLE",
    });
  }

  if (!input.jwtConfigured) {
    alerts.push({
      id: "ops-auth-misconfigured",
      title: "Authentication configuration incomplete",
      summary: "JWT signing secret is not configured for this environment.",
      severity: "critical",
      category: "security",
      sourceModule: "CO-OPS-002 Health",
      generatedAt: now,
      recommendedAction: "Set JWT_SECRET (or project equivalent) in the deployment environment.",
      code: "AUTH_MISCONFIGURED",
    });
  }

  if (!input.migrationHealthy && input.persistenceMode.toLowerCase().includes("prisma")) {
    alerts.push({
      id: "ops-migration-risk",
      title: "Migration status unknown or incomplete",
      summary: "Unable to confirm the latest applied Prisma migration.",
      severity: "high",
      category: "infrastructure",
      sourceModule: "CO-OPS-002 Health",
      generatedAt: now,
      recommendedAction: "Run migration status checks and review _prisma_migrations.",
      code: "MIGRATION_STATUS_UNKNOWN",
    });
  }

  if (input.errorRatePct >= 25) {
    alerts.push({
      id: "ops-high-error-rate",
      title: "High API error rate",
      summary: `Recent in-process error rate is approximately ${input.errorRatePct.toFixed(1)}%.`,
      severity: "high",
      category: "technology",
      sourceModule: "CO-OPS-002 Health",
      generatedAt: now,
      recommendedAction: "Inspect recent errors in Observability Center and correlate by x-correlation-id.",
      code: "HIGH_ERROR_RATE",
    });
  }

  const loginFailures = countLoginFailures(input.recentErrors);
  if (loginFailures >= 5) {
    alerts.push({
      id: "ops-repeated-login-failures",
      title: "Repeated login failures",
      summary: `${loginFailures} authentication failures observed in the last 15 minutes (this instance).`,
      severity: "high",
      category: "security",
      sourceModule: "CO-OPS-002 Health",
      generatedAt: now,
      recommendedAction: "Review auth logs, lockout policy, and possible credential stuffing.",
      code: "REPEATED_LOGIN_FAILURES",
    });
  }

  const crashes = input.recentErrors.filter((e) =>
    /crash|uncaught|fatal|internal_server/i.test(`${e.code} ${e.message}`),
  );
  if (crashes.length >= 3) {
    alerts.push({
      id: "ops-unexpected-crash",
      title: "Unexpected application errors",
      summary: `${crashes.length} severe runtime errors captured in the recent window.`,
      severity: "critical",
      category: "system",
      sourceModule: "CO-OPS-002 Health",
      generatedAt: now,
      recommendedAction: "Trace correlation IDs in Vercel logs and stabilize the failing path.",
      code: "UNEXPECTED_APPLICATION_ERRORS",
    });
  }

  return alerts;
}

export function summarizeOpsHealth(snapshot: Pick<
  OpsHealthSnapshot,
  | "applicationStatus"
  | "databaseStatus"
  | "authenticationStatus"
  | "apiHealth"
  | "alerts"
>): string {
  const critical = snapshot.alerts.filter((a) => a.severity === "critical").length;
  if (critical > 0) {
    return `Operational posture impaired — ${critical} critical alert(s) require attention.`;
  }
  const statuses = [
    snapshot.applicationStatus,
    snapshot.databaseStatus,
    snapshot.authenticationStatus,
    snapshot.apiHealth,
  ];
  if (statuses.includes("down") || statuses.includes("impaired")) {
    return "One or more core components are impaired.";
  }
  if (statuses.includes("degraded") || snapshot.alerts.length > 0) {
    return "Platform is operational with degraded signals — review alerts.";
  }
  return "Platform health checks are within normal operational bands.";
}
