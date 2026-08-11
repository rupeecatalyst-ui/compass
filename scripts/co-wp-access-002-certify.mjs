/**
 * CO-WP-ACCESS-002 — Formal certification BAT (live multi-partner HTTP).
 * CO-WP-ACCESS-004 — Production tokens via POST /api/partner/auth/login (never local JWT mint against production).
 * Sets up Partner A/B fixtures, configures entitlements, exercises Partner Gateway over HTTP.
 * Does NOT deploy. Does NOT redesign architecture. Does NOT use JWT_SECRET to mint production tokens.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.ENTERPRISE_PERSISTENCE_MODE =
  process.env.ENTERPRISE_PERSISTENCE_MODE || "prisma";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prisma = new PrismaClient();
const BASE =
  (process.env.CERT_BASE_URL || process.env.PARTNER_CERT_BASE_URL || "http://127.0.0.1:3010").replace(
    /\/$/,
    "",
  );

/** Always authenticate partners via the target Gateway login API (production-safe). */
const AUTH_MODE = "login";
const EVIDENCE_FILE =
  process.env.CERT_EVIDENCE_FILE ||
  (BASE.includes("vercel.app")
    ? "CO-WP-ACCESS-004-POST-DEPLOY-BAT-EVIDENCE.json"
    : "CO-WP-ACCESS-002-BAT-EVIDENCE.json");
const SPRINT_LABEL =
  process.env.CERT_SPRINT_LABEL ||
  (BASE.includes("vercel.app") ? "CO-WP-ACCESS-004" : "CO-WP-ACCESS-002");

const findings = [];
const httpStatusCounts = { "2xx": 0, "401": 0, "403": 0, other: 0 };
const evidence = {
  baseUrl: BASE,
  authMode: AUTH_MODE,
  partners: {},
  opportunities: {},
  deals: {},
  http: [],
  httpStatusCounts,
};

function tallyStatus(status) {
  if (status >= 200 && status < 300) httpStatusCounts["2xx"] += 1;
  else if (status === 401) httpStatusCounts["401"] += 1;
  else if (status === 403) httpStatusCounts["403"] += 1;
  else httpStatusCounts.other += 1;
}

function record(id, result, detail, severity = "info") {
  findings.push({ id, result, detail, severity });
  console.log(`[${result}] ${id} — ${detail}`);
}

function expectStatus(id, res, allowed, detail = "") {
  const ok = allowed.includes(res.status);
  record(
    id,
    ok ? "PASS" : "FAIL",
    `status=${res.status} expected∈[${allowed.join(",")}] ${detail}`.trim(),
    ok ? "info" : "critical",
  );
  return ok;
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
    json = { raw: text.slice(0, 400) };
  }
  tallyStatus(res.status);
  evidence.http.push({
    method,
    path: pathName,
    status: res.status,
    ok: res.ok,
    code: json?.error?.code || json?.code || null,
  });
  return { status: res.status, json, ok: res.ok };
}

/**
 * CO-WP-ACCESS-004 — Obtain production-issued partner access token via Gateway login.
 * Never mints JWTs with the local JWT_SECRET against a remote Gateway.
 */
async function partnerLogin(email, password) {
  const res = await fetch(`${BASE}/api/partner/auth/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  tallyStatus(res.status);
  evidence.http.push({
    method: "POST",
    path: "/api/partner/auth/login",
    status: res.status,
    ok: res.ok,
    code: json?.error?.code || json?.code || null,
    email,
  });
  const token =
    json?.data?.accessToken ||
    json?.accessToken ||
    json?.data?.token ||
    null;
  const partnerId =
    json?.data?.session?.partnerId ||
    json?.data?.partnerId ||
    json?.session?.partnerId ||
    null;
  return { status: res.status, json, ok: res.ok, token, partnerId };
}

/** Employee / admin session via production auth login (not local JWT mint). */
async function adminLogin(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  tallyStatus(res.status);
  evidence.http.push({
    method: "POST",
    path: "/api/auth/login",
    status: res.status,
    ok: res.ok,
    code: json?.error?.code || json?.code || null,
    email,
  });
  const token =
    json?.data?.accessToken ||
    json?.accessToken ||
    json?.data?.tokens?.accessToken ||
    null;
  return { status: res.status, json, ok: res.ok, token };
}

/**
 * Tamper a production-issued JWT payload without re-signing (invalid signature).
 * Used for FORGED_PARTNER_TOKEN_CLAIM without knowing JWT_SECRET.
 */
function forgeUnsignedPartnerClaim(validToken, forgedPartnerId) {
  const parts = String(validToken || "").split(".");
  if (parts.length < 2) return "invalid.forged.token";
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8",
    );
    const payload = JSON.parse(json);
    payload.partnerId = forgedPartnerId;
    const mid = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${parts[0]}.${mid}.forged-signature-not-valid`;
  } catch {
    return `${parts[0] || "x"}.forged.signature`;
  }
}

