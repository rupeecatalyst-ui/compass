/**
 * CO-OPS-002 — Server-only System Health snapshot for Observability / Alert Center.
 * No secrets. No schema changes.
 */

import "server-only";

import { resolveBuildInformationPayload } from "@/lib/build-information/resolve-server";
import { createCorrelationId } from "@/lib/ops/correlation";
import { deriveOpsAlerts, summarizeOpsHealth } from "@/lib/ops/alert-rules";
import {
  estimateActiveUsers,
  listAudits,
  listErrors,
  listPerf,
} from "@/lib/ops/rings";
import type {
  OpsComponentStatus,
  OpsHealthSnapshot,
  OpsSlowEndpoint,
} from "@/types/ops-observability";

function asComponent(
  ok: boolean,
  degradedWhenFalse = true,
): OpsComponentStatus {
  if (ok) return "healthy";
  return degradedWhenFalse ? "degraded" : "down";
}

function computeTopSlowEndpoints(limit = 10): OpsSlowEndpoint[] {
  const samples = listPerf(200);
  const byKey = new Map<string, { endpoint: string; method: string; total: number; max: number; n: number }>();
  for (const s of samples) {
    const key = `${s.method} ${s.endpoint}`;
    const cur = byKey.get(key) ?? {
      endpoint: s.endpoint,
      method: s.method,
      total: 0,
      max: 0,
      n: 0,
    };
    cur.total += s.durationMs;
    cur.max = Math.max(cur.max, s.durationMs);
    cur.n += 1;
    byKey.set(key, cur);
  }
  return [...byKey.values()]
    .map((r) => ({
      endpoint: r.endpoint,
      method: r.method,
      avgMs: Math.round(r.total / Math.max(1, r.n)),
      maxMs: r.max,
      samples: r.n,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, limit);
}

function isJwtConfigured(): boolean {
  const secret = process.env.JWT_SECRET?.trim();
  const refresh = process.env.JWT_REFRESH_SECRET?.trim();
  return Boolean(secret && secret.length >= 32 && refresh && refresh.length >= 32);
}

export async function resolveOpsHealthSnapshot(): Promise<OpsHealthSnapshot> {
  const correlationId = createCorrelationId();
  const build = await resolveBuildInformationPayload();
  const recentErrors = listErrors(40);
  const recentAudits = listAudits(40);
  const perf = listPerf(200);

  const successish = perf.filter((p) => p.httpStatus < 400).length;
  const failed = perf.filter((p) => p.httpStatus >= 400).length;
  const errorWindow = successish + failed;
  const errorRatePct =
    errorWindow === 0
      ? 0
      : Math.round((failed / errorWindow) * 1000) / 10;

  const averageResponseMs =
    perf.length === 0
      ? null
      : Math.round(perf.reduce((sum, p) => sum + p.durationMs, 0) / perf.length);

  const jwtConfigured = isJwtConfigured();
  const migrationHealthy = Boolean(build.lastMigrationApplied) || !build.persistenceMode.toLowerCase().includes("prisma");

  const alerts = deriveOpsAlerts({
    databaseConnected: build.databaseConnected,
    persistenceMode: build.persistenceMode,
    jwtConfigured,
    errorRatePct,
    recentErrors,
    migrationHealthy,
  });

  const applicationStatus: OpsComponentStatus =
    alerts.some((a) => a.severity === "critical" && a.code === "UNEXPECTED_APPLICATION_ERRORS")
      ? "impaired"
      : "healthy";

  const databaseStatus: OpsComponentStatus = build.persistenceMode
    .toLowerCase()
    .includes("memory")
    ? "degraded"
    : asComponent(build.databaseConnected, false);

  const authenticationStatus: OpsComponentStatus = jwtConfigured ? "healthy" : "down";

  const apiHealth: OpsComponentStatus =
    errorRatePct >= 25 ? "impaired" : errorRatePct >= 10 ? "degraded" : "healthy";

  const migrationStatus: OpsComponentStatus = migrationHealthy
    ? "healthy"
    : build.databaseConnected
      ? "degraded"
      : "unknown";

  const snapshot: OpsHealthSnapshot = {
    asOf: new Date().toISOString(),
    correlationId,
    applicationStatus,
    databaseStatus,
    authenticationStatus,
    apiHealth,
    migrationStatus,
    errorRatePct,
    averageResponseMs,
    activeUsersEstimate: estimateActiveUsers(),
    persistenceMode: build.persistenceMode,
    dealRegistryStatus: build.dealRegistryStatus,
    databaseConnected: build.databaseConnected,
    lastMigrationApplied: build.lastMigrationApplied,
    topSlowEndpoints: computeTopSlowEndpoints(10),
    recentErrors,
    recentAudits,
    alerts,
    summary: "",
  };
  snapshot.summary = summarizeOpsHealth(snapshot);
  return snapshot;
}
