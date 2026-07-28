/**
 * CO-PERF-001 — DB-only waterfall cost model (no HTTP auth required).
 * Multiplies measured per-query RTT by known client call graphs.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const p = new PrismaClient();

async function time(label, fn) {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return {
    label,
    p50Ms: Number(samples[1].toFixed(1)),
    minMs: Number(samples[0].toFixed(1)),
    maxMs: Number(samples[2].toFixed(1)),
  };
}

async function main() {
  const deal = await p.enterpriseDeal.findFirst({
    where: { isDeleted: false, opportunityId: { not: null } },
    orderBy: { updatedAt: "desc" },
  });
  if (!deal) throw new Error("No deal");

  const unit = {
    opportunityGet: await time("opportunityGet", () =>
      p.enterpriseOpportunity.findFirst({
        where: { id: deal.opportunityId, isDeleted: false },
      }),
    ),
    dealGet: await time("dealGet", () =>
      p.enterpriseDeal.findFirst({ where: { id: deal.id, isDeleted: false } }),
    ),
    dealsByOpp: await time("dealsByOpp", () =>
      p.enterpriseDeal.findMany({
        where: {
          opportunityId: deal.opportunityId,
          isDeleted: false,
          lenderId: { not: null },
        },
      }),
    ),
    oppList50: await time("oppList50", () =>
      p.enterpriseOpportunity.findMany({
        where: { isDeleted: false },
        take: 50,
        orderBy: { updatedAt: "desc" },
      }),
    ),
    dealList50: await time("dealList50", () =>
      p.enterpriseDeal.findMany({
        where: { isDeleted: false },
        take: 50,
        orderBy: { updatedAt: "desc" },
      }),
    ),
    contactList50: await time("contactList50", () =>
      p.ecmContact.findMany({
        where: { isDeleted: false },
        take: 50,
        orderBy: { updatedAt: "desc" },
      }),
    ),
    lenderList100: await time("lenderList100", () =>
      p.enterpriseLender.findMany({
        where: { isDeleted: false, enabled: true },
        take: 100,
        orderBy: { updatedAt: "desc" },
      }),
    ),
    dealUpdateRoundTrip: await time("dealFindForUpdateShape", async () => {
      const row = await p.enterpriseDeal.findFirst({
        where: { id: deal.id, isDeleted: false },
      });
      // no write — measure read cost only for save preflight
      return row;
    }),
  };

  const g = (k) => unit[k].p50Ms;

  // Call-graph multipliers from CO-PERF-001 context integrity audit + current code
  const models = {
    myOpportunities: {
      queries: [{ name: "searchOpportunities", count: 1, unit: "oppList50" }],
      estimatedDbPathMs: g("oppList50"),
    },
    opportunityWorkspaceOpen: {
      queries: [
        { name: "getOpportunity gate", count: 1, unit: "opportunityGet" },
        { name: "getOpportunity provider", count: 1, unit: "opportunityGet" },
        { name: "loadDeals search", count: 1, unit: "dealList50" },
      ],
      estimatedDbPathMs: g("opportunityGet") * 2 + g("dealList50"),
      note: "Parallel gate∥provider still = ~max(2 gets) wall if parallel; code often remounts stages → sequential across journey",
    },
    dealWorkspaceOpen: {
      queries: [
        { name: "getDeal forceRefresh", count: 1, unit: "dealGet" },
        { name: "listDealsByOpportunity", count: 1, unit: "dealsByOpp" },
        { name: "getOpportunity (opp number)", count: 1, unit: "opportunityGet" },
      ],
      estimatedDbPathMs: g("dealGet") + g("dealsByOpp") + g("opportunityGet"),
      note: "loadDealPipelineRuntime is sequential",
    },
    moveToDeal_3lenders: {
      queries: [
        { name: "getOpportunity", count: 1, unit: "opportunityGet" },
        { name: "lender directory", count: 1, unit: "lenderList100" },
        {
          name: "createDeal (single TX after CO-QA-005)",
          count: 3,
          unit: "dealGet",
          factor: 2.5,
        },
      ],
      estimatedDbPathMs:
        g("opportunityGet") + g("lenderList100") + g("dealGet") * 2.5 * 3,
      note: "create cost approximated as 2.5× dealGet RTT (allocate+insert+snapshot+timeline in one TX)",
    },
    saveDeal_preflightPlusWrite: {
      queries: [
        { name: "getDeal for rowVersion", count: 1, unit: "dealGet" },
        { name: "updateDeal write", count: 1, unit: "dealGet", factor: 2 },
      ],
      estimatedDbPathMs: g("dealGet") + g("dealGet") * 2,
      note: "If UI also reloadRuntime after save, add dealWorkspaceOpen cost again",
    },
    saveThenReload: {
      estimatedDbPathMs:
        g("dealGet") +
        g("dealGet") * 2 +
        (g("dealGet") + g("dealsByOpp") + g("opportunityGet")),
      note: "Save + full pipeline reload — common if persist then reloadRuntime",
    },
  };

  // Add Vercel→client overhead estimate: API layer typically 1.5–3× raw Prisma RTT from same region
  const apiMultiplier = 2.0;
  const withApi = {};
  for (const [k, v] of Object.entries(models)) {
    withApi[k] = {
      ...v,
      estimatedApiPathMs: Number((v.estimatedDbPathMs * apiMultiplier).toFixed(0)),
      targetMs:
        k.startsWith("deal")
          ? 3000
          : k.startsWith("opportunity")
            ? 3000
            : k.startsWith("move")
              ? 5000
              : k.startsWith("save")
                ? 3000
                : 2000,
    };
  }

  const out = {
    at: new Date().toIsoString?.() || new Date().toISOString(),
    sampleDeal: { id: deal.id, number: deal.dealNumber, opportunityId: deal.opportunityId },
    unitCostsMs: unit,
    insight:
      "EXPLAIN ANALYZE execution ≪ 1ms; Prisma wall ~300ms/query → latency is RTT/pooler/serialization, not SQL CPU.",
    callGraphModels: withApi,
    poolConfigNote:
      "DATABASE_URL :6543 pgbouncer=true connection_limit unset → serverless can exhaust pool → Timed out fetching connection / Unable to start transaction",
  };

  writeFileSync(
    "docs/co-perf-001/CO-PERF-001-WATERFALL-MODEL.json",
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
