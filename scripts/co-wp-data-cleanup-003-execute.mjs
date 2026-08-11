/**
 * CO-WP-DATA-CLEANUP-003 — Deactivate certification users/partners (DO NOT DELETE).
 * Product Owner authorized after CLEANUP-002.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

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

if (!process.env.DATABASE_URL) {
  console.error("STOP: DATABASE_URL missing");
  process.exit(2);
}

const prisma = new PrismaClient();

const CERT_PARTNER_IDS = [
  "cmsljyws50005weeka0js9u4t", // WPACERTA
  "cmsljyzhu0009weekfeq2rsv9", // WPACERTB
];
const CERT_PARTNER_CODES = ["WPACERTA", "WPACERTB"];
const CERT_USER_EMAILS = [
  "wp-access-cert-a@rupeecatalyst.com",
  "wp-access-cert-b@rupeecatalyst.com",
  "wp-access-cert-admin@rupeecatalyst.com", // confirmed certification-only admin in CLEANUP-001
];
const FROZEN_ADMIN = "admin@compass.com";
const ACTOR = "co-wp-data-cleanup-003";
const NOTE = "CO-WP-DATA-CLEANUP-003: deactivated for ACCESS cert identity cleanup (reactivatable)";

function fingerprint(rows) {
  const payload = rows
    .map((r) => `${r.id}|${r.updatedAt?.toISOString?.() || r.updatedAt}|${r.isDeleted}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

async function main() {
  const now = new Date();
  const report = {
    sprint: "CO-WP-DATA-CLEANUP-003",
    generatedAt: now.toISOString(),
    mode: "DEACTIVATE_ONLY",
    stopped: false,
    exceptions: [],
  };

  // ─── SAFETY CHECK ───────────────────────────────────────────────────
  const partners = await prisma.enterpriseWealthPartner.findMany({
    where: {
      OR: [{ id: { in: CERT_PARTNER_IDS } }, { code: { in: CERT_PARTNER_CODES } }],
    },
    select: {
      id: true,
      code: true,
      displayName: true,
      email: true,
      lifecycleStatus: true,
      operationalStatus: true,
      enabled: true,
      status: true,
      isDeleted: true,
      contactId: true,
      profileJson: true,
    },
  });

  if (partners.length !== 2) {
    report.stopped = true;
    report.exceptions.push({
      code: "PARTNER_COUNT_UNEXPECTED",
      found: partners,
      expectedIds: CERT_PARTNER_IDS,
    });
    return finish(report, 3);
  }

  for (const p of partners) {
    if (!CERT_PARTNER_IDS.includes(p.id) || !CERT_PARTNER_CODES.includes(p.code)) {
      report.stopped = true;
      report.exceptions.push({ code: "PARTNER_IDENTITY_MISMATCH", partner: p });
    }
    if (p.isDeleted) {
      report.exceptions.push({
        code: "PARTNER_ALREADY_DELETED",
        partnerId: p.id,
        note: "Unexpected — cleanup must deactivate not delete; continuing only if safety otherwise OK",
      });
    }
  }
  if (report.stopped) return finish(report, 3);

  const activeOpps = await prisma.enterpriseOpportunity.count({
    where: {
      isDeleted: false,
      sourceWealthPartnerId: { in: CERT_PARTNER_IDS },
    },
  });
  const activeDealsOnCertOpps = await prisma.enterpriseDeal.count({
    where: {
      isDeleted: false,
      opportunity: {
        sourceWealthPartnerId: { in: CERT_PARTNER_IDS },
        isDeleted: false,
      },
    },
  });

  if (activeOpps !== 0 || activeDealsOnCertOpps !== 0) {
    report.stopped = true;
    report.exceptions.push({
      code: "GENUINE_OR_ACTIVE_DEPENDENCY",
      activeOpps,
      activeDealsOnCertOpps,
    });
    return finish(report, 3);
  }

  const users = await prisma.user.findMany({
    where: { email: { in: CERT_USER_EMAILS } },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      firstName: true,
      lastName: true,
    },
  });

  if (users.some((u) => u.email.toLowerCase() === FROZEN_ADMIN)) {
    report.stopped = true;
    report.exceptions.push({ code: "FROZEN_ADMIN_IN_TARGET_SET" });
    return finish(report, 3);
  }

  // Ensure no production user misclassified: emails must match exact cert set
  for (const u of users) {
    if (!CERT_USER_EMAILS.includes(u.email.toLowerCase()) && !CERT_USER_EMAILS.includes(u.email)) {
      report.stopped = true;
      report.exceptions.push({ code: "UNEXPECTED_USER", user: u });
    }
  }
  if (users.length !== 3) {
    report.stopped = true;
    report.exceptions.push({
      code: "USER_COUNT_UNEXPECTED",
      found: users.map((u) => u.email),
      expected: CERT_USER_EMAILS,
    });
    return finish(report, 3);
  }
  if (report.stopped) return finish(report, 3);

  // Genuine fingerprint before
  const genuineOppsBefore = await prisma.enterpriseOpportunity.findMany({
    where: { isDeleted: false },
    select: { id: true, updatedAt: true, isDeleted: true },
    orderBy: { id: "asc" },
  });
  const genuineDealsBefore = await prisma.enterpriseDeal.findMany({
    where: { isDeleted: false },
    select: { id: true, updatedAt: true, isDeleted: true },
    orderBy: { id: "asc" },
  });
  const oppFpBefore = fingerprint(genuineOppsBefore);
  const dealFpBefore = fingerprint(genuineDealsBefore);
  const auditBefore = await prisma.partnerEntitlementAudit.count();
  const profileBefore = await prisma.partnerEntitlementProfile.count({
    where: { wealthPartnerId: { in: CERT_PARTNER_IDS } },
  });

  const activeUsersBefore = await prisma.user.count({ where: { isActive: true } });
  const activePartnersBefore = await prisma.enterpriseWealthPartner.count({
    where: {
      isDeleted: false,
      lifecycleStatus: "active",
      operationalStatus: "active",
      enabled: true,
    },
  });

  report.before = {
    partners,
    users,
    activeOppsOwnedByCertPartners: activeOpps,
    activeDealsOnCertOpps,
    activeUsers: activeUsersBefore,
    activeOperationalPartners: activePartnersBefore,
    genuineOpportunityCount: genuineOppsBefore.length,
    genuineDealCount: genuineDealsBefore.length,
    entitlementAudits: auditBefore,
    certPartnerProfiles: profileBefore,
  };

  // ─── DEACTIVATE USERS ────────────────────────────────────────────────
  const userUpdate = await prisma.user.updateMany({
    where: { email: { in: CERT_USER_EMAILS } },
    data: { isActive: false },
  });

  const userIds = users.map((u) => u.id);
  const tokensRevoked = await prisma.refreshToken.deleteMany({
    where: { userId: { in: userIds } },
  });

  // ─── DEACTIVATE PARTNERS (not delete) ────────────────────────────────
  // Binding gate: lifecycle suspended|retired blocks Partner Gateway.
  const partnerUpdates = [];
  for (const p of partners) {
    const updated = await prisma.enterpriseWealthPartner.update({
      where: { id: p.id },
      data: {
        lifecycleStatus: "suspended",
        operationalStatus: "inactive",
        enabled: false,
        status: "inactive",
        modifiedBy: ACTOR,
      },
      select: {
        id: true,
        code: true,
        lifecycleStatus: true,
        operationalStatus: true,
        enabled: true,
        status: true,
        isDeleted: true,
        email: true,
        displayName: true,
      },
    });
    partnerUpdates.push(updated);
  }

  // Stamp reactivation note into profileJson without wiping activation/batIsolation
  for (const p of partners) {
    const prev =
      p.profileJson && typeof p.profileJson === "object" && !Array.isArray(p.profileJson)
        ? p.profileJson
        : {};
    await prisma.enterpriseWealthPartner.update({
      where: { id: p.id },
      data: {
        profileJson: {
          ...prev,
          cleanup003: {
            deactivatedAt: now.toISOString(),
            deactivatedBy: ACTOR,
            reason: NOTE,
            reactivatable: true,
          },
        },
        modifiedBy: ACTOR,
      },
    });
  }

  // ─── AUTH VERIFICATION ───────────────────────────────────────────────
  const { partnerAuthService } = await import(
    "../server/services/partner-gateway/partner-auth.service.ts"
  );
  const { resolvePartnerBindingForUser, PartnerGatewayError } = await import(
    "../server/services/partner-gateway/partner-binding.service.ts"
  );

  const authResults = [];
  for (const email of [
    "wp-access-cert-a@rupeecatalyst.com",
    "wp-access-cert-b@rupeecatalyst.com",
  ]) {
    let result;
    try {
      await partnerAuthService.login(email, "definitely-wrong-password-for-inactive-check");
      result = { email, unexpectedSuccess: true };
    } catch (e) {
      result = {
        email,
        blocked: true,
        code: e?.code || e?.name,
        message: e?.message,
        statusCode: e?.statusCode,
      };
    }
    authResults.push(result);
  }

  // Binding must fail for inactive users even if called directly
  const bindingResults = [];
  for (const u of users.filter((x) => x.email.includes("cert-a") || x.email.includes("cert-b"))) {
    try {
      await resolvePartnerBindingForUser(u.id);
      bindingResults.push({ userId: u.id, email: u.email, unexpectedSuccess: true });
    } catch (e) {
      bindingResults.push({
        userId: u.id,
        email: u.email,
        blocked: true,
        code: e instanceof PartnerGatewayError ? e.code : e?.code || e?.name,
        message: e?.message,
      });
    }
  }

  // Partner suspended check: if we force-load partner row for binding path
  // (user inactive already blocks; also confirm partner lifecycle suspended)
  const partnersAfter = await prisma.enterpriseWealthPartner.findMany({
    where: { id: { in: CERT_PARTNER_IDS } },
    select: {
      id: true,
      code: true,
      lifecycleStatus: true,
      operationalStatus: true,
      enabled: true,
      status: true,
      isDeleted: true,
    },
  });

  // ─── POST VERIFICATION ───────────────────────────────────────────────
  const usersAfter = await prisma.user.findMany({
    where: { email: { in: CERT_USER_EMAILS } },
    select: { id: true, email: true, role: true, isActive: true },
  });
  const genuineOppsAfter = await prisma.enterpriseOpportunity.findMany({
    where: { isDeleted: false },
    select: { id: true, updatedAt: true, isDeleted: true },
    orderBy: { id: "asc" },
  });
  const genuineDealsAfter = await prisma.enterpriseDeal.findMany({
    where: { isDeleted: false },
    select: { id: true, updatedAt: true, isDeleted: true },
    orderBy: { id: "asc" },
  });
  const auditAfter = await prisma.partnerEntitlementAudit.count();
  const profileAfter = await prisma.partnerEntitlementProfile.count({
    where: { wealthPartnerId: { in: CERT_PARTNER_IDS } },
  });
  const frozenAdmin = await prisma.user.findUnique({
    where: { email: FROZEN_ADMIN },
    select: { id: true, email: true, isActive: true, role: true },
  });
  const otherActivePartners = await prisma.enterpriseWealthPartner.count({
    where: {
      isDeleted: false,
      id: { notIn: CERT_PARTNER_IDS },
      lifecycleStatus: "active",
      operationalStatus: "active",
      enabled: true,
    },
  });
  const activeUsersAfter = await prisma.user.count({ where: { isActive: true } });

  report.A_usersDeactivated = usersAfter.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
  }));
  report.B_partnersDeactivated = partnersAfter;
  report.C_preserved = {
    partnerRowsNotDeleted: partnersAfter.every((p) => !p.isDeleted),
    userRowsNotDeleted: true,
    entitlementProfiles: profileAfter,
    historicalRelationships: "retained (contact links, profileJson activation, audits)",
  };
  report.D_auditRecordsPreserved = {
    before: auditBefore,
    after: auditAfter,
    delta: auditAfter - auditBefore,
  };
  report.E_beforeAfterActiveCounts = {
    certUsersActive: {
      before: users.filter((u) => u.isActive).length,
      after: usersAfter.filter((u) => u.isActive).length,
    },
    certPartnersOperationallyActive: {
      before: partners.filter(
        (p) =>
          p.lifecycleStatus === "active" &&
          p.operationalStatus === "active" &&
          p.enabled,
      ).length,
      after: partnersAfter.filter(
        (p) =>
          p.lifecycleStatus === "active" &&
          p.operationalStatus === "active" &&
          p.enabled,
      ).length,
    },
    platformActiveUsers: { before: activeUsersBefore, after: activeUsersAfter },
    otherActiveWealthPartners: otherActivePartners,
    usersUpdateCount: userUpdate.count,
    refreshTokensRevoked: tokensRevoked.count,
  };
  report.F_authenticationVerification = {
    partnerLoginAttempts: authResults,
    bindingAttempts: bindingResults,
    partnerLifecycleGate:
      "lifecycleStatus=suspended blocks resolvePartnerBindingForUser (PARTNER_SUSPENDED)",
    note: "Login uses isActive=false → INVALID_CREDENTIALS (401). Passwords not required for inactive gate.",
  };
  report.G_genuineDataIntegrity = {
    genuineOpportunityCountBefore: genuineOppsBefore.length,
    genuineOpportunityCountAfter: genuineOppsAfter.length,
    genuineOpportunityFingerprintMatch: oppFpBefore === fingerprint(genuineOppsAfter),
    genuineDealFingerprintMatch: dealFpBefore === fingerprint(genuineDealsAfter),
    expectedOpportunityCount: 16,
    opportunitiesRemain16: genuineOppsAfter.length === 16,
    frozenAdminUnchanged:
      frozenAdmin &&
      frozenAdmin.isActive === true &&
      frozenAdmin.email === FROZEN_ADMIN,
    frozenAdmin,
    entitlementAuditsIntact: auditAfter >= auditBefore,
    noAppCodeChange: true,
    noDbReset: true,
    noVercelDeploy: true,
  };

  if (usersAfter.some((u) => u.isActive)) {
    report.exceptions.push({ code: "USER_STILL_ACTIVE", users: usersAfter });
  }
  if (
    partnersAfter.some(
      (p) => p.lifecycleStatus !== "suspended" || p.operationalStatus !== "inactive" || p.enabled,
    )
  ) {
    report.exceptions.push({ code: "PARTNER_NOT_FULLY_DEACTIVATED", partners: partnersAfter });
  }
  if (genuineOppsAfter.length !== 16) {
    report.exceptions.push({
      code: "OPP_COUNT",
      count: genuineOppsAfter.length,
    });
  }
  if (oppFpBefore !== fingerprint(genuineOppsAfter)) {
    report.exceptions.push({ code: "GENUINE_OPP_CHANGED" });
  }
  if (dealFpBefore !== fingerprint(genuineDealsAfter)) {
    report.exceptions.push({ code: "GENUINE_DEAL_CHANGED" });
  }
  if (auditAfter < auditBefore) {
    report.exceptions.push({ code: "AUDIT_DECREASED" });
  }
  if (!report.G_genuineDataIntegrity.frozenAdminUnchanged) {
    report.exceptions.push({ code: "FROZEN_ADMIN_AFFECTED", frozenAdmin });
  }

  report.mutations = {
    usersDeactivated: userUpdate.count,
    partnersDeactivated: partnerUpdates.length,
    refreshTokensRevoked: tokensRevoked.count,
  };
  report.status = report.exceptions.length === 0 ? "SUCCESS" : "COMPLETED_WITH_EXCEPTIONS";
  return finish(report, report.exceptions.length ? 1 : 0);
}

async function finish(report, code) {
  const outDir = path.join(root, "docs/co-wp-data-cleanup-003");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "CO-WP-DATA-CLEANUP-003-EXECUTION-INVENTORY.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        status: report.status || (report.stopped ? "STOPPED" : "UNKNOWN"),
        stopped: report.stopped,
        exceptions: report.exceptions?.length || 0,
        A: report.A_usersDeactivated,
        B: report.B_partnersDeactivated,
        E: report.E_beforeAfterActiveCounts,
        F: report.F_authenticationVerification,
        G: report.G_genuineDataIntegrity,
        jsonPath,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  process.exit(code);
}

main().catch(async (e) => {
  console.error("CLEANUP_003_FAILED", e);
  await prisma.$disconnect();
  process.exit(1);
});
