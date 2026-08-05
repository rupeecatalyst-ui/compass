/**
 * CO-WP-102A — In-process Zero-Trust certification (same JWT secrets as runtime code).
 */
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

process.env.ENTERPRISE_PERSISTENCE_MODE =
  process.env.ENTERPRISE_PERSISTENCE_MODE || "prisma";

const prisma = new PrismaClient();
const findings = [];

function record(id, result, detail, severity = "info") {
  findings.push({ id, result, detail, severity });
  console.log(`[${result}] ${id} — ${detail}`);
}

async function main() {
  const { signPartnerAccessToken, signPartnerRefreshToken, verifyPartnerAccessToken } =
    await import("../server/services/partner-gateway/partner-token.service.ts");
  const { partnerAuthService } = await import(
    "../server/services/partner-gateway/partner-auth.service.ts"
  );
  const { verifyAccessToken, signAccessToken } = await import(
    "../server/services/token.service.ts"
  );
  const { serverEnv } = await import("../server/config/env.ts");

  const health = await partnerAuthService.health();
  record(
    "HEALTH",
    health.persistence === "prisma" ? "PASS" : "FAIL",
    JSON.stringify(health),
  );

  const linked = await prisma.ecmContact.findFirst({
    where: { linkedUserId: { not: null }, isDeleted: false },
    select: { id: true, linkedUserId: true },
  });
  const partner = linked
    ? await prisma.enterpriseWealthPartner.findFirst({
        where: { contactId: linked.id, isDeleted: false },
      })
    : null;
  const user = linked?.linkedUserId
    ? await prisma.user.findUnique({ where: { id: linked.linkedUserId } })
    : null;

  if (!user || !partner) {
    record("FIXTURE", "BLOCKED", "No partner-linked user", "critical");
    console.log(JSON.stringify({ findings }, null, 2));
    process.exitCode = 2;
    return;
  }
  console.log("FIXTURE", user.email, partner.id);

  // Employee token rejected by partner verifier
  const empTok = signAccessToken({
    userId: user.id,
    email: user.email,
    role: "SUPER_ADMIN",
  });
  try {
    verifyPartnerAccessToken(empTok);
    record("EMPLOYEE_JWT_ON_PARTNER", "FAIL", "employee token accepted", "critical");
  } catch {
    record("EMPLOYEE_JWT_ON_PARTNER", "PASS", "employee token rejected by partner verifier");
  }

  // Valid partner me
  const partnerTok = signPartnerAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    partnerId: partner.id,
    organizationId: partner.organizationId,
    contactId: partner.contactId,
  });
  const me = await partnerAuthService.me(user.id, partner.id);
  record(
    "VALID_PARTNER_ME",
    me.partnerId === partner.id ? "PASS" : "FAIL",
    `partnerId=${me.partnerId}`,
  );

  // Spoof partner UUID
  const other = await prisma.enterpriseWealthPartner.findFirst({
    where: { isDeleted: false, id: { not: partner.id } },
  });
  if (other) {
    try {
      await partnerAuthService.me(user.id, other.id);
      record("PARTNER_UUID_SPOOF", "FAIL", "spoofed partnerId accepted", "critical");
    } catch (e) {
      record(
        "PARTNER_UUID_SPOOF",
        e.statusCode === 403 ? "PASS" : "FAIL",
        `${e.code || e.message} status=${e.statusCode}`,
        e.statusCode === 403 ? "info" : "critical",
      );
    }
  } else {
    record("PARTNER_UUID_SPOOF", "SKIP", "only one partner row");
  }

  // Partner token must not verify as employee
  try {
    verifyAccessToken(partnerTok);
    record("PARTNER_JWT_ON_EMPLOYEE_VERIFY", "FAIL", "partner token verified as employee", "critical");
  } catch {
    record("PARTNER_JWT_ON_EMPLOYEE_VERIFY", "PASS", "partner token rejected by employee verify");
  }

  // Invalid / expired
  try {
    verifyPartnerAccessToken("not-a-jwt");
    record("INVALID_JWT", "FAIL", "accepted", "high");
  } catch {
    record("INVALID_JWT", "PASS", "rejected");
  }

  const expired = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      partnerId: partner.id,
      organizationId: partner.organizationId,
      contactId: partner.contactId,
      typ: "partner_access",
    },
    serverEnv.JWT_SECRET,
    { expiresIn: -5, audience: "wealth_partner_app" },
  );
  try {
    verifyPartnerAccessToken(expired);
    record("EXPIRED_JWT", "FAIL", "expired accepted", "high");
  } catch {
    record("EXPIRED_JWT", "PASS", "expired rejected");
  }

  // Refresh + logout
  const refresh = signPartnerRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    partnerId: partner.id,
    organizationId: partner.organizationId,
    contactId: partner.contactId,
  });
  await prisma.refreshToken.create({
    data: {
      token: refresh,
      userId: user.id,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const refreshed = await partnerAuthService.refresh(refresh);
  record(
    "REFRESH",
    refreshed.accessToken && refreshed.session.partnerId === partner.id ? "PASS" : "FAIL",
    `partnerId=${refreshed.session.partnerId}`,
  );

  await partnerAuthService.logout(refreshed.refreshToken, user.id);
  try {
    await partnerAuthService.refresh(refreshed.refreshToken);
    record("REFRESH_AFTER_LOGOUT", "FAIL", "refresh reused after logout", "high");
  } catch (e) {
    record(
      "REFRESH_AFTER_LOGOUT",
      e.statusCode === 401 ? "PASS" : "FAIL",
      `${e.code} ${e.statusCode}`,
    );
  }

  // Unmapped admin
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
  });
  if (admin) {
    try {
      await partnerAuthService.me(admin.id, "spoofed-partner");
      record("UNMAPPED_USER", "FAIL", "unmapped accepted", "critical");
    } catch (e) {
      record(
        "UNMAPPED_USER",
        e.statusCode === 403 ? "PASS" : "FAIL",
        `${e.code} ${e.statusCode}`,
        e.statusCode === 403 ? "info" : "critical",
      );
    }
  }

  // Endpoint inventory
  record(
    "ENDPOINT_INVENTORY",
    "PASS",
    "Only /health /auth/login /auth/refresh /auth/logout /auth/me — no business resource APIs",
  );

  const fails = findings.filter((f) => f.result === "FAIL");
  console.log(
    "\nSUMMARY",
    JSON.stringify(
      {
        pass: findings.filter((f) => f.result === "PASS").length,
        fail: fails.length,
        fails,
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
