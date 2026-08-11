/**
 * CO-WP-DEPLOY-001 — Post-deployment smoke (read-only where possible).
 * Does not mutate business data. Does not create cert fixtures.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const WP = "https://wealth-partner-app.vercel.app";
const GW = "https://catalyst-one-two.vercel.app";
const CERT_PARTNER_IDS = [
  "cmsljyws50005weeka0js9u4t",
  "cmsljyzhu0009weekfeq2rsv9",
];
const CERT_CUSTOMERS = [
  "Cert A Referral Customer",
  "Cert A Override Edit Customer",
  "Cert A ViewOnly Customer",
  "Cert B Solo Customer",
];

async function http(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 200) };
}

const results = {};

// A / B
results.A_wp_root = await http(`${WP}/`);
results.B_wp_login = await http(`${WP}/login`);

// C / D
results.C_gateway_health = await http(`${GW}/api/partner/health`);
const persistence =
  results.C_gateway_health.json?.data?.persistence ||
  results.C_gateway_health.json?.persistence ||
  null;
results.D_prisma_persistence = {
  persistence,
  pass: persistence === "prisma",
};

// H — deactivated cert users cannot authenticate
results.H_cert_a_login = await http(`${GW}/api/partner/auth/login`, {
  method: "POST",
  body: JSON.stringify({
    email: "wp-access-cert-a@rupeecatalyst.com",
    password: "Cert!any-password-should-fail-when-inactive9",
  }),
});
results.H_cert_b_login = await http(`${GW}/api/partner/auth/login`, {
  method: "POST",
  body: JSON.stringify({
    email: "wp-access-cert-b@rupeecatalyst.com",
    password: "Cert!any-password-should-fail-when-inactive9",
  }),
});

// E — Partner authentication path exists (invalid creds → 401, not 500)
results.E_partner_auth_path = await http(`${GW}/api/partner/auth/login`, {
  method: "POST",
  body: JSON.stringify({
    email: "nonexistent-partner-smoke@example.com",
    password: "x",
  }),
});

// Optional genuine partner login if env provides credentials (never invent)
const genuineEmail = process.env.SMOKE_PARTNER_EMAIL || process.env.WP_SMOKE_EMAIL;
const genuinePassword =
  process.env.SMOKE_PARTNER_PASSWORD || process.env.WP_SMOKE_PASSWORD;
let partnerToken = null;
let partnerId = null;
if (genuineEmail && genuinePassword) {
  results.E_genuine_login = await http(`${GW}/api/partner/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: genuineEmail, password: genuinePassword }),
  });
  partnerToken =
    results.E_genuine_login.json?.data?.accessToken ||
    results.E_genuine_login.json?.accessToken ||
    null;
  partnerId =
    results.E_genuine_login.json?.data?.session?.partnerId ||
    results.E_genuine_login.json?.session?.partnerId ||
    null;
} else {
  results.E_genuine_login = {
    skipped: true,
    reason: "SMOKE_PARTNER_EMAIL/PASSWORD not set — auth path checked via 401 invalid creds only",
  };
}

// F / G / J — if token available
if (partnerToken) {
  results.F_authorized_access = await http(`${GW}/api/partner/opportunities`, {
    headers: { Authorization: `Bearer ${partnerToken}` },
  });
  // Cross-partner / forged id should 403
  results.G_unauthorized_403 = await http(
    `${GW}/api/partner/opportunities/forged-cross-partner-id-smoke`,
    { headers: { Authorization: `Bearer ${partnerToken}` } },
  );
  results.J_genuine_opportunities = {
    status: results.F_authorized_access.status,
    count:
      results.F_authorized_access.json?.data?.items?.length ??
      results.F_authorized_access.json?.data?.length ??
      results.F_authorized_access.json?.items?.length ??
      null,
  };
} else {
  results.F_authorized_access = { skipped: true, reason: "No genuine partner token" };
  results.G_unauthorized_403 = { skipped: true, reason: "No genuine partner token" };
  results.J_genuine_opportunities_http = {
    skipped: true,
    reason: "Verified via DB query below",
  };
}

// I — suspended partners state + binding
const prisma = new PrismaClient();
const partners = await prisma.enterpriseWealthPartner.findMany({
  where: { id: { in: CERT_PARTNER_IDS } },
  select: {
    code: true,
    lifecycleStatus: true,
    operationalStatus: true,
    enabled: true,
    isDeleted: true,
  },
});
const certUsers = await prisma.user.findMany({
  where: { email: { contains: "wp-access-cert" } },
  select: { email: true, isActive: true },
});
const activeOpps = await prisma.enterpriseOpportunity.count({
  where: { isDeleted: false },
});
const activeCertFingerprint = await prisma.enterpriseOpportunity.count({
  where: {
    isDeleted: false,
    primaryContactName: { in: CERT_CUSTOMERS },
  },
});
const activeOwnedByCertPartners = await prisma.enterpriseOpportunity.count({
  where: {
    isDeleted: false,
    sourceWealthPartnerId: { in: CERT_PARTNER_IDS },
  },
});
const audits = await prisma.partnerEntitlementAudit.count();

results.I_suspended_cert_partners = {
  partners,
  allSuspended: partners.every(
    (p) =>
      p.lifecycleStatus === "suspended" &&
      p.operationalStatus === "inactive" &&
      !p.enabled &&
      !p.isDeleted,
  ),
};
results.H_db_cert_users_inactive = {
  users: certUsers,
  allInactive: certUsers.every((u) => !u.isActive),
};
results.J_genuine_opportunities_db = {
  activeOpportunities: activeOpps,
  expected: 16,
  pass: activeOpps === 16,
};
results.K_no_active_cert_opps = {
  activeCertFingerprint,
  activeOwnedByCertPartners,
  pass: activeCertFingerprint === 0 && activeOwnedByCertPartners === 0,
};
results.auditPreserved = { count: audits };

await prisma.$disconnect();

const summary = {
  A: results.A_wp_root.status === 200,
  B: results.B_wp_login.status === 200,
  C: results.C_gateway_health.status === 200,
  D: results.D_prisma_persistence.pass,
  E:
    results.E_partner_auth_path.status === 401 ||
    results.E_genuine_login?.status === 200,
  F: results.F_authorized_access.skipped
    ? "SKIPPED"
    : results.F_authorized_access.status === 200,
  G: results.G_unauthorized_403.skipped
    ? "SKIPPED"
    : [403, 404].includes(results.G_unauthorized_403.status),
  H:
    [401].includes(results.H_cert_a_login.status) &&
    [401].includes(results.H_cert_b_login.status) &&
    results.H_db_cert_users_inactive.allInactive,
  I: results.I_suspended_cert_partners.allSuspended,
  J: results.J_genuine_opportunities_db.pass,
  K: results.K_no_active_cert_opps.pass,
};

const out = { generatedAt: new Date().toISOString(), summary, results };
const outDir = path.join(root, "docs/co-wp-deploy-001");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "CO-WP-DEPLOY-001-SMOKE.json"),
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify({ summary, activeOpps, activeCertFingerprint, audits }, null, 2));
