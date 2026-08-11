/**
 * CO-RADAR-005 — Read latest certified Radar snapshot health after force recalc.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import {
  EME_MISSION_CONTROL_RADAR_KEY,
  EME_PERIOD_LATEST,
} from "../src/constants/enterprise-metrics-engine.ts";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

try {
  const snap = await prisma.enterpriseMetricSnapshot.findFirst({
    where: {
      metricKey: EME_MISSION_CONTROL_RADAR_KEY,
      periodKey: EME_PERIOD_LATEST,
    },
    orderBy: { asOf: "desc" },
  });
  const payload = snap?.payload;
  const p =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  const summary = (p?.summary ?? null) as Record<string, unknown> | null;
  const dashboard = (p?.dashboard ?? null) as Record<string, unknown> | null;
  const kpis = Array.isArray(dashboard?.kpis) ? dashboard!.kpis : [];
  const rows = Array.isArray(dashboard?.rows) ? dashboard!.rows : [];

  const out = {
    metricKey: EME_MISSION_CONTROL_RADAR_KEY,
    asOf: snap?.asOf ?? null,
    createdAt: snap?.createdAt ?? null,
    numericValue: snap?.numericValue ?? null,
    sourceModules: p?.sourceModules ?? null,
    healthScore: summary?.healthScore ?? null,
    direction: summary?.direction ?? null,
    dealCount: summary?.dealCount ?? null,
    quadrantCounts: summary?.quadrantCounts ?? null,
    kpiCards: kpis,
    rowCount: rows.length,
    sampleRows: rows.slice(0, 5).map((r: unknown) => {
      const row = r as Record<string, unknown>;
      return {
        dealHealthScore: row.dealHealthScore,
        quadrant: row.quadrant,
        idleDays: row.idleDays,
        lastActivityAt: row.lastActivityAt,
        activityState: row.activityState,
      };
    }),
  };

  const dir = resolve(process.cwd(), "docs/co-radar-005");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "CO-RADAR-005-STORED-SNAPSHOT.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
} finally {
  await prisma.$disconnect();
}
