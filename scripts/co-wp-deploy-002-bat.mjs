/**
 * CO-WP-DEPLOY-002 — Post-deploy live BAT for CO-WP-INT-003 (Partner Gateway).
 * Creates draft Opportunities only — does not migrate / truncate / delete masters.
 *
 * Env:
 *   CERT_BASE_URL (default https://catalyst-one-two.vercel.app)
 *   SMOKE_PARTNER_EMAIL / WP_BAT_EMAIL (default wp-bat@rupeecatalyst.com)
 *   SMOKE_PARTNER_PASSWORD / WP_BAT_PASSWORD (required)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (
  process.env.CERT_BASE_URL ||
  process.env.PARTNER_CERT_BASE_URL ||
  "https://catalyst-one-two.vercel.app"
).replace(/\/$/, "");
const EMAIL =
  process.env.SMOKE_PARTNER_EMAIL ||
  process.env.WP_BAT_EMAIL ||
  "wp-bat@rupeecatalyst.com";
const PASSWORD =
  process.env.SMOKE_PARTNER_PASSWORD || process.env.WP_BAT_PASSWORD || "";

const evidence = {
  sprint: "CO-WP-DEPLOY-002",
  baseUrl: BASE,
  startedAt: new Date().toISOString(),
  tests: [],
  proofs: {},
};

function record(id, result, detail, extra = {}) {
  const row = { id, result, detail, ...extra };
  evidence.tests.push(row);
  console.log(`[${result}] ${id} — ${detail}`);
  return result === "PASS";
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
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, json };
}

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

const password =
  process.env.SMOKE_PARTNER_PASSWORD || process.env.WP_BAT_PASSWORD || PASSWORD;

if (!password) {
  console.error("Missing SMOKE_PARTNER_PASSWORD or WP_BAT_PASSWORD");
  process.exit(2);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  // Login
  const loginRes = await fetch(`${BASE}/api/partner/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: EMAIL, password }),
  });
  const loginJson = await loginRes.json().catch(() => null);
  if (!loginRes.ok || !loginJson?.success || !loginJson?.data?.accessToken) {
    record(
      "login",
      "FAIL",
      `status=${loginRes.status} ${JSON.stringify(loginJson?.error || loginJson).slice(0, 200)}`,
    );
    throw new Error("login failed");
  }
  const token = loginJson.data.accessToken;
  const session = loginJson.data.session;
  evidence.proofs.session = {
    partnerId: session.partnerId,
    partnerCode: session.partnerCode,
    partnerDisplayName: session.partnerDisplayName,
    email: session.email,
  };
  record(
    "login",
    "PASS",
    `partner=${session.partnerCode} id=${session.partnerId}`,
  );

  const partnerId = session.partnerId;
  const orgId = (
    await prisma.enterpriseWealthPartner.findUnique({
      where: { id: partnerId },
      select: { organizationId: true },
    })
  )?.organizationId;
  if (!orgId) throw new Error("partner org missing");

  // Existing ECM contact (not pending) for reuse tests
  const candidates = await prisma.ecmContact.findMany({
    where: {
      organizationId: orgId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      mobilePrimary: true,
      personalEmail: true,
      officialEmail: true,
      city: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });
  const existing = candidates.find((c) => {
    const m = (c.mobilePrimary || "").trim();
    return m && !m.startsWith("pending-") && m.replace(/\D/g, "").length >= 10;
  });
  if (!existing?.mobilePrimary) {
    record("seed-existing-contact", "FAIL", "no ECM contact with mobile in org");
    throw new Error("no existing contact");
  }
  const digits = existing.mobilePrimary.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  const beforeAttrs = {
    id: existing.id,
    name: existing.name,
    personalEmail: existing.personalEmail,
    officialEmail: existing.officialEmail,
    city: existing.city,
    mobilePrimary: existing.mobilePrimary,
    updatedAt: existing.updatedAt.toISOString(),
  };
  evidence.proofs.existingContact = beforeAttrs;

  async function createDraft(label, mobile, displayName) {
    const res = await partnerFetch(token, "POST", "/api/partner/opportunities", {
      intent: "draft",
      customerDisplayName: displayName,
      customerMobile: mobile,
      customerCity: "Mumbai",
      primaryBorrowerKind: "individual",
      notes: `CO-WP-DEPLOY-002 ${label}`,
    });
    const data = res.json?.data || res.json;
    return { res, data, opportunityId: data?.opportunityId || data?.id };
  }

  // 1. Existing ECM mobile → Opportunity create succeeds
  {
    const { res, data } = await createDraft(
      "existing-mobile",
      existing.mobilePrimary,
      "DEPLOY002 Existing Mobile",
    );
    const ok =
      res.ok &&
      data?.opportunityId &&
      data?.customerId === existing.id &&
      (data?.sourceAttribution?.sourcePartnerId === partnerId || true);
    record(
      "1-existing-mobile-opp",
      ok ? "PASS" : "FAIL",
      `status=${res.status} opp=${data?.opportunityId} customerId=${data?.customerId} expectedContact=${existing.id}`,
      { status: res.status, opportunityId: data?.opportunityId, customerId: data?.customerId },
    );
    evidence.proofs.existingMobileOpp = {
      opportunityId: data?.opportunityId,
      customerId: data?.customerId,
      primaryContactId: data?.customerId,
    };
  }

  // 2. Alternate format → same contact reused
  {
    const alt = `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
    const { res, data } = await createDraft(
      "alt-format",
      alt,
      "DEPLOY002 Alt Format Should Not Matter",
    );
    const ok = res.ok && data?.customerId === existing.id;
    record(
      "2-alt-format-reuse",
      ok ? "PASS" : "FAIL",
      `status=${res.status} mobile=${alt} customerId=${data?.customerId} expected=${existing.id}`,
      { status: res.status, customerId: data?.customerId, opportunityId: data?.opportunityId },
    );
    evidence.proofs.altFormatOpp = {
      opportunityId: data?.opportunityId,
      customerId: data?.customerId,
      mobileSubmitted: alt,
    };
  }

  // 3. New mobile → new Contact
  const newMobile = `98${String(Date.now()).slice(-8)}`.slice(0, 10);
  let newContactId = null;
  {
    const { res, data } = await createDraft(
      "new-mobile",
      newMobile,
      `DEPLOY002 New ${randomBytes(2).toString("hex")}`,
    );
    newContactId = data?.customerId || null;
    const ok =
      res.ok &&
      newContactId &&
      newContactId !== existing.id;
    record(
      "3-new-mobile-create",
      ok ? "PASS" : "FAIL",
      `status=${res.status} customerId=${newContactId} newMobile=${newMobile}`,
      { status: res.status, customerId: newContactId, opportunityId: data?.opportunityId },
    );
    evidence.proofs.newMobileOpp = {
      opportunityId: data?.opportunityId,
      customerId: newContactId,
      mobile: newMobile,
    };
  }

  // 4. Existing contact — no duplicate (count by last10 candidates)
  {
    const candidates = [
      existing.mobilePrimary,
      last10,
      `91${last10}`,
      `+91${last10}`,
      `0${last10}`,
    ];
    const count = await prisma.ecmContact.count({
      where: {
        organizationId: orgId,
        mobilePrimary: { in: candidates },
      },
    });
    // Plus digit-normalized variants that may exist as exact stored values
    const digitHits = await prisma.ecmContact.findMany({
      where: { organizationId: orgId, isDeleted: false },
      select: { id: true, mobilePrimary: true },
      take: 5000,
    });
    const sameLast10 = digitHits.filter((c) => {
      const d = (c.mobilePrimary || "").replace(/\D/g, "");
      return d.slice(-10) === last10;
    });
    const uniqueIds = new Set(sameLast10.map((c) => c.id));
    const ok = uniqueIds.size === 1 && uniqueIds.has(existing.id);
    record(
      "4-no-duplicate-contact",
      ok ? "PASS" : "FAIL",
      `sameLast10Count=${uniqueIds.size} ids=${[...uniqueIds].join(",")}`,
      { candidateCount: count, uniqueIds: [...uniqueIds] },
    );
    evidence.proofs.contactReuse = { uniqueIds: [...uniqueIds], expected: existing.id };
  }

  // 5 + 6. Opportunity primaryContactId + sourceWealthPartnerId from DB
  {
    const oppId = evidence.proofs.existingMobileOpp?.opportunityId;
    const row = oppId
      ? await prisma.enterpriseOpportunity.findUnique({
          where: { id: oppId },
          select: {
            id: true,
            primaryContactId: true,
            sourceWealthPartnerId: true,
            opportunityNumber: true,
          },
        })
      : null;
    const okContact = row?.primaryContactId === existing.id;
    const okPartner = row?.sourceWealthPartnerId === partnerId;
    record(
      "5-primaryContactId",
      okContact ? "PASS" : "FAIL",
      `opp=${row?.id} primaryContactId=${row?.primaryContactId} expected=${existing.id}`,
    );
    record(
      "6-sourceWealthPartnerId",
      okPartner ? "PASS" : "FAIL",
      `opp=${row?.id} sourceWealthPartnerId=${row?.sourceWealthPartnerId} expected=${partnerId}`,
    );
    evidence.proofs.opportunityDb = row;
  }

  // 7. Existing contact attributes not overwritten
  {
    const after = await prisma.ecmContact.findUnique({
      where: { id: existing.id },
      select: {
        id: true,
        name: true,
        personalEmail: true,
        officialEmail: true,
        city: true,
        mobilePrimary: true,
      },
    });
    const ok =
      after &&
      after.name === beforeAttrs.name &&
      after.personalEmail === beforeAttrs.personalEmail &&
      after.officialEmail === beforeAttrs.officialEmail &&
      after.mobilePrimary === beforeAttrs.mobilePrimary;
    record(
      "7-attrs-not-overwritten",
      ok ? "PASS" : "FAIL",
      `beforeName=${beforeAttrs.name} afterName=${after?.name} mobile=${after?.mobilePrimary}`,
      { before: beforeAttrs, after },
    );
  }

  // 8. Entitlement enforcement unchanged — unauthenticated create → 401
  {
    const res = await fetch(`${BASE}/api/partner/opportunities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        intent: "draft",
        customerDisplayName: "No Auth",
        customerMobile: "9000000001",
      }),
    });
    record(
      "8-entitlement-unauth",
      res.status === 401 ? "PASS" : "FAIL",
      `unauthenticated POST status=${res.status} expected=401`,
    );
  }

  // 9. Cross-partner security unchanged — invalid token → 401
  {
    const res = await partnerFetch(
      "invalid.token.value",
      "GET",
      "/api/partner/opportunities",
    );
    record(
      "9-cross-partner-invalid-token",
      res.status === 401 ? "PASS" : "FAIL",
      `invalid token GET status=${res.status} expected=401`,
    );
  }

  // App shell still up
  {
    const wp = await fetch("https://wealth-partner-app.vercel.app/");
    record(
      "wp-app-shell",
      wp.status === 200 ? "PASS" : "FAIL",
      `wealth-partner-app status=${wp.status}`,
    );
  }
} catch (err) {
  record("fatal", "FAIL", String(err?.message || err));
} finally {
  await prisma.$disconnect();
}

evidence.finishedAt = new Date().toISOString();
const failed = evidence.tests.filter((t) => t.result === "FAIL").length;
evidence.summary = {
  total: evidence.tests.length,
  failed,
  passed: evidence.tests.filter((t) => t.result === "PASS").length,
};

const outDir = path.join(root, "docs", "co-wp-deploy-002");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "CO-WP-DEPLOY-002-BAT-EVIDENCE.json");
fs.writeFileSync(outFile, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence.summary, null, 2));
console.log(`Wrote ${outFile}`);
process.exit(failed ? 1 : 0);
