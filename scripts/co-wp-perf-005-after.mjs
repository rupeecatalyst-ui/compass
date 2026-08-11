/**
 * CO-WP-PERF-005 — BEFORE/AFTER timings + regression GETs (read-only).
 * Env: WP_BAT_PASSWORD · optional CERT_BASE_URL (default localhost:3000 for AFTER)
 *
 * BEFORE baseline is recorded from PERF-004 production numbers when --baseline-only
 * is not used; AFTER measures against CERT_BASE_URL.
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
  process.env.CERT_BASE_URL || "http://127.0.0.1:3000"
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

const BEFORE = {
  source: "CO-WP-PERF-004 production (catalyst-one-two.vercel.app)",
  loginColdMs: 8231,
  loginWarmMs: 6373,
  meColdMs: 8174,
  meWarmMs: 7931,
  notificationsColdMs: 45103,
  notificationsWarmMs: 45652,
  homeShellMs: 4116,
  homeDeskMs: 12391,
  pipelineMs: 7935,
};

async function timed(label, fn) {
  const t0 = Date.now();
  const result = await fn();
  return { label, ms: Date.now() - t0, ...result };
}

async function login(label) {
  return timed(label, async () => {
    const res = await fetch(`${BASE}/api/partner/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const json = await res.json();
    return {
      status: res.status,
      ok: res.ok && json?.success,
      serverTiming: res.headers.get("server-timing"),
      hasEntitlements: Boolean(json?.data?.session?.entitlements),
      accessToken: json?.data?.accessToken || null,
      session: json?.data?.session
        ? {
            partnerCode: json.data.session.partnerCode,
            partnerId: json.data.session.partnerId,
            executionMode: json.data.session.entitlements?.executionMode ?? null,
          }
        : null,
      error: json?.error || null,
    };
  });
}

async function get(token, pathName, label) {
  return timed(label || pathName, async () => {
    const res = await fetch(`${BASE}${pathName}`, {
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
      json = { raw: text.slice(0, 200) };
    }
    return {
      status: res.status,
      ok: res.ok && json?.success !== false,
      bytes: text.length,
      serverTiming: res.headers.get("server-timing"),
      json,
    };
  });
}

console.log(`PERF-005 AFTER measure → ${BASE}`);

const evidence = {
  sprint: "CO-WP-PERF-005",
  baseUrl: BASE,
  startedAt: new Date().toISOString(),
  before: BEFORE,
  after: {},
  regression: {},
  timings: [],
};

const loginCold = await login("login#cold");
evidence.timings.push(loginCold);
console.log(JSON.stringify({ label: loginCold.label, ms: loginCold.ms, ok: loginCold.ok, hasEntitlements: loginCold.hasEntitlements }));
if (!loginCold.ok || !loginCold.accessToken) {
  console.error("LOGIN_FAIL", loginCold.error || loginCold);
  process.exit(2);
}
const token = loginCold.accessToken;

const loginWarm = await login("login#warm");
evidence.timings.push(loginWarm);
console.log(JSON.stringify({ label: loginWarm.label, ms: loginWarm.ms, ok: loginWarm.ok }));

const me1 = await get(token, "/api/partner/auth/me", "/me#1");
evidence.timings.push({
  label: me1.label,
  ms: me1.ms,
  status: me1.status,
  ok: me1.ok,
  serverTiming: me1.serverTiming,
  hasEntitlements: Boolean(me1.json?.data?.entitlements),
});
console.log(JSON.stringify({ label: me1.label, ms: me1.ms, ok: me1.ok }));

const me2 = await get(token, "/api/partner/auth/me", "/me#2");
evidence.timings.push({
  label: me2.label,
  ms: me2.ms,
  status: me2.status,
  ok: me2.ok,
  serverTiming: me2.serverTiming,
});
console.log(JSON.stringify({ label: me2.label, ms: me2.ms }));

const shell = await get(token, "/api/partner/home?phase=shell", "home#shell");
const desk = await get(token, "/api/partner/home?phase=desk", "home#desk");
const pipe = await get(token, "/api/partner/business-pipeline", "pipeline");
const notif1 = await get(token, "/api/partner/notifications", "notifications#1");
const notif2 = await get(token, "/api/partner/notifications", "notifications#2");

for (const row of [shell, desk, pipe, notif1, notif2]) {
  evidence.timings.push({
    label: row.label,
    ms: row.ms,
    status: row.status,
    ok: row.ok,
    bytes: row.bytes,
    serverTiming: row.serverTiming,
    itemCount:
      row.label.startsWith("notifications")
        ? row.json?.data?.items?.length ?? null
        : null,
  });
  console.log(
    JSON.stringify({
      label: row.label,
      ms: row.ms,
      ok: row.ok,
      serverTiming: row.serverTiming,
      items: row.json?.data?.items?.length,
    }),
  );
}

// Regression GETs (read-only)
const regressionPaths = [
  "/api/partner/home?phase=shell",
  "/api/partner/business-pipeline",
  "/api/partner/opportunities",
  "/api/partner/deals",
  "/api/partner/customers/search?q=",
  "/api/partner/documents",
  "/api/partner/auth/me",
];

for (const p of regressionPaths) {
  const row = await get(token, p, `regression:${p}`);
  evidence.regression[p] = {
    ms: row.ms,
    status: row.status,
    ok: row.ok,
  };
  console.log(JSON.stringify({ regression: p, ms: row.ms, status: row.status }));
}

evidence.after = {
  loginColdMs: loginCold.ms,
  loginWarmMs: loginWarm.ms,
  loginHasEntitlements: loginCold.hasEntitlements,
  meColdMs: me1.ms,
  meWarmMs: me2.ms,
  notificationsColdMs: notif1.ms,
  notificationsWarmMs: notif2.ms,
  notificationItemCount: notif1.json?.data?.items?.length ?? null,
  homeShellMs: shell.ms,
  homeDeskMs: desk.ms,
  pipelineMs: pipe.ms,
};

evidence.delta = {
  loginColdMs: BEFORE.loginColdMs - evidence.after.loginColdMs,
  loginWarmMs: BEFORE.loginWarmMs - evidence.after.loginWarmMs,
  meColdMs: BEFORE.meColdMs - evidence.after.meColdMs,
  meWarmMs: BEFORE.meWarmMs - evidence.after.meWarmMs,
  notificationsColdMs:
    BEFORE.notificationsColdMs - evidence.after.notificationsColdMs,
  notificationsWarmMs:
    BEFORE.notificationsWarmMs - evidence.after.notificationsWarmMs,
  homeShellMs: BEFORE.homeShellMs - evidence.after.homeShellMs,
  homeDeskMs: BEFORE.homeDeskMs - evidence.after.homeDeskMs,
  pipelineMs: BEFORE.pipelineMs - evidence.after.pipelineMs,
};

evidence.finishedAt = new Date().toISOString();
evidence.note =
  "AFTER measured against CERT_BASE_URL (local Gateway with PERF-005 code). BEFORE = PERF-004 production. No Vercel deploy in this sprint.";

const outDir = path.join(root, "docs", "co-wp-perf-005");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "CO-WP-PERF-005-AFTER-TIMINGS.json");
fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log("\nDELTA_MS (before - after; positive = improved)");
console.log(JSON.stringify(evidence.delta, null, 2));
console.log(`Wrote ${outPath}`);
