/**
 * CO-PERF-001 — Measure-first performance profiling (API + DB + pool).
 * Does NOT optimise. Produces evidence for Response Time Certification.
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

const BASE =
  process.env.CO_PERF_BASE_URL ||
  "https://catalyst-one-two.vercel.app";

const p = new PrismaClient({
  log: [{ emit: "event", level: "query" }],
});

const queryLog = [];
p.$on("query", (e) => {
  queryLog.push({
    durationMs: e.duration,
    query: e.query.slice(0, 200),
  });
});

function redactUrl(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    return {
      host: url.hostname,
      port: url.port || "5432",
      pgbouncer: url.searchParams.get("pgbouncer"),
      connection_limit: url.searchParams.get("connection_limit"),
      pool_timeout: url.searchParams.get("pool_timeout"),
      uses6543: url.port === "6543",
    };
  } catch {
    return { parseError: true };
  }
}

async function timedFetch(path, { method = "GET", token, body } = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const t0 = performance.now();
  let ttfb = null;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  // Approximate TTFB as headers received (fetch doesn't expose; use total until body start)
  const reader = res.body?.getReader?.();
  if (reader) {
    await reader.read();
    ttfb = performance.now() - t0;
    // cancel remaining
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
  const text = await res.text().catch(() => "");
  const total = performance.now() - t0;
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    path,
    method,
    status: res.status,
    ttfbMs: ttfb != null ? Number(ttfb.toFixed(1)) : Number(total.toFixed(1)),
    totalMs: Number(total.toFixed(1)),
    requestBytes: body ? JSON.stringify(body).length : 0,
    responseBytes: text.length,
    ok: res.ok,
    error: json?.error?.message || (!res.ok ? text.slice(0, 120) : null),
  };
}

async function login() {
  const candidates = [
    {
      email: process.env.CO_PERF_EMAIL || "admin@compass.com",
      password: process.env.CO_PERF_PASSWORD || "Admin@123",
    },
  ];
  for (const c of candidates) {
    const r = await timedFetch("/api/auth/login", {
      method: "POST",
      body: { email: c.email, password: c.password },
    });
    // Need full body for token — re-fetch properly
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    });
    const json = await res.json().catch(() => ({}));
    const token =
      json?.data?.accessToken ||
      json?.data?.tokens?.accessToken ||
      json?.accessToken ||
      json?.data?.session?.accessToken;
    if (token) {
      return { token, loginMs: r.totalMs, email: c.email, status: res.status };
    }
    return {
      token: null,
      loginMs: r.totalMs,
      email: c.email,
      status: res.status,
      error: json?.error || json,
    };
  }
}

async function dbExplain(label, sql) {
  const t0 = performance.now();
  try {
    const plan = await p.$queryRawUnsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
    );
    const ms = performance.now() - t0;
    const row = Array.isArray(plan) ? plan[0] : plan;
    const queryPlan = row?.["QUERY PLAN"] ?? row?.queryPlan ?? row;
    const root = Array.isArray(queryPlan) ? queryPlan[0] : queryPlan;
    return {
      label,
      ok: true,
      wallMs: Number(ms.toFixed(1)),
      planningTime: root?.["Planning Time"],
      executionTime: root?.["Execution Time"],
      nodeType: root?.Plan?.["Node Type"],
      actualTotalTime: root?.Plan?.["Actual Total Time"],
      sharedHitBlocks: root?.Plan?.["Shared Hit Blocks"],
      sharedReadBlocks: root?.Plan?.["Shared Read Blocks"],
    };
  } catch (e) {
    return {
      label,
      ok: false,
      wallMs: Number((performance.now() - t0).toFixed(1)),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function measureDbQueries() {
  queryLog.length = 0;
  const t0 = performance.now();
  const opps = await p.enterpriseOpportunity.findMany({
    where: { isDeleted: false },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });
  const oppListMs = performance.now() - t0;

  const sampleOpp = opps[0];
  const sampleDeal = await p.enterpriseDeal.findFirst({
    where: { isDeleted: false, opportunityId: { not: null } },
    orderBy: { updatedAt: "desc" },
  });

  const t1 = performance.now();
  if (sampleOpp) {
    await p.enterpriseOpportunity.findFirst({
      where: { id: sampleOpp.id, isDeleted: false },
    });
  }
  const oppGetMs = performance.now() - t1;

  const t2 = performance.now();
  if (sampleDeal) {
    await p.enterpriseDeal.findFirst({
      where: { id: sampleDeal.id, isDeleted: false },
    });
    if (sampleDeal.opportunityId) {
      await p.enterpriseDeal.findMany({
        where: {
          opportunityId: sampleDeal.opportunityId,
          isDeleted: false,
          lenderId: { not: null },
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
      });
    }
  }
  const dealOpenSimMs = performance.now() - t2;

  const t3 = performance.now();
  await p.ecmContact.findMany({
    where: { isDeleted: false },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });
  const contactListMs = performance.now() - t3;

  const t4 = performance.now();
  await p.enterpriseLender.findMany({
    where: { isDeleted: false, enabled: true },
    take: 200,
    orderBy: { updatedAt: "desc" },
  });
  const lenderListMs = performance.now() - t4;

  const explains = [];
  explains.push(
    await dbExplain(
      "opportunity_list_50",
      `SELECT id FROM enterprise_opportunities WHERE COALESCE(is_deleted,false)=false ORDER BY updated_at DESC LIMIT 50`,
    ),
  );
  if (sampleDeal?.opportunityId) {
    explains.push(
      await dbExplain(
        "deals_by_opportunity",
        `SELECT id FROM enterprise_deals WHERE opportunity_id='${sampleDeal.opportunityId}' AND COALESCE(is_deleted,false)=false AND lender_id IS NOT NULL ORDER BY updated_at DESC`,
      ),
    );
  }
  explains.push(
    await dbExplain(
      "lender_list_active",
      `SELECT id FROM enterprise_lenders WHERE COALESCE(is_deleted,false)=false AND enabled=true ORDER BY updated_at DESC LIMIT 200`,
    ),
  );

  const pool = await p.$queryRawUnsafe(`
    SELECT
      COUNT(*)::int AS total_backends,
      COUNT(*) FILTER (WHERE state = 'active')::int AS active,
      COUNT(*) FILTER (WHERE state = 'idle')::int AS idle,
      COUNT(*) FILTER (WHERE state = 'idle in transaction')::int AS idle_in_transaction,
      COUNT(*) FILTER (WHERE wait_event_type = 'Lock')::int AS waiting_lock
    FROM pg_stat_activity
    WHERE datname = current_database()
  `);

  const topQueries = [...queryLog]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 20);

  return {
    sampleOppId: sampleOpp?.id || null,
    sampleOppNumber: sampleOpp?.opportunityNumber || null,
    sampleDealId: sampleDeal?.id || null,
    sampleDealNumber: sampleDeal?.dealNumber || null,
    prismaTimingsMs: {
      opportunityList50: Number(oppListMs.toFixed(1)),
      opportunityGet: Number(oppGetMs.toFixed(1)),
      dealOpenSim_getPlusSiblings: Number(dealOpenSimMs.toFixed(1)),
      contactList50: Number(contactListMs.toFixed(1)),
      lenderList200: Number(lenderListMs.toFixed(1)),
    },
    prismaQueryEventsTop20: topQueries,
    explains,
    pool: pool[0],
  };
}

async function main() {
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    poolConfig: {
      DATABASE_URL: redactUrl(process.env.DATABASE_URL),
      DIRECT_URL: redactUrl(process.env.DIRECT_URL),
    },
    targetsMs: {
      dashboard: 2000,
      opportunityWorkspace: 3000,
      dealWorkspace: 3000,
      lenderProfile: 2000,
      save: 3000,
      moveToDeal: 5000,
      search: 1000,
    },
  };

  console.log("Measuring DB / pool…");
  report.database = await measureDbQueries();

  console.log("Measuring login + APIs…");
  const loginResult = await login();
  report.login = {
    status: loginResult.status,
    loginMs: loginResult.loginMs,
    ok: Boolean(loginResult.token),
    error: loginResult.error || null,
  };

  const apiResults = [];
  if (loginResult.token) {
    const token = loginResult.token;
    const dealId = report.database.sampleDealId;
    const oppId = report.database.sampleOppId;

    const endpoints = [
      { path: "/api/auth/me" },
      { path: "/api/enterprise-opportunities?pageSize=50" },
      { path: "/api/enterprise-deals?pageSize=50" },
      { path: "/api/ecm/contacts?pageSize=50" },
      { path: "/api/ecm/companies?pageSize=50" },
      { path: "/api/lender-registry/lenders?pageSize=100" },
      { path: "/api/enterprise-metrics/dashboard" },
    ];
    if (oppId) {
      endpoints.push({ path: `/api/enterprise-opportunities/${oppId}` });
      endpoints.push({ path: `/api/enterprise-opportunities/${oppId}/deals` });
    }
    if (dealId) {
      endpoints.push({ path: `/api/enterprise-deals/${dealId}` });
      endpoints.push({ path: `/api/enterprise-deals/${dealId}/timeline` });
    }

    // Warm + measure (2 passes; report cold+warm)
    for (const pass of ["cold", "warm"]) {
      for (const ep of endpoints) {
        const r = await timedFetch(ep.path, { token });
        apiResults.push({ pass, ...r });
      }
    }

    // Simulate Deal Workspace open waterfall (sequential like client)
    if (dealId && oppId) {
      const t0 = performance.now();
      const a = await timedFetch(`/api/enterprise-deals/${dealId}`, { token });
      const b = await timedFetch(`/api/enterprise-opportunities/${oppId}/deals`, {
        token,
      });
      const c = await timedFetch(`/api/enterprise-opportunities/${oppId}`, {
        token,
      });
      report.dealOpenWaterfall = {
        totalMs: Number((performance.now() - t0).toFixed(1)),
        steps: [a, b, c],
        note: "Mirrors loadDealPipelineRuntime: getDeal → listByOpp → optional getOpportunity",
      };
    }

    // Simulate Opportunity open waterfall (typical dual GET)
    if (oppId) {
      const t0 = performance.now();
      const a = await timedFetch(`/api/enterprise-opportunities/${oppId}`, {
        token,
      });
      const b = await timedFetch(`/api/enterprise-opportunities/${oppId}`, {
        token,
      });
      const c = await timedFetch(`/api/enterprise-deals?pageSize=100`, { token });
      report.opportunityOpenWaterfall = {
        totalMs: Number((performance.now() - t0).toFixed(1)),
        steps: [a, b, c],
        note: "Mirrors gate+provider dual getOpportunity + loadDeals list",
      };
    }

    // Save simulation: GET for rowVersion + PATCH minimal (dry — skip mutating if no deal)
    if (dealId) {
      const get = await timedFetch(`/api/enterprise-deals/${dealId}`, { token });
      report.saveSimulation = {
        getForRowVersionMs: get.totalMs,
        note: "persistDealProjectionToRegistry often GETs before PATCH; PATCH not executed in this read-only profile",
      };
    }
  }

  report.api = {
    results: apiResults,
    slowestWarm: [...apiResults]
      .filter((r) => r.pass === "warm")
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 20),
    slowestCold: [...apiResults]
      .filter((r) => r.pass === "cold")
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 20),
  };

  const outPath = "docs/co-perf-001/CO-PERF-001-MEASUREMENT-RAW.json";
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
