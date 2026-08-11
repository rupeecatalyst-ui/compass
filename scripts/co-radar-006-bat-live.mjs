/**
 * CO-RADAR-006 — Live BAT evidence against deployed Vercel production.
 * Login → Force EME recalculate → Read Radar certified snapshot.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE =
  process.env.CO_RADAR_006_BASE_URL?.trim() ||
  "https://catalyst-one-two.vercel.app";
const EMAIL = process.env.CO_BAT_ADMIN_EMAIL || "admin@compass.com";
const PASSWORD = process.env.CO_BAT_ADMIN_PASSWORD || "Admin@123";

async function main() {
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok || !loginJson.success) {
    throw new Error(
      `Login failed: ${loginRes.status} ${JSON.stringify(loginJson)}`,
    );
  }
  const token =
    loginJson.data?.accessToken ||
    loginJson.data?.token ||
    loginJson.accessToken;
  if (!token) {
    throw new Error(`No access token in login response: ${JSON.stringify(loginJson)}`);
  }

  const auth = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const forceRes = await fetch(`${BASE}/api/admin/enterprise-metrics`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      action: "force_recalculate",
      metricKeys: [
        "mission_control.executive_snapshot",
        "mission_control.radar_dashboard",
      ],
    }),
  });
  const forceJson = await forceRes.json();
  if (!forceRes.ok || !forceJson.success) {
    throw new Error(
      `Force recalculate failed: ${forceRes.status} ${JSON.stringify(forceJson)}`,
    );
  }

  // Brief settle
  await new Promise((r) => setTimeout(r, 2000));

  const radarRes = await fetch(`${BASE}/api/enterprise-metrics/radar`, {
    headers: auth,
    cache: "no-store",
  });
  const radarJson = await radarRes.json();
  if (!radarRes.ok || !radarJson.success) {
    throw new Error(
      `Radar snapshot read failed: ${radarRes.status} ${JSON.stringify(radarJson)}`,
    );
  }

  const data = radarJson.data ?? {};
  const payload = data.snapshot ?? data.payload ?? data;
  const dashboard = payload.dashboard ?? payload?.payload?.dashboard;
  const summary = payload.summary ?? payload?.payload?.summary ?? {};
  const kpis = dashboard?.kpis ?? [];
  const rows = dashboard?.rows ?? [];

  const atRisk = kpis.find((k) => k.id === "at_risk");
  const onTrack = kpis.find((k) => k.id === "on_track");
  const needsAttention = kpis.find((k) => k.id === "needs_attention");

  // Timeline evidence: rows carry lastActivity / idle; also check hover / activity fields
  const rowsWithActivity = rows.filter(
    (r) =>
      (r.lastActivityAt && r.lastActivityAt !== "—") ||
      (typeof r.idleDays === "number" && r.activityState && r.activityState !== "at_risk") ||
      (typeof r.dealHealthScore === "number" && r.dealHealthScore > 6),
  );
  const healthFloor6 = rows.filter((r) => r.dealHealthScore === 6).length;
  const avgHealth =
    summary.healthScore ??
    dashboard?.vector?.healthScore ??
    dashboard?.hoverSummary?.healthScore;

  const report = {
    sprint: "CO-RADAR-006",
    batOnly: true,
    baseUrl: BASE,
    radarPageUrl: `${BASE}/chanakya-radar`,
    loginOk: true,
    forceRecalculate: {
      ok: true,
      runId: forceJson.data?.run?.id ?? forceJson.data?.runId ?? null,
      status: forceJson.data?.run?.status ?? null,
      snapshotsWritten: forceJson.data?.run?.snapshotsWritten ?? null,
      failures: forceJson.data?.run?.failures ?? null,
      rawKeys: Object.keys(forceJson.data ?? {}),
    },
    snapshot: {
      version: payload.version ?? summary.version ?? null,
      asOf: payload.asOf ?? data.asOf ?? null,
      generatedAt: payload.generatedAt ?? null,
      program: payload.program ?? null,
      sourceModules: payload.sourceModules ?? null,
      dealCount: summary.dealCount ?? rows.length,
      healthScore: avgHealth,
      direction: summary.direction ?? dashboard?.vector?.direction ?? null,
      quadrantCounts: summary.quadrantCounts ?? null,
      atRisk: atRisk?.count ?? null,
      atRiskPct: atRisk?.percentage ?? null,
      needsAttention: needsAttention?.count ?? null,
      onTrack: onTrack?.count ?? null,
      rowCount: rows.length,
      healthFloor6Count: healthFloor6,
      rowsWithNonFloorHealth: rowsWithActivity.length,
      sampleRows: rows.slice(0, 10).map((r) => ({
        dealHealthScore: r.dealHealthScore,
        quadrant: r.quadrant,
        idleDays: r.idleDays,
        activityState: r.activityState,
        lastActivityAt: r.lastActivityAt,
        lastActivityLabel: r.lastActivityLabel,
      })),
    },
    batChecks: {
      notStaleHealth6:
        avgHealth !== 6 && (healthFloor6 === 0 || healthFloor6 < rows.length),
      avgHealthAboveFloor: typeof avgHealth === "number" && avgHealth > 6,
      atRiskNotDominant100: (atRisk?.percentage ?? 100) < 100,
      sourceModulesIncludeCoRadar005: Array.isArray(payload.sourceModules)
        ? payload.sourceModules.includes("CO-RADAR-005") ||
          payload.sourceModules.includes("EnterpriseDealTimelineEvent")
        : null,
    },
  };

  const dir = resolve(process.cwd(), "docs/co-radar-006");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, "CO-RADAR-006-BAT-EVIDENCE.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));

  if (!report.batChecks.avgHealthAboveFloor) {
    throw new Error(`BAT fail: avg health still floor-like (${avgHealth})`);
  }
  if (!report.batChecks.atRiskNotDominant100) {
    throw new Error("BAT fail: At Risk still 100%");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