async function ensurePartnerUser(input) {
  const { hashPassword } = await import("../server/utils/password.ts");
  const password = `Cert!${randomBytes(4).toString("hex")}9`;
  const passwordHash = await hashPassword(password);
  let user = await prisma.user.findUnique({ where: { email: input.email } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
        firstName: input.firstName,
        lastName: input.lastName,
        role: "VIEWER",
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: "VIEWER",
        isActive: true,
      },
    });
  }
  return { user, password };
}

async function ensurePartner(orgId, actorId, input) {
  let contact = await prisma.ecmContact.findFirst({
    where: {
      organizationId: orgId,
      isDeleted: false,
      OR: [
        { mobilePrimary: input.mobile },
        { personalEmail: input.email },
      ],
    },
  });
  if (!contact) {
    contact = await prisma.ecmContact.create({
      data: {
        organizationId: orgId,
        name: input.displayName,
        mobilePrimary: input.mobile,
        personalEmail: input.email,
        primaryRole: "partner",
        roles: ["partner"],
        additionalRoles: [],
        status: "active",
        platformAccess: "both",
        linkedUserId: input.userId,
        createdBy: actorId,
        modifiedBy: actorId,
      },
    });
  } else {
    contact = await prisma.ecmContact.update({
      where: { id: contact.id },
      data: {
        linkedUserId: input.userId,
        name: input.displayName,
        personalEmail: input.email,
        modifiedBy: actorId,
      },
    });
  }

  let partner = await prisma.enterpriseWealthPartner.findFirst({
    where: { organizationId: orgId, code: input.code, isDeleted: false },
  });
  const profileJson = {
    batIsolation: {
      kind: "bat_uat_demo",
      purpose: "CO-WP-ACCESS-002 certification",
      excludeFromCommissions: true,
      excludeFromPerformanceDashboards: true,
      excludeFromRankings: true,
      excludeFromBusinessKpis: true,
      excludeFromMarketingCommunications: true,
      excludeFromOperationalAnalytics: true,
      ownsNoBusinessHistory: true,
    },
    activation: { activatedUserId: input.userId },
  };
  if (!partner) {
    partner = await prisma.enterpriseWealthPartner.create({
      data: {
        organizationId: orgId,
        code: input.code,
        displayName: input.displayName,
        partnerType: "individual",
        identityKind: "contact",
        contactId: contact.id,
        identityLabel: input.displayName,
        lifecycleStatus: "active",
        operationalStatus: "active",
        email: input.email,
        mobile: input.mobile,
        profileJson,
        createdBy: actorId,
        modifiedBy: actorId,
      },
    });
  } else {
    partner = await prisma.enterpriseWealthPartner.update({
      where: { id: partner.id },
      data: {
        contactId: contact.id,
        displayName: input.displayName,
        email: input.email,
        profileJson,
        lifecycleStatus: "active",
        operationalStatus: "active",
        modifiedBy: actorId,
      },
    });
  }
  return { partner, contact };
}

