/**
 * CO-WP-PERF-003 — Authenticated AFTER timings + progressive Home phases.
 * Read-only GETs + login. Optional controlled draft create for cache invalidation
 * only when --cache-mutate is passed (uses BAT partner; single draft).
 *
 * Env: WP_BAT_PASSWORD / SMOKE_PARTNER_PASSWORD
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
const DO_CACHE_MUTATE = process.argv.includes("--cache-mutate");
const DO_REGRESSION = process.argv.includes("--regression");

if (!PASSWORD) {
  console.error("Missing WP_BAT_PASSWORD / SMOKE_PARTNER_PASSWORD");
  process.exit(2);
}

async function timed(label, fn) {
  const t0 = Date.now();
  const result = await fn();
  const ms = Date.now() - t0;
  return { label, ms, ...result };
}

async function partnerFetch(token, method, pathName, body) {
  const res = await fetch(`${BASE}${pathName}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return {
    status: res.status,
    ok: res.ok,
    bytes: text.length,
    json,
    serverTiming: res.headers.get("server-timing"),
    homePhase: res.headers.get("x-partner-home-phase"),
  };
}

const evidence = {
  sprint: "CO-WP-PERF-003",
  baseUrl: BASE,
  startedAt: new Date().toISOString(),
  timings: [],
  cache: null,
  session: null,
};

const login = await timed("login", async () => {
  const res = await fetch(`${BASE}/api/partner/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const json = await res.json();
  return { status: res.status, ok: res.ok && json?.success, json };
});
evidence.timings.push({
  label: login.label,
  ms: login.ms,
  status: login.status,
  ok: login.ok,
});
if (!login.ok) {
  console.error("LOGIN_FAIL", JSON.stringify(login.json).slice(0, 400));
  process.exit(2);
}
const token = login.json.data.accessToken;
evidence.session = {
  partnerCode: login.json.data.session.partnerCode,
  partnerDisplayName: login.json.data.session.partnerDisplayName,
  partnerId: login.json.data.session.partnerId,
};

const paths = [
  "/api/partner/auth/me",
  "/api/partner/home?phase=shell",
  "/api/partner/home?phase=desk",
  "/api/partner/home",
  "/api/partner/business-pipeline",
  "/api/partner/notifications",
];

for (const p of paths) {
  const row = await timed(p, async () => partnerFetch(token, "GET", p));
  evidence.timings.push({
    label: row.label,
    ms: row.ms,
    status: row.status,
    ok: row.ok,
    bytes: row.bytes,
    serverTiming: row.serverTiming,
    homePhase: row.homePhase,
  });
  console.log(
    JSON.stringify({
      path: p,
      ms: row.ms,
      status: row.status,
      bytes: row.bytes,
      serverTiming: row.serverTiming,
      homePhase: row.homePhase,
    }),
  );
}

// Second pipeline call within TTL — expect faster (cache hit)
const pipeline2 = await timed("/api/partner/business-pipeline#2", async () =>
  partnerFetch(token, "GET", "/api/partner/business-pipeline"),
);
evidence.timings.push({
  label: pipeline2.label,
  ms: pipeline2.ms,
  status: pipeline2.status,
  ok: pipeline2.ok,
  bytes: pipeline2.bytes,
  serverTiming: pipeline2.serverTiming,
});
console.log(
  JSON.stringify({
    path: "/api/partner/business-pipeline#2",
    ms: pipeline2.ms,
    note: "expect TTL cache reuse",
  }),
);

if (DO_CACHE_MUTATE) {
  // Prefer existing draft if present; else create one controlled draft for BAT.
  const list = await partnerFetch(token, "GET", "/api/partner/opportunities");
  const rows = Array.isArray(list.json?.data)
    ? list.json.data
    : Array.isArray(list.json?.data?.opportunities)
      ? list.json.data.opportunities
      : [];
  let oppId =
    rows.find((r) => String(r.lifecycleStatus || "").toLowerCase().includes("draft"))
      ?.opportunityId ||
    rows[0]?.opportunityId ||
    null;

  if (!oppId) {
    const created = await partnerFetch(token, "POST", "/api/partner/opportunities", {
      intent: "draft",
      customerDisplayName: "PERF-003 Cache Probe",
      customerMobile: "9000000003",
      productCode: "HOME_LOAN",
      requiredAmountLabel: "1000000",
    });
    oppId = created.json?.data?.opportunityId || null;
    evidence.cache = {
      action: "created_draft",
      status: created.status,
      opportunityId: oppId,
    };
  } else {
    const patched = await partnerFetch(
      token,
      "PATCH",
      `/api/partner/opportunities/${encodeURIComponent(oppId)}`,
      { requiredAmountLabel: "1100000" },
    );
    evidence.cache = {
      action: "patched_existing",
      status: patched.status,
      opportunityId: oppId,
      ok: patched.ok,
    };
  }

  const afterMut = await timed("/api/partner/business-pipeline#after-mutation", async () =>
    partnerFetch(token, "GET", "/api/partner/business-pipeline"),
  );
  evidence.timings.push({
    label: afterMut.label,
    ms: afterMut.ms,
    status: afterMut.status,
    ok: afterMut.ok,
    bytes: afterMut.bytes,
  });

  const homeAfter = await timed("/api/partner/home?phase=desk#after-mutation", async () =>
    partnerFetch(token, "GET", "/api/partner/home?phase=desk"),
  );
  evidence.timings.push({
    label: homeAfter.label,
    ms: homeAfter.ms,
    status: homeAfter.status,
    ok: homeAfter.ok,
  });

  const pipelineDto = afterMut.json?.data;
  const oppVisible = Array.isArray(pipelineDto?.opportunities)
    ? pipelineDto.opportunities.some((o) => o.opportunityId === oppId)
    : false;
  evidence.cache = {
    ...evidence.cache,
    pipelineAfterMs: afterMut.ms,
    homeAfterMs: homeAfter.ms,
    opportunityVisibleInPipeline: oppVisible,
  };
  console.log(JSON.stringify({ cache: evidence.cache }));
}

if (DO_REGRESSION) {
  const regressionPaths = [
    "/api/partner/deals",
    "/api/partner/customers",
    "/api/partner/opportunities",
    "/api/partner/opportunity-journey/config",
  ];
  evidence.regression = [];
  for (const p of regressionPaths) {
    const row = await timed(p, async () => partnerFetch(token, "GET", p));
    evidence.regression.push({
      path: p,
      ms: row.ms,
      status: row.status,
      ok: row.ok,
    });
    console.log(
      JSON.stringify({ regression: p, ms: row.ms, status: row.status, ok: row.ok }),
    );
  }
}

evidence.finishedAt = new Date().toISOString();
const outPath = path.join(root, "docs/co-wp-perf-003/CO-WP-PERF-003-AFTER-TIMINGS.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log("WROTE", outPath);
console.log(
  "LOGIN_OK",
  JSON.stringify(evidence.session),
  "login_ms=",
  login.ms,
);
