/**
 * CO-WP-102A — Live Zero-Trust / token penetration audit (read-only validation).
 * Does not mutate business registries beyond refresh-token create/delete via auth APIs.
 */
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BAT_BASE_URL || "https://catalyst-one-two.vercel.app";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const PARTNER_AUD = "wealth_partner_app";

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error("JWT_SECRET / JWT_REFRESH_SECRET required from .env.local");
  process.exit(1);
}

const prisma = new PrismaClient();
const findings = [];

function record(id, result, detail, severity = "info") {
  findings.push({ id, result, detail, severity });
  const mark = result === "PASS" ? "PASS" : result === "FAIL" ? "FAIL" : result;
  console.log(`[${mark}] ${id} — ${detail}`);
}

async function json(res) {
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  // --- Health ---
  const health = await json(await fetch(`${BASE}/api/partner/health`));
  record(
    "HEALTH",
    health.status === 200 && health.body?.data?.persistence === "prisma" ? "PASS" : "FAIL",
    `status=${health.status} persistence=${health.body?.data?.persistence}`,
    health.status === 200 ? "info" : "critical",
  );

  // Resolve a real partner-linked user if any
  const linked = await prisma.ecmContact.findFirst({
    where: { linkedUserId: { not: null }, isDeleted: false },
    select: { id: true, linkedUserId: true, organizationId: true },
  });
  let partner = null;
  let user = null;
  if (linked?.linkedUserId) {
    partner = await prisma.enterpriseWealthPartner.findFirst({
      where: { contactId: linked.id, isDeleted: false },
    });
    user = await prisma.user.findUnique({ where: { id: linked.linkedUserId } });
  }

  // Fallback: activation stamp
  if (!partner || !user) {
    const activated = await prisma.enterpriseWealthPartner.findFirst({
      where: {
        isDeleted: false,
        profileJson: { path: ["activation", "activatedUserId"], not: null },
      },
    });
    if (activated) {
      const uid = activated.profileJson?.activation?.activatedUserId;
      if (uid) {
        user = await prisma.user.findUnique({ where: { id: uid } });
        partner = activated;
      }
    }
  }

  console.log(
    "FIXTURE",
    user ? `user=${user.email}` : "user=NONE",
    partner ? `partner=${partner.id}` : "partner=NONE",
  );

  // --- Employee-shaped token (no partner aud) vs Partner APIs ---
  const employeeToken = jwt.sign(
    {
      userId: user?.id || "fake-user",
      email: user?.email || "employee@test.local",
      role: "SUPER_ADMIN",
    },
    JWT_SECRET,
    { expiresIn: "15m" },
  );
  const empOnPartner = await json(
    await fetch(`${BASE}/api/partner/auth/me`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }),
  );
  record(
    "EMPLOYEE_JWT_ON_PARTNER_ME",
    empOnPartner.status === 401 ? "PASS" : "FAIL",
    `expected 401, got ${empOnPartner.status} code=${empOnPartner.body?.error?.code}`,
    empOnPartner.status === 401 ? "info" : "critical",
  );

  // --- Invalid JWT ---
  const invalid = await json(
    await fetch(`${BASE}/api/partner/auth/me`, {
      headers: { Authorization: "Bearer not-a-jwt" },
    }),
  );
  record(
    "INVALID_JWT",
    invalid.status === 401 ? "PASS" : "FAIL",
    `status=${invalid.status}`,
    invalid.status === 401 ? "info" : "high",
  );

  // --- Missing auth ---
  const missing = await json(await fetch(`${BASE}/api/partner/auth/me`));
  record(
    "MISSING_AUTH",
    missing.status === 401 ? "PASS" : "FAIL",
    `status=${missing.status}`,
    missing.status === 401 ? "info" : "high",
  );

  // --- Expired partner JWT ---
    const expiredPartner = jwt.sign(
    {
      userId: user?.id || "u",
      email: user?.email || "p@test.local",
      role: "VIEWER",
      partnerId: partner?.id || "p",
      organizationId: partner?.organizationId || "o",
      contactId: null,
      typ: "partner_access",
    },
    JWT_SECRET,
    { expiresIn: -10, audience: PARTNER_AUD },
  );
  const expiredRes = await json(
    await fetch(`${BASE}/api/partner/auth/me`, {
      headers: { Authorization: `Bearer ${expiredPartner}` },
    }),
  );
  record(
    "EXPIRED_PARTNER_JWT",
    expiredRes.status === 401 ? "PASS" : "FAIL",
    `status=${expiredRes.status}`,
    expiredRes.status === 401 ? "info" : "high",
  );

  if (user && partner) {
    // Valid partner token
    const partnerToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        partnerId: partner.id,
        organizationId: partner.organizationId,
        contactId: partner.contactId,
        typ: "partner_access",
      },
      JWT_SECRET,
      { expiresIn: "15m", audience: PARTNER_AUD },
    );

    const meOk = await json(
      await fetch(`${BASE}/api/partner/auth/me`, {
        headers: { Authorization: `Bearer ${partnerToken}` },
      }),
    );
    record(
      "VALID_PARTNER_ME",
      meOk.status === 200 && meOk.body?.data?.partnerId === partner.id ? "PASS" : "FAIL",
      `status=${meOk.status} partnerId=${meOk.body?.data?.partnerId}`,
      meOk.status === 200 ? "info" : "critical",
    );

    // Spoof partner UUID in token (same user, wrong partnerId)
    const otherPartner = await prisma.enterpriseWealthPartner.findFirst({
      where: { isDeleted: false, id: { not: partner.id } },
    });
    if (otherPartner) {
      const spoofed = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          partnerId: otherPartner.id,
          organizationId: otherPartner.organizationId,
          contactId: otherPartner.contactId,
          typ: "partner_access",
        },
        JWT_SECRET,
        { expiresIn: "15m", audience: PARTNER_AUD },
      );
      const spoofRes = await json(
        await fetch(`${BASE}/api/partner/auth/me`, {
          headers: { Authorization: `Bearer ${spoofed}` },
        }),
      );
      record(
        "PARTNER_UUID_SPOOF_ON_ME",
        spoofRes.status === 403 ? "PASS" : "FAIL",
        `expected 403 when claiming Partner B UUID, got ${spoofRes.status} dataPartner=${spoofRes.body?.data?.partnerId}`,
        spoofRes.status === 403 ? "info" : "critical",
      );
    } else {
      record("PARTNER_UUID_SPOOF_ON_ME", "SKIP", "No second partner row for cross-partner spoof", "info");
    }

    // Partner JWT on employee API
    const partnerOnEmp = await json(
      await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${partnerToken}` },
      }),
    );
    // FAIL if 200 — partner token must not access employee APIs
    record(
      "PARTNER_JWT_ON_EMPLOYEE_ME",
      partnerOnEmp.status === 401 || partnerOnEmp.status === 403 ? "PASS" : "FAIL",
      `expected 401/403, got ${partnerOnEmp.status} (employee /api/auth/me)`,
      partnerOnEmp.status === 401 || partnerOnEmp.status === 403 ? "info" : "critical",
    );

    // Partner JWT on wealth-partner-registry (employee surface)
    const partnerOnRegistry = await json(
      await fetch(`${BASE}/api/wealth-partner-registry/partners`, {
        headers: { Authorization: `Bearer ${partnerToken}` },
      }),
    );
    record(
      "PARTNER_JWT_ON_EMPLOYEE_WP_REGISTRY",
      partnerOnRegistry.status === 401 || partnerOnRegistry.status === 403
        ? "PASS"
        : "FAIL",
      `expected 401/403, got ${partnerOnRegistry.status}`,
      partnerOnRegistry.status === 401 || partnerOnRegistry.status === 403
        ? "info"
        : "critical",
    );

    // Refresh + logout cycle
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        partnerId: partner.id,
        organizationId: partner.organizationId,
        contactId: partner.contactId,
        typ: "partner_access",
      },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d", audience: PARTNER_AUD },
    );
    // Store refresh so API accepts it
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    const refreshRes = await json(
      await fetch(`${BASE}/api/partner/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }),
    );
    record(
      "REFRESH_TOKEN",
      refreshRes.status === 200 && refreshRes.body?.data?.accessToken ? "PASS" : "FAIL",
      `status=${refreshRes.status}`,
      refreshRes.status === 200 ? "info" : "high",
    );

    const newAccess = refreshRes.body?.data?.accessToken;
    const newRefresh = refreshRes.body?.data?.refreshToken;
    if (newAccess && newRefresh) {
      const logoutRes = await json(
        await fetch(`${BASE}/api/partner/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${newAccess}`,
          },
          body: JSON.stringify({ refreshToken: newRefresh }),
        }),
      );
      record(
        "LOGOUT",
        logoutRes.status === 200 ? "PASS" : "FAIL",
        `status=${logoutRes.status}`,
        logoutRes.status === 200 ? "info" : "high",
      );

      // Refresh after logout should fail (token deleted)
      const reuse = await json(
        await fetch(`${BASE}/api/partner/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: newRefresh }),
        }),
      );
      record(
        "REFRESH_AFTER_LOGOUT",
        reuse.status === 401 ? "PASS" : "FAIL",
        `expected 401, got ${reuse.status}`,
        reuse.status === 401 ? "info" : "high",
      );
    }

    // Cross-partner business APIs — none exist in CO-WP-102
    for (const path of [
      `/api/partner/customers`,
      `/api/partner/opportunities`,
      `/api/partner/commissions`,
      `/api/partner/documents`,
    ]) {
      const r = await json(
        await fetch(`${BASE}${path}`, {
          headers: { Authorization: `Bearer ${partnerToken}` },
        }),
      );
      record(
        `NO_BUSINESS_ROUTE_${path}`,
        r.status === 404 ? "PASS" : "INFO",
        `status=${r.status} (no business partner routes in CO-WP-102)`,
        "info",
      );
    }
  } else {
    record(
      "PARTNER_FIXTURE",
      "BLOCKED",
      "No User↔Wealth Partner binding in DB — cannot complete partner token live tests",
      "high",
    );
  }

  // Unmapped user login attempt (admin without partner link)
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
  });
  if (admin) {
    // Don't need password — mint partner-shaped token for admin without partner binding
    const fakePartnerTok = jwt.sign(
      {
        userId: admin.id,
        email: admin.email,
        role: admin.role,
        partnerId: "spoofed-partner-id",
        organizationId: "spoofed-org",
        contactId: null,
        typ: "partner_access",
      },
      JWT_SECRET,
      { expiresIn: "15m", audience: PARTNER_AUD },
    );
    const unmapped = await json(
      await fetch(`${BASE}/api/partner/auth/me`, {
        headers: { Authorization: `Bearer ${fakePartnerTok}` },
      }),
    );
    record(
      "UNMAPPED_USER_PARTNER_ME",
      unmapped.status === 403 ? "PASS" : "FAIL",
      `expected 403, got ${unmapped.status} code=${unmapped.body?.error?.code}`,
      unmapped.status === 403 ? "info" : "critical",
    );
  }

  const fails = findings.filter((f) => f.result === "FAIL");
  const blocked = findings.filter((f) => f.result === "BLOCKED");
  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        pass: findings.filter((f) => f.result === "PASS").length,
        fail: fails.length,
        blocked: blocked.length,
        skip: findings.filter((f) => f.result === "SKIP").length,
        fails,
        blocked,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
  if (fails.length) process.exitCode = 2;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