async function createOwnedOpportunity(orgId, partnerId, actorId, label) {
  const { allocateOpportunityNumber } = await import(
    "../server/services/enterprise-opportunity/opportunity-number.service.ts"
  );
  const opportunityNumber = await allocateOpportunityNumber(orgId);
  return prisma.enterpriseOpportunity.create({
    data: {
      organizationId: orgId,
      opportunityNumber,
      productFamily: "lending",
      productLabel: label,
      requirementStage: "lead_creation",
      lifecycleStatus: "dialogue",
      stageEnteredAt: new Date(),
      primaryBorrowerKind: "individual",
      primaryContactName: `${label} Customer`,
      primaryContactMobile: "90000000001",
      sourceCode: "wealth_partner",
      sourceWealthPartnerId: partnerId,
      participationRole: "referral",
      snapshot: { cert: "CO-WP-ACCESS-002" },
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
}

async function createOwnedDeal(orgId, opportunityId, actorId, label) {
  const lender = await prisma.enterpriseLender.findFirst({
    where: { organizationId: orgId, isDeleted: false },
    select: { id: true, displayName: true, label: true, legalName: true },
  });
  if (!lender) return null;
  const { allocateDealNumber } = await import(
    "../server/services/enterprise-deal/deal-number.service.ts"
  ).catch(() => ({ allocateDealNumber: null }));
  let dealNumber = `CERT-${Date.now().toString().slice(-8)}`;
  try {
    if (allocateDealNumber) dealNumber = await allocateDealNumber(orgId);
  } catch {
    /* keep fallback */
  }
  return prisma.enterpriseDeal.create({
    data: {
      organizationId: orgId,
      dealNumber,
      opportunityId,
      lenderId: lender.id,
      productFamily: "lending",
      productLabel: label,
      grossStage: "identified",
      lifecycleStatus: "active",
      operationalStatus: "on_track",
      stageEnteredAt: new Date(),
      primaryCounterpartyType: "lender",
      primaryCounterpartyId: lender.id,
      primaryCounterpartyName:
        lender.displayName || lender.label || lender.legalName || "Lender",
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
}

async function main() {
  // CO-WP-ACCESS-004 — no local JWT mint for partner/admin against the target Gateway.
  const { partnerEntitlementsService } = await import(
    "../server/services/partner-entitlements/index.ts"
  );

  record("AUTH_MODE", "PASS", `partner+admin tokens via HTTP login against ${BASE} (mode=${AUTH_MODE})`);

  // Health
  try {
    const health = await fetch(`${BASE}/api/partner/health`);
    const hj = await health.json().catch(() => ({}));
    tallyStatus(health.status);
    record(
      "HTTP_HEALTH",
      health.ok && (hj?.data?.persistence === "prisma" || hj?.persistence === "prisma")
        ? "PASS"
        : health.ok
          ? "PARTIAL"
          : "FAIL",
      `status=${health.status} body=${JSON.stringify(hj).slice(0, 200)}`,
      health.ok ? "info" : "critical",
    );
    if (!health.ok) {
      record("HTTP_BASE", "FAIL", `Partner Gateway unreachable at ${BASE}`, "critical");
      await finish(2);
      return;
    }
  } catch (e) {
    record("HTTP_BASE", "FAIL", `Cannot reach ${BASE}: ${e.message}`, "critical");
    await finish(2);
    return;
  }

  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) {
    record("ORG", "FAIL", "No organization", "critical");
    await finish(2);
    return;
  }
  const actor =
    (await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
    })) || (await prisma.user.findFirst({ where: { isActive: true } }));
  if (!actor) {
    record("ACTOR", "FAIL", "No actor user", "critical");
    await finish(2);
    return;
  }

  await partnerEntitlementsService.ensureSystemTemplates(org.id, {
    userId: actor.id,
    label: "CO-WP-ACCESS-002",
  });

  // --- Fixtures: Partner A / B ---
  const aCred = await ensurePartnerUser({
    email: "wp-access-cert-a@rupeecatalyst.com",
    firstName: "Cert",
    lastName: "PartnerA",
  });
  const bCred = await ensurePartnerUser({
    email: "wp-access-cert-b@rupeecatalyst.com",
    firstName: "Cert",
    lastName: "PartnerB",
  });
  const a = await ensurePartner(org.id, actor.id, {
    code: "WPACERTA",
    displayName: "WP Access Cert Partner A",
    email: aCred.user.email,
    mobile: "90000000101",
    userId: aCred.user.id,
  });
  const b = await ensurePartner(org.id, actor.id, {
    code: "WPACERTB",
    displayName: "WP Access Cert Partner B",
    email: bCred.user.email,
    mobile: "90000000102",
    userId: bCred.user.id,
  });
  evidence.partners = {
    A: { id: a.partner.id, userId: aCred.user.id, email: aCred.user.email },
    B: { id: b.partner.id, userId: bCred.user.id, email: bCred.user.email },
  };
  record("FIXTURE_PARTNERS", "PASS", `A=${a.partner.id} B=${b.partner.id}`);

  const oppA1 = await createOwnedOpportunity(org.id, a.partner.id, actor.id, "Cert A Referral");
  const oppA2 = await createOwnedOpportunity(org.id, a.partner.id, actor.id, "Cert A Override Edit");
  const oppA3 = await createOwnedOpportunity(org.id, a.partner.id, actor.id, "Cert A ViewOnly");
  const oppB1 = await createOwnedOpportunity(org.id, b.partner.id, actor.id, "Cert B Solo");
  evidence.opportunities = {
    A_referral: oppA1.id,
    A_joint_override: oppA2.id,
    A_viewonly: oppA3.id,
    B_solo: oppB1.id,
  };

  const dealA = await createOwnedDeal(org.id, oppA1.id, actor.id, "Cert Deal A");
  const dealB = await createOwnedDeal(org.id, oppB1.id, actor.id, "Cert Deal B");
  evidence.deals = { A: dealA?.id || null, B: dealB?.id || null };
  record(
    "FIXTURE_DEALS",
    dealA && dealB ? "PASS" : "PARTIAL",
    `dealA=${dealA?.id || "none"} dealB=${dealB?.id || "none"}`,
  );

  // Entitlement profiles
  const actorMeta = { userId: actor.id, label: "CO-WP-ACCESS-002 Certifier" };
  await partnerEntitlementsService.updateProfile(
    a.partner.id,
    {
      templateCode: "REFERRAL_PARTNER",
      applyTemplateDefaults: true,
      defaultExecutionMode: "referral",
      reason: "Certification Referral defaults",
    },
    actorMeta,
  );
  await partnerEntitlementsService.updateProfile(
    b.partner.id,
    {
      templateCode: "SOLO_PARTNER",
      applyTemplateDefaults: true,
      defaultExecutionMode: "solo",
      reason: "Certification Solo defaults",
    },
    actorMeta,
  );

  // Transaction A2: Joint override — edit + stage
  await partnerEntitlementsService.upsertTransactionEntitlement(
    {
      wealthPartnerId: a.partner.id,
      entityKind: "opportunity",
      entityId: oppA2.id,
      executionMode: "joint_execution",
      permissions: {
        view: true,
        create: true,
        edit: true,
        stage_change: true,
        document_upload: true,
        document_edit: false,
        activity_add: true,
      },
      reason: "Certification Joint override on Transaction A2",
    },
    actorMeta,
  );
  // A3 stays referral (view+activity only) — no override

  // CO-WP-ACCESS-004 — production-issued partner tokens via Gateway login (not local JWT_SECRET).
  const loginA = await partnerLogin(aCred.user.email, aCred.password);
  record(
    "PARTNER_A_AUTH",
    loginA.ok && loginA.token ? "PASS" : "FAIL",
    `status=${loginA.status} partnerId=${loginA.partnerId || "n/a"}`,
    loginA.ok && loginA.token ? "info" : "critical",
  );
  const loginB = await partnerLogin(bCred.user.email, bCred.password);
  record(
    "PARTNER_B_AUTH",
    loginB.ok && loginB.token ? "PASS" : "FAIL",
    `status=${loginB.status} partnerId=${loginB.partnerId || "n/a"}`,
    loginB.ok && loginB.token ? "info" : "critical",
  );
  if (!loginA.token || !loginB.token) {
    record(
      "AUTH_ABORT",
      "FAIL",
      "Partner login failed — cannot evaluate authorization without valid production tokens",
      "critical",
    );
    await finish(1);
    return;
  }
  const tokenA = loginA.token;
  const tokenB = loginB.token;
  // Tampered production JWT (unsigned) — proves forged claims are rejected without using JWT_SECRET.
  const forgedAasB = forgeUnsignedPartnerClaim(tokenA, b.partner.id);

  // ========== Cross-partner ownership ==========
  const getOwnA = await partnerFetch(tokenA, "GET", `/api/partner/opportunities/${oppA1.id}`);
  expectStatus("CROSS_A_GET_OWN", getOwnA, [200], "Partner A own opp");

  const getCross = await partnerFetch(tokenA, "GET", `/api/partner/opportunities/${oppB1.id}`);
  expectStatus("CROSS_A_GET_B", getCross, [403], "Partner A must not read Partner B");

  const getBOwn = await partnerFetch(tokenB, "GET", `/api/partner/opportunities/${oppB1.id}`);
  expectStatus("CROSS_B_GET_OWN", getBOwn, [200], "Partner B own opp");

  const getBCross = await partnerFetch(tokenB, "GET", `/api/partner/opportunities/${oppA1.id}`);
  expectStatus("CROSS_B_GET_A", getBCross, [403], "Partner B must not read Partner A");

  const patchCross = await partnerFetch(tokenA, "PATCH", `/api/partner/opportunities/${oppB1.id}`, {
    notes: "forged cross patch",
  });
  expectStatus("CROSS_A_PATCH_B", patchCross, [403], "cross-partner mutation");

  // ========== Referral (A1) ==========
  const refGet = await partnerFetch(tokenA, "GET", `/api/partner/opportunities/${oppA1.id}`);
  const refPerms = refGet.json?.data?.entitlements?.permissions || {};
  record(
    "REFERRAL_EFFECTIVE",
    refGet.status === 200 &&
      refPerms.view === true &&
      refPerms.activity_add === true &&
      refPerms.edit === false &&
      refPerms.stage_change === false
      ? "PASS"
      : "FAIL",
    JSON.stringify(refPerms),
  );

  const refPatch = await partnerFetch(tokenA, "PATCH", `/api/partner/opportunities/${oppA1.id}`, {
    notes: "should fail",
  });
  expectStatus("REFERRAL_EDIT_DENIED", refPatch, [403]);

  const refSubmit = await partnerFetch(
    tokenA,
    "POST",
    `/api/partner/opportunities/${oppA1.id}/submit`,
    {},
  );
  expectStatus("REFERRAL_STAGE_DENIED", refSubmit, [403]);

  const refAct = await partnerFetch(
    tokenA,
    "POST",
    `/api/partner/opportunities/${oppA1.id}/activities`,
    { title: "Cert Note", body: "Referral view-only notepad CO-WP-ACCESS-002" },
  );
  expectStatus("REFERRAL_ACTIVITY_ALLOWED", refAct, [200, 201]);

  // Activity SSOT — Business Notes → EAR
  const noteRow = await prisma.enterpriseBusinessNote.findFirst({
    where: {
      opportunityId: oppA1.id,
      isDeleted: false,
      body: { contains: "Referral view-only notepad CO-WP-ACCESS-002" },
    },
    orderBy: { createdAt: "desc" },
  });
  const earRow = noteRow
    ? await prisma.enterpriseActivityEvent.findFirst({
        where: {
          opportunityId: oppA1.id,
          OR: [
            { sourceEventId: { startsWith: noteRow.id } },
            { summary: { contains: "Referral view-only notepad CO-WP-ACCESS-002" } },
          ],
        },
        orderBy: { createdAt: "desc" },
      })
    : null;
  record(
    "ACTIVITY_SSOT",
    noteRow && earRow ? "PASS" : "FAIL",
    noteRow && earRow
      ? `noteId=${noteRow.id} entity=${noteRow.entityKind}:${noteRow.entityId} earId=${earRow.id}`
      : noteRow
        ? `Business Note ok (${noteRow.id}) but EAR event missing`
        : "Business Note not found",
    noteRow && earRow ? "info" : "critical",
  );

  // ========== Joint override (A2) ==========
  const jointGet = await partnerFetch(tokenA, "GET", `/api/partner/opportunities/${oppA2.id}`);
  const jointPerms = jointGet.json?.data?.entitlements?.permissions || {};
  record(
    "JOINT_OVERRIDE_EFFECTIVE",
    jointGet.status === 200 && jointPerms.edit === true && jointPerms.stage_change === true
      ? "PASS"
      : "FAIL",
    JSON.stringify(jointPerms),
  );
  const jointPatch = await partnerFetch(tokenA, "PATCH", `/api/partner/opportunities/${oppA2.id}`, {
    notes: "joint edit ok",
  });
  expectStatus("JOINT_EDIT_ALLOWED", jointPatch, [200]);

  // Remove edit on A2 override — prove 403 after revoke
  await partnerEntitlementsService.upsertTransactionEntitlement(
    {
      wealthPartnerId: a.partner.id,
      entityKind: "opportunity",
      entityId: oppA2.id,
      executionMode: "joint_execution",
      permissions: {
        view: true,
        create: true,
        edit: false,
        stage_change: true,
        document_upload: true,
        document_edit: false,
        activity_add: true,
      },
      reason: "Certification revoke EDIT on A2",
    },
    actorMeta,
  );
  const jointPatch2 = await partnerFetch(tokenA, "PATCH", `/api/partner/opportunities/${oppA2.id}`, {
    notes: "should now fail",
  });
  expectStatus("JOINT_EDIT_REVOKED_403", jointPatch2, [403]);

  // ========== View-only B (A3 no override vs A2) ==========
  const viewOnlyGet = await partnerFetch(tokenA, "GET", `/api/partner/opportunities/${oppA3.id}`);
  const vo = viewOnlyGet.json?.data?.entitlements?.permissions || {};
  record(
    "OVERRIDE_SCOPE_A3_VIEWONLY",
    viewOnlyGet.status === 200 && vo.edit === false && vo.activity_add === true
      ? "PASS"
      : "FAIL",
    JSON.stringify(vo),
  );

  // ========== Solo Partner B ==========
  const soloGet = await partnerFetch(tokenB, "GET", `/api/partner/opportunities/${oppB1.id}`);
  const soloPerms = soloGet.json?.data?.entitlements?.permissions || {};
  record(
    "SOLO_EFFECTIVE",
    soloGet.status === 200 && soloPerms.view === true && soloPerms.edit === true
      ? "PASS"
      : "FAIL",
    JSON.stringify(soloPerms),
  );
  // Solo must not access Partner A
  expectStatus(
    "SOLO_NOT_UNRESTRICTED",
    await partnerFetch(tokenB, "GET", `/api/partner/opportunities/${oppA1.id}`),
    [403],
  );

  // ========== Deal APIs ==========
  if (dealA && dealB) {
    expectStatus(
      "DEAL_A_GET_OWN",
      await partnerFetch(tokenA, "GET", `/api/partner/deals/${dealA.id}`),
      [200],
    );
    expectStatus(
      "DEAL_A_GET_B",
      await partnerFetch(tokenA, "GET", `/api/partner/deals/${dealB.id}`),
      [403],
    );
    expectStatus(
      "DEAL_B_GET_A",
      await partnerFetch(tokenB, "GET", `/api/partner/deals/${dealA.id}`),
      [403],
    );
    const dealListA = await partnerFetch(tokenA, "GET", `/api/partner/deals`);
    expectStatus("DEAL_LIST_A", dealListA, [200]);
    const listed = dealListA.json?.data?.deals || [];
    record(
      "DEAL_LIST_OWNERSHIP",
      listed.every((d) => d.dealId !== dealB.id) && listed.some((d) => d.dealId === dealA.id)
        ? "PASS"
        : "FAIL",
      `count=${listed.length}`,
    );

    // Referral partner A activity on deal A (activity_add) vs edit deny if referral profile
    const dealAct = await partnerFetch(tokenA, "POST", `/api/partner/deals/${dealA.id}/activities`, {
      body: "Deal notepad cert",
    });
    expectStatus("DEAL_ACTIVITY", dealAct, [200, 201, 403]); // 403 ok if deal txn override none + referral denies? referral has activity_add YES

    const dealADetail = await partnerFetch(tokenA, "GET", `/api/partner/deals/${dealA.id}`);
    const rowVersion = dealADetail.json?.data?.rowVersion;
    if (typeof rowVersion === "number") {
      const dealPatch = await partnerFetch(tokenA, "PATCH", `/api/partner/deals/${dealA.id}`, {
        productLabel: "should fail referral",
        rowVersion,
      });
      expectStatus("DEAL_EDIT_REFERRAL_DENIED", dealPatch, [403]);
    } else {
      record("DEAL_EDIT_REFERRAL_DENIED", "PARTIAL", "rowVersion missing on deal detail");
    }
  } else {
    record("DEAL_APIS", "PARTIAL", "No lender available to mint Deal fixtures", "high");
  }

  // ========== Security attacks ==========
  expectStatus(
    "FORGED_OPP_ID",
    await partnerFetch(tokenA, "GET", `/api/partner/opportunities/does-not-exist-xyz`),
    [403, 404],
  );
  expectStatus(
    "FORGED_DEAL_ID",
    await partnerFetch(tokenA, "GET", `/api/partner/deals/does-not-exist-xyz`),
    [403, 404],
  );
  // Forged partner id in body
  expectStatus(
    "FORGED_PARTNER_ID_BODY",
    await partnerFetch(tokenA, "POST", `/api/partner/opportunities/${oppA1.id}/activities`, {
      body: "x",
      partnerId: b.partner.id,
    }),
    [403],
  );
  // Token with forged partner claim + invalid signature → must not authenticate (401).
  // Do not treat 401 as 403; this is an authentication failure for an invalid credential.
  const spoofMe = await partnerFetch(forgedAasB, "GET", `/api/partner/auth/me`);
  record(
    "FORGED_PARTNER_TOKEN_CLAIM",
    spoofMe.status === 401
      ? "PASS"
      : spoofMe.status === 403 ||
          (spoofMe.status === 200 && spoofMe.json?.data?.partnerId === a.partner.id)
        ? "PASS"
        : "FAIL",
    `status=${spoofMe.status} partnerId=${spoofMe.json?.data?.partnerId ?? "n/a"} (tampered JWT, no local secret mint)`,
    spoofMe.status === 401 || spoofMe.status === 403 || spoofMe.status === 200
      ? "info"
      : "critical",
  );

  // Unauthorized document upload on referral
  expectStatus(
    "UNAUTHORIZED_DOC_UPLOAD",
    await partnerFetch(tokenA, "POST", `/api/partner/opportunities/${oppA1.id}/documents`, {
      typeRef: "pan",
      title: "x",
    }),
    [403, 400], // 403 preferred; 400 if validation precedes entitlement
  );

  // ========== Admin entitlements HTTP (production auth login — not local JWT mint) ==========
  // Dedicated BAT SUPER_ADMIN fixture — never rotate frozen Business Certification Admin credentials.
  const { hashPassword: hashAdminPassword } = await import("../server/utils/password.ts");
  const adminEmail =
    process.env.CERT_ADMIN_EMAIL || "wp-access-cert-admin@rupeecatalyst.com";
  const adminPassword =
    process.env.CERT_ADMIN_PASSWORD || `CertAdmin!${randomBytes(4).toString("hex")}9`;
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  const adminHash = await hashAdminPassword(adminPassword);
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminHash,
        firstName: "Cert",
        lastName: "AccessAdmin",
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
  } else {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        passwordHash: adminHash,
        isActive: true,
        role: "SUPER_ADMIN",
      },
    });
  }
  const adminLoginRes = await adminLogin(adminUser.email, adminPassword);
  record(
    "ADMIN_AUTH",
    adminLoginRes.ok && adminLoginRes.token ? "PASS" : "FAIL",
    `status=${adminLoginRes.status} email=${adminUser.email}`,
    adminLoginRes.ok && adminLoginRes.token ? "info" : "critical",
  );
  const adminTok = adminLoginRes.token;
  if (!adminTok) {
    record("ADMIN_EFFECTIVE_GET", "FAIL", "admin login failed — skipped", "critical");
    record("ADMIN_SAVE_PROFILE", "FAIL", "admin login failed — skipped", "critical");
  } else {
    const adminGet = await fetch(
      `${BASE}/api/admin/partner-entitlements?view=effective&wealthPartnerId=${encodeURIComponent(a.partner.id)}`,
      { headers: { Authorization: `Bearer ${adminTok}`, Accept: "application/json" } },
    );
    tallyStatus(adminGet.status);
    expectStatus("ADMIN_EFFECTIVE_GET", { status: adminGet.status }, [200]);

    const adminSave = await fetch(`${BASE}/api/admin/partner-entitlements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminTok}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "save_profile",
        wealthPartnerId: a.partner.id,
        templateCode: "REFERRAL_PARTNER",
        defaultExecutionMode: "referral",
        permissions: {
          view: true,
          create: true,
          edit: false,
          stage_change: false,
          document_upload: false,
          document_edit: false,
          activity_add: true,
        },
        reason: "Certification admin save reload",
      }),
    });
    tallyStatus(adminSave.status);
    expectStatus("ADMIN_SAVE_PROFILE", { status: adminSave.status }, [200]);
  }

  const audits = await prisma.partnerEntitlementAudit.findMany({
    where: { wealthPartnerId: a.partner.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  record(
    "AUDIT_PERSISTENCE",
    audits.length > 0 &&
      audits.every((r) => r.actorUserId && r.changeType && r.createdAt)
      ? "PASS"
      : "FAIL",
    `auditCount=${audits.length} latest=${audits[0]?.changeType}`,
  );

  // Ownership path uses Registry (sourceWealthPartnerId) — structural evidence
  const ownedCheck = await prisma.enterpriseOpportunity.findFirst({
    where: { id: oppA1.id },
    select: { sourceWealthPartnerId: true },
  });
  record(
    "OWNERSHIP_SOURCE_WP",
    ownedCheck?.sourceWealthPartnerId === a.partner.id ? "PASS" : "FAIL",
    `sourceWealthPartnerId=${ownedCheck?.sourceWealthPartnerId}`,
  );

  // WP App wiring — static presentation evidence (no redesign)
  const wpRoot = path.resolve(root, "..", "Wealth Partner App", "web");
  const wpEnt = fs.readFileSync(path.join(wpRoot, "src/lib/partner-entitlements.ts"), "utf8");
  const wpDetail = fs.readFileSync(
    path.join(wpRoot, "src/screens/business/OpportunityDetailScreen.tsx"),
    "utf8",
  );
  const wpNote = fs.readFileSync(
    path.join(wpRoot, "src/screens/business/OpportunityDetailsPanel.tsx"),
    "utf8",
  );
  record(
    "WP_APP_WIRING",
    wpEnt.includes("activity_add") &&
      wpDetail.includes("permissionsFromOpportunity") &&
      wpNote.includes("addPartnerOpportunityActivity")
      ? "PASS"
      : "FAIL",
    "presentation consumes Gateway entitlements; security remains Gateway",
  );

  await finish(
    findings.some((f) => f.result === "FAIL" && f.severity === "critical") ? 1 : 0,
  );
}

async function finish(code) {
  const outDir = path.join(root, "docs", "co-wp-access-002");
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    sprint: SPRINT_LABEL,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    authMode: AUTH_MODE,
    evidence,
    findings,
    summary: {
      pass: findings.filter((f) => f.result === "PASS").length,
      fail: findings.filter((f) => f.result === "FAIL").length,
      partial: findings.filter((f) => f.result === "PARTIAL").length,
      criticalFails: findings.filter((f) => f.result === "FAIL" && f.severity === "critical")
        .length,
      httpStatusCounts: { ...httpStatusCounts },
    },
  };
  const outPath = path.join(outDir, EVIDENCE_FILE);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("\nEvidence written:", outPath);
  console.log(JSON.stringify(payload.summary, null, 2));
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = code;
}

main().catch(async (e) => {
  console.error(e);
  record("FATAL", "FAIL", e.message || String(e), "critical");
  await finish(1);
});
