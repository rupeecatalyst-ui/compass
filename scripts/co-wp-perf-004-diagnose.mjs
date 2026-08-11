/**
 * CO-WP-PERF-004 — Auth + Notifications diagnostic timings (read-only).
 * No mutations. No schema changes. Evidence for diagnostic report only.
 *
 * Env: WP_BAT_PASSWORD / SMOKE_PARTNER_PASSWORD
 * Optional: CERT_BASE_URL (default production Gateway)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env", ".env.local"]) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const BASE = (
  process.env.CERT_BASE_URL || "https://catalyst-one-two.vercel.app"
).replace(/\/$/, "");
const EMAIL =
  process.env.SMOKE_PARTNER_EMAIL ||
  process.env.WP_BAT_EMAIL ||
  "wp-bat@rupeecatalyst.com";
const PASSWORD =
  process.env.SMOKE_PARTNER_PASSWORD || process.env.WP_BAT_PASSWORD || "";

if (!PASSWORD) {
  console.error("Missing WP_BAT_PASSWORD / SMOKE_PARTNER_PASSWORD");
  process.exit(2);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function timed(label, fn) {
  const t0 = Date.now();
  const result = await fn();
  return { label, ms: Date.now() - t0, ...result };
}

function summarizeHeaders(res) {
  return {
    serverTiming: res.headers.get("server-timing"),
    xVercelId: res.headers.get("x-vercel-id"),
    xVercelCache: res.headers.get("x-vercel-cache"),
    cfCache: res.headers.get("cf-cache-status"),
    age: res.headers.get("age"),
  };
}

async function loginOnce(label) {
  return timed(label, async () => {
    const res = await fetch(`${BASE}/api/partner/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 400) };
    }
    return {
      status: res.status,
      ok: res.ok && json?.success,
      bytes: text.length,
      headers: summarizeHeaders(res),
      session: json?.data?.session
        ? {
            partnerId: json.data.session.partnerId,
            partnerCode: json.data.session.partnerCode,
            hasEntitlements: Boolean(json.data.session.entitlements),
            entitlementKeys: json.data.session.entitlements
              ? Object.keys(json.data.session.entitlements)
              : [],
          }
        : null,
      accessToken: json?.data?.accessToken || null,
      error: json?.error || json?.message || null,
    };
  });
}

async function partnerGet(token, pathName, label) {
  return timed(label || pathName, async () => {
    const res = await fetch(`${BASE}${pathName}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 400) };
    }
    return {
      status: res.status,
      ok: res.ok && (json?.success !== false || res.ok),
      bytes: text.length,
      headers: summarizeHeaders(res),
      json,
    };
  });
}

const evidence = {
  sprint: "CO-WP-PERF-004",
  purpose: "diagnostic-only auth + notifications waterfall",
  baseUrl: BASE,
  email: EMAIL,
  startedAt: new Date().toISOString(),
  waterfall: {},
  timings: [],
  notes: [],
};

console.log(`PERF-004 diagnose → ${BASE} as ${EMAIL}`);

// --- A. Auth login cold / warm ---
const loginCold = await loginOnce("login#cold");
evidence.timings.push({
  label: loginCold.label,
  ms: loginCold.ms,
  status: loginCold.status,
  ok: loginCold.ok,
  bytes: loginCold.bytes,
  headers: loginCold.headers,
  session: loginCold.session,
});
console.log(JSON.stringify({ label: loginCold.label, ms: loginCold.ms, ok: loginCold.ok }));

if (!loginCold.ok || !loginCold.accessToken) {
  console.error("LOGIN_FAIL", loginCold.error || loginCold);
  process.exit(2);
}

const token = loginCold.accessToken;
evidence.session = loginCold.session;

const loginWarm = await loginOnce("login#warm-immediate");
evidence.timings.push({
  label: loginWarm.label,
  ms: loginWarm.ms,
  status: loginWarm.status,
  ok: loginWarm.ok,
  bytes: loginWarm.bytes,
  headers: loginWarm.headers,
  session: loginWarm.session,
});
console.log(JSON.stringify({ label: loginWarm.label, ms: loginWarm.ms, ok: loginWarm.ok }));

// --- B. /me cold after login, then warm ---
const me1 = await partnerGet(token, "/api/partner/auth/me", "/me#1-after-login");
evidence.timings.push({
  label: me1.label,
  ms: me1.ms,
  status: me1.status,
  ok: me1.ok,
  bytes: me1.bytes,
  headers: me1.headers,
  hasEntitlements: Boolean(me1.json?.data?.entitlements),
  modules: me1.json?.data?.entitlements?.modules || null,
});
console.log(
  JSON.stringify({
    label: me1.label,
    ms: me1.ms,
    ok: me1.ok,
    hasEntitlements: Boolean(me1.json?.data?.entitlements),
  }),
);

const me2 = await partnerGet(token, "/api/partner/auth/me", "/me#2-warm");
evidence.timings.push({
  label: me2.label,
  ms: me2.ms,
  status: me2.status,
  ok: me2.ok,
  bytes: me2.bytes,
  headers: me2.headers,
  hasEntitlements: Boolean(me2.json?.data?.entitlements),
});
console.log(JSON.stringify({ label: me2.label, ms: me2.ms, ok: me2.ok }));

// Health (no auth DB) — network + edge baseline
const health = await timed("auth/health", async () => {
  const res = await fetch(`${BASE}/api/partner/auth/health`, {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  return {
    status: res.status,
    ok: res.ok,
    bytes: text.length,
    headers: summarizeHeaders(res),
  };
});
evidence.timings.push(health);
console.log(JSON.stringify({ label: health.label, ms: health.ms, status: health.status }));

// --- C. Home phases (dependency check) ---
const homeShell = await partnerGet(
  token,
  "/api/partner/home?phase=shell",
  "home#shell",
);
evidence.timings.push({
  label: homeShell.label,
  ms: homeShell.ms,
  status: homeShell.status,
  ok: homeShell.ok,
  bytes: homeShell.bytes,
  headers: homeShell.headers,
  hasNotifications: Array.isArray(homeShell.json?.data?.notifications),
  notificationCount: homeShell.json?.data?.notifications?.length ?? null,
  phase: homeShell.json?.data?.phase || homeShell.headers?.homePhase || null,
});
console.log(
  JSON.stringify({
    label: homeShell.label,
    ms: homeShell.ms,
    notifCount: homeShell.json?.data?.notifications?.length ?? null,
  }),
);

const homeDesk = await partnerGet(token, "/api/partner/home?phase=desk", "home#desk");
evidence.timings.push({
  label: homeDesk.label,
  ms: homeDesk.ms,
  status: homeDesk.status,
  ok: homeDesk.ok,
  bytes: homeDesk.bytes,
  headers: homeDesk.headers,
  hasNotifications: Array.isArray(homeDesk.json?.data?.notifications),
  notificationCount: homeDesk.json?.data?.notifications?.length ?? null,
});
console.log(
  JSON.stringify({
    label: homeDesk.label,
    ms: homeDesk.ms,
    notifCount: homeDesk.json?.data?.notifications?.length ?? null,
  }),
);

// --- D. Pipeline alone ---
const pipeline1 = await partnerGet(
  token,
  "/api/partner/business-pipeline",
  "pipeline#1",
);
const oppIds = (
  pipeline1.json?.data?.opportunities ||
  pipeline1.json?.data?.items ||
  []
)
  .map((o) => o.opportunityId || o.id)
  .filter(Boolean);
evidence.timings.push({
  label: pipeline1.label,
  ms: pipeline1.ms,
  status: pipeline1.status,
  ok: pipeline1.ok,
  bytes: pipeline1.bytes,
  headers: pipeline1.headers,
  opportunityCount: oppIds.length,
  opportunityIds: oppIds.slice(0, 20),
});
console.log(
  JSON.stringify({
    label: pipeline1.label,
    ms: pipeline1.ms,
    oppCount: oppIds.length,
  }),
);

const pipeline2 = await partnerGet(
  token,
  "/api/partner/business-pipeline",
  "pipeline#2-ttl-probe",
);
evidence.timings.push({
  label: pipeline2.label,
  ms: pipeline2.ms,
  status: pipeline2.status,
  ok: pipeline2.ok,
  bytes: pipeline2.bytes,
  headers: pipeline2.headers,
  opportunityCount: (
    pipeline2.json?.data?.opportunities ||
    pipeline2.json?.data?.items ||
    []
  ).length,
});
console.log(JSON.stringify({ label: pipeline2.label, ms: pipeline2.ms }));

// --- E. Per-opportunity GETs (notifications fan-out proxy) ---
const oppSamples = oppIds.slice(0, Math.min(5, oppIds.length));
const oppTimings = [];
for (const id of oppSamples) {
  const row = await partnerGet(
    token,
    `/api/partner/opportunities/${id}`,
    `opportunity#${id}`,
  );
  const entry = {
    label: row.label,
    opportunityId: id,
    ms: row.ms,
    status: row.status,
    ok: row.ok,
    bytes: row.bytes,
    headers: row.headers,
  };
  oppTimings.push(entry);
  evidence.timings.push(entry);
  console.log(JSON.stringify({ label: "opportunity", id, ms: row.ms, status: row.status }));
}

// Parallel fan-out of same sample set (simulate notifications Promise.all)
const parallelFan = await timed("opportunities#parallel-fanout", async () => {
  const t0 = Date.now();
  const results = await Promise.all(
    oppSamples.map(async (id) => {
      const started = Date.now();
      const res = await fetch(`${BASE}/api/partner/opportunities/${id}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const text = await res.text();
      return {
        opportunityId: id,
        ms: Date.now() - started,
        status: res.status,
        bytes: text.length,
      };
    }),
  );
  return { wallMs: Date.now() - t0, results };
});
evidence.timings.push({
  label: parallelFan.label,
  ms: parallelFan.ms,
  wallMs: parallelFan.wallMs,
  results: parallelFan.results,
});
console.log(
  JSON.stringify({
    label: parallelFan.label,
    wallMs: parallelFan.wallMs,
    each: parallelFan.results?.map((r) => ({ id: r.opportunityId, ms: r.ms })),
  }),
);

// --- F. Customers search (empty q = notifications path) ---
const customers = await partnerGet(
  token,
  "/api/partner/customers/search?q=",
  "customers/search#empty",
);
evidence.timings.push({
  label: customers.label,
  ms: customers.ms,
  status: customers.status,
  ok: customers.ok,
  bytes: customers.bytes,
  headers: customers.headers,
  customerCount: Array.isArray(customers.json?.data)
    ? customers.json.data.length
    : Array.isArray(customers.json?.data?.customers)
      ? customers.json.data.customers.length
      : null,
});
console.log(
  JSON.stringify({
    label: customers.label,
    ms: customers.ms,
    count:
      evidence.timings[evidence.timings.length - 1].customerCount,
  }),
);

// --- G. Notifications (primary ~46s target) ---
const notif1 = await partnerGet(
  token,
  "/api/partner/notifications",
  "notifications#1",
);
const notifItems = notif1.json?.data?.items || notif1.json?.data?.notifications || [];
evidence.timings.push({
  label: notif1.label,
  ms: notif1.ms,
  status: notif1.status,
  ok: notif1.ok,
  bytes: notif1.bytes,
  headers: notif1.headers,
  itemCount: Array.isArray(notifItems) ? notifItems.length : null,
  unreadCount: notif1.json?.data?.unreadCount ?? null,
  categories: Array.isArray(notifItems)
    ? [...new Set(notifItems.map((i) => i.category).filter(Boolean))]
    : [],
});
console.log(
  JSON.stringify({
    label: notif1.label,
    ms: notif1.ms,
    items: Array.isArray(notifItems) ? notifItems.length : null,
    bytes: notif1.bytes,
  }),
);

await sleep(1500);
const notif2 = await partnerGet(
  token,
  "/api/partner/notifications",
  "notifications#2-warm-probe",
);
evidence.timings.push({
  label: notif2.label,
  ms: notif2.ms,
  status: notif2.status,
  ok: notif2.ok,
  bytes: notif2.bytes,
  headers: notif2.headers,
  itemCount: Array.isArray(notif2.json?.data?.items)
    ? notif2.json.data.items.length
    : null,
});
console.log(JSON.stringify({ label: notif2.label, ms: notif2.ms }));

// --- H. /me after long gap (cold isolate probe) ---
await sleep(2000);
const me3 = await partnerGet(token, "/api/partner/auth/me", "/me#3-after-gap");
evidence.timings.push({
  label: me3.label,
  ms: me3.ms,
  status: me3.status,
  ok: me3.ok,
  bytes: me3.bytes,
  headers: me3.headers,
});
console.log(JSON.stringify({ label: me3.label, ms: me3.ms }));

// Waterfall synthesis (measured proxies)
const sumSequentialOpps = oppTimings.reduce((a, b) => a + (b.ms || 0), 0);
evidence.waterfall = {
  login: {
    coldMs: loginCold.ms,
    warmMs: loginWarm.ms,
    deltaColdMinusWarmMs: loginCold.ms - loginWarm.ms,
    sessionHasEntitlementsOnLogin: Boolean(loginCold.session?.hasEntitlements),
  },
  me: {
    afterLoginMs: me1.ms,
    warmMs: me2.ms,
    afterGapMs: me3.ms,
    hasEntitlements: Boolean(me1.json?.data?.entitlements),
  },
  home: {
    shellMs: homeShell.ms,
    deskMs: homeDesk.ms,
    shellNotificationCount:
      homeShell.json?.data?.notifications?.length ?? null,
    deskNotificationCount: homeDesk.json?.data?.notifications?.length ?? null,
    note: "Home uses /home phases; does not call GET /notifications",
  },
  notifications: {
    coldMs: notif1.ms,
    warmProbeMs: notif2.ms,
    itemCount: Array.isArray(notifItems) ? notifItems.length : null,
    bytes: notif1.bytes,
  },
  decomposition: {
    pipeline1Ms: pipeline1.ms,
    pipeline2Ms: pipeline2.ms,
    pipelineTtlLikelyHit: pipeline2.ms < pipeline1.ms * 0.5,
    customersSearchEmptyMs: customers.ms,
    opportunitySampleCount: oppSamples.length,
    opportunitySequentialSumMs: sumSequentialOpps,
    opportunityParallelWallMs: parallelFan.wallMs,
    opportunityAvgSequentialMs:
      oppSamples.length > 0
        ? Math.round(sumSequentialOpps / oppSamples.length)
        : null,
    projectedFanout40xAvgMs:
      oppSamples.length > 0
        ? Math.round((sumSequentialOpps / oppSamples.length) * Math.min(40, oppIds.length || oppSamples.length))
        : null,
    arithmeticProxy:
      (pipeline1.ms || 0) +
      (customers.ms || 0) +
      (parallelFan.wallMs || sumSequentialOpps),
    measuredNotificationsMs: notif1.ms,
    residualMs:
      notif1.ms -
      ((pipeline1.ms || 0) +
        (customers.ms || 0) +
        (parallelFan.wallMs || sumSequentialOpps)),
  },
  networkBaseline: {
    healthMs: health.ms,
  },
};

evidence.finishedAt = new Date().toISOString();
evidence.notes.push(
  "Process-local pipeline TTL may miss across serverless isolates; pipeline#2 probes same-isolate TTL only.",
);
evidence.notes.push(
  "Opportunity GETs are public API proxies for getOpportunity cost inside notifications getCenter.",
);
evidence.notes.push(
  "customers/search?q= mirrors searchCustomers(\"\") used by getCenter; notifications also reloads ECM×40 after search.",
);

const outDir = path.join(root, "docs", "co-wp-perf-004");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "CO-WP-PERF-004-TIMINGS.json");
fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log("\nWATERFALL_SUMMARY");
console.log(JSON.stringify(evidence.waterfall, null, 2));
console.log(`\nWrote ${outPath}`);
