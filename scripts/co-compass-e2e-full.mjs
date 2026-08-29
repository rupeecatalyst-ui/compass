#!/usr/bin/env node
/**
 * CO-COMPASS-E2E-FULL — isolated local HL + HLBT integration (Prisma dev Postgres only).
 * Requires env: CATALYST_ONE_API_URL, COMPASS_GATEWAY_API_KEY, COMPASS_JOURNEY_SESSION_SECRET, DATABASE_URL
 */
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const required = [
  "CATALYST_ONE_API_URL",
  "COMPASS_GATEWAY_API_KEY",
  "COMPASS_JOURNEY_SESSION_SECRET",
  "DATABASE_URL",
];
const missing = required.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error(`BLOCKED missing env: ${missing.join(", ")}`);
  process.exit(2);
}

const base = process.env.CATALYST_ONE_API_URL.replace(/\/$/, "");
const key = process.env.COMPASS_GATEWAY_API_KEY;
const sessionSecret = process.env.COMPASS_JOURNEY_SESSION_SECRET;
const dbUrl = process.env.DATABASE_URL || "";
const host = dbUrl ? new URL(dbUrl.replace(/^prisma\+/, "")).hostname : "localhost";
if (dbUrl && !["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(`BLOCKED: DATABASE_URL host ${host} is not local.`);
  process.exit(2);
}
if (/supabase\.com|pooler\.supabase/i.test(dbUrl)) {
  console.error("BLOCKED: remote Supabase DATABASE_URL is not permitted.");
  process.exit(2);
}

const prisma = new PrismaClient();
const results = [];
const evidence = {
  hl: {},
  hlbt: {},
  security: {},
  crossCustomer: {},
  idempotency: {},
  uploadRejection: {},
  authority: {},
};

function pass(step, detail = "") {
  results.push({ step, status: "PASS", detail });
  console.log(`PASS ${step}${detail ? ` — ${detail}` : ""}`);
}

function fail(step, detail) {
  results.push({ step, status: "FAIL", detail });
  console.error(`FAIL ${step} — ${detail}`);
  process.exit(1);
}

function journeyHeaders(token, extra = {}) {
  return { "x-compass-journey-token": token, ...extra };
}

async function call(path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("x-compass-gateway-key", key);
  const res = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { res, body };
}

function syntheticPdf(name) {
  const content = `%PDF-1.4\n% COMPASS E2E SYNTHETIC TEST ONLY — ${name} — ${randomUUID()}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF`;
  return new Blob([content], { type: "application/pdf" });
}

function syntheticPng(name) {
  const bytes = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
    "hex",
  );
  return new Blob([bytes], { type: "image/png" });
}

function craftJourneyToken(claims) {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

async function resolveE2eOrg() {
  const org = await prisma.organization.findUnique({ where: { slug: "compass-e2e-test" } });
  if (!org) fail("e2e org", "compass-e2e-test not found");
  return org;
}

async function resolveOpportunity(orgId, oppRef) {
  return prisma.enterpriseOpportunity.findFirst({
    where: { organizationId: orgId, opportunityNumber: oppRef },
    select: {
      id: true,
      primaryContactId: true,
      lifecycleStatus: true,
      snapshot: true,
      productCode: true,
      productLabel: true,
      requestedAmount: true,
      sourceCode: true,
      companyId: true,
      transactionType: true,
      cityLabel: true,
    },
  });
}

async function operationalCounts(orgId, opportunityId, contactId) {
  const [documents, blobs, earEvents, notifications, opportunities, contacts, deals] =
    await Promise.all([
      prisma.enterpriseTransactionDocument.count({
        where: { organizationId: orgId, opportunityId },
      }),
      prisma.enterpriseDocumentObjectBlob.count({
        where: { organizationId: orgId, opportunityId },
      }),
      prisma.enterpriseActivityEvent.count({
        where: { organizationId: orgId, opportunityId },
      }),
      prisma.enterpriseNotification.count({
        where: { organizationId: orgId, opportunityId },
      }),
      prisma.enterpriseOpportunity.count({
        where: { organizationId: orgId, id: opportunityId },
      }),
      contactId
        ? prisma.ecmContact.count({ where: { organizationId: orgId, id: contactId } })
        : Promise.resolve(0),
      prisma.enterpriseDeal.count({ where: { organizationId: orgId, opportunityId } }),
    ]);
  return {
    contacts,
    opportunities,
    loanFiles: deals,
    documents,
    blobs,
    earEvents,
    notifications,
    eteTasks: null,
    submissionAuditConsent: null,
  };
}

async function runProductScenario(productCode, label, extraAnswers = {}, options = {}) {
  const expectAdvantage = options.expectAdvantage !== false;
  const mobile = `9${String(Date.now()).slice(-9)}`;
  const cfg = await call(`/api/compass/journey/config?productCode=${productCode}`);
  if (!cfg.res.ok || cfg.body?.data?.dtoSource !== "enterprise_initial_data_collection") {
    fail(`${label} config`, JSON.stringify(cfg.body));
  }
  pass(`${label} config IDC`, cfg.body.data.enterpriseProductCode);

  const start = await call("/api/compass/journey/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productCode,
      mobile,
      displayName: `E2E Synthetic ${label}`,
      city: "Mumbai",
      consentAccepted: true,
    }),
  });
  if (!start.res.ok || !start.body?.data?.journeySessionToken) {
    fail(`${label} start`, JSON.stringify(start.body));
  }
  const token = start.body.data.journeySessionToken;
  const oppRef = start.body.data.opportunityRef;
  const contactRef = start.body.data.contactRef;
  pass(`${label} start`, `opp=${oppRef}`);

  const start2 = await call("/api/compass/journey/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productCode, mobile, city: "Mumbai", consentAccepted: true }),
  });
  if (start2.body?.data?.opportunityRef !== oppRef) {
    fail(`${label} contact dedup`, `${oppRef} vs ${start2.body?.data?.opportunityRef}`);
  }
  pass(`${label} contact dedup`);

  const answers = {
    loanAmount: productCode === "home-loan-balance-transfer" ? 4500000 : 5000000,
    propertyValue: 8000000,
    propertyType: "ready",
    incomeType: "salaried",
    monthlyIncome: 150000,
    existingEmi: productCode === "home-loan-balance-transfer" ? 35000 : 0,
    city: "Mumbai",
    otpVerified: true,
    ...(productCode === "home-loan-balance-transfer"
      ? { currentLender: "Synthetic Test Bank", outstandingLoanAmount: 3200000 }
      : {}),
    ...extraAnswers,
  };

  const patch = await call("/api/compass/journey/answers", {
    method: "PATCH",
    headers: journeyHeaders(token, { "content-type": "application/json" }),
    body: JSON.stringify({ answers }),
  });
  if (!patch.res.ok) fail(`${label} answers`, JSON.stringify(patch.body));
  pass(`${label} answers`);

  const analyze = await call("/api/compass/journey/analyze", {
    method: "POST",
    headers: journeyHeaders(token, { "content-type": "application/json" }),
    body: JSON.stringify({}),
  });
  if (!analyze.res.ok) fail(`${label} analyze`, JSON.stringify(analyze.body));
  const rec = analyze.body?.data?.recommendations;
  const adv = analyze.body?.data?.advantage;
  if (!rec || !["ready", "pending"].includes(rec.status)) {
    fail(`${label} recommendations state`, rec?.status);
  }
  if (rec.status === "ready" && rec.cards?.length) {
    const hasMock = rec.cards.some((c) => /mock|demo|placeholder/i.test(JSON.stringify(c)));
    if (hasMock) fail(`${label} no mock lenders`, "mock pattern detected");
  }
  pass(`${label} recommendations`, rec.status);
  if (expectAdvantage) {
    if (!adv || adv.dtoSource !== "enterprise_compass_advantage" || adv.status !== "not_available") {
      fail(`${label} advantage authority`, JSON.stringify(adv));
    }
    pass(`${label} advantage not_available (C1 authority)`);
  } else if (adv && adv.eligible) {
    fail(`${label} advantage must not be eligible`, JSON.stringify(adv));
  } else {
    pass(`${label} advantage not applicable`);
  }

  const lodBefore = await call("/api/compass/journey/lod", {
    headers: journeyHeaders(token),
  });
  if (!lodBefore.res.ok || !Array.isArray(lodBefore.body?.data?.items)) {
    fail(`${label} lod`, JSON.stringify(lodBefore.body));
  }
  pass(`${label} lod`, `${lodBefore.body.data.items.length} items`);

  const lodItem = lodBefore.body.data.items.find((i) => i.typeRef) || lodBefore.body.data.items[0];
  const typeRef = lodItem?.typeRef || "doc:identity:pan";

  const fd1 = new FormData();
  const f1 = new File([syntheticPdf("identity-test.pdf")], "identity-test.pdf", {
    type: "application/pdf",
  });
  fd1.append("file0", f1);
  fd1.append("file0:typeRef", typeRef);
  fd1.append("file0:relativePath", "identity-test.pdf");
  const up1 = await call("/api/compass/journey/documents", {
    method: "POST",
    headers: journeyHeaders(token),
    body: fd1,
  });
  if (!up1.res.ok || !up1.body?.data?.uploadedCount) {
    fail(`${label} single upload`, JSON.stringify(up1.body));
  }
  pass(`${label} single document upload`);

  const fdPng = new FormData();
  const png = new File([syntheticPng("mobile-capture.png")], "mobile-capture.png", {
    type: "image/png",
  });
  fdPng.append("file0", png);
  fdPng.append("file0:typeRef", typeRef);
  fdPng.append("file0:relativePath", "mobile-capture.png");
  const upPng = await call("/api/compass/journey/documents", {
    method: "POST",
    headers: journeyHeaders(token),
    body: fdPng,
  });
  if (!upPng.res.ok || !upPng.body?.data?.uploadedCount) {
    fail(`${label} png upload`, JSON.stringify(upPng.body));
  }
  pass(`${label} png image upload`);

  const fd2 = new FormData();
  const pkgFiles = [
    ["bank-statement-test.pdf", "statements/bank-statement-test.pdf"],
    ["income-test.pdf", "income/income-test.pdf"],
  ];
  pkgFiles.forEach(([name, rel], idx) => {
    const file = new File([syntheticPdf(name)], name, { type: "application/pdf" });
    fd2.append(`file${idx}`, file);
    fd2.append(`file${idx}:typeRef`, "doc:financial:bank_statement");
    fd2.append(`file${idx}:relativePath`, rel);
  });
  const up2 = await call("/api/compass/journey/documents", {
    method: "POST",
    headers: journeyHeaders(token),
    body: fd2,
  });
  if (!up2.res.ok || up2.body?.data?.uploadedCount < 2) {
    fail(`${label} folder upload`, JSON.stringify(up2.body));
  }
  pass(`${label} folder-style upload`, `${up2.body.data.uploadedCount} files`);

  const lodAfter =
    up2.body?.data?.lod ||
    (await call("/api/compass/journey/lod", { headers: journeyHeaders(token) })).body?.data;
  if (!lodAfter) fail(`${label} lod refresh`, "missing");
  pass(
    `${label} lod status`,
    `received=${lodAfter.receivedCount ?? "n/a"} pending=${lodAfter.mandatoryPending ?? "n/a"}`,
  );

  const submit = await call("/api/compass/journey/submit", {
    method: "POST",
    headers: journeyHeaders(token, { "content-type": "application/json" }),
    body: JSON.stringify({ consentAccepted: true, declarationsAccepted: true }),
  });
  if (!submit.res.ok || !submit.body?.data?.submitted) {
    fail(`${label} submit`, JSON.stringify(submit.body));
  }
  pass(`${label} submit`, submit.body.data.reference);

  const submit2 = await call("/api/compass/journey/submit", {
    method: "POST",
    headers: journeyHeaders(token, { "content-type": "application/json" }),
    body: JSON.stringify({ consentAccepted: true, declarationsAccepted: true }),
  });
  if (!submit2.res.ok) fail(`${label} submit idempotent`, JSON.stringify(submit2.body));
  pass(`${label} submit idempotent`, submit2.body?.data?.reference || submit.body.data.reference);

  const startAfterSubmit = await call("/api/compass/journey/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productCode, mobile, city: "Mumbai", consentAccepted: true }),
  });
  if (startAfterSubmit.res.ok) {
    fail(`${label} post-submit guard`, "expected active-application guard after submit");
  }
  pass(`${label} post-submit guard`, String(startAfterSubmit.body?.error?.code || startAfterSubmit.res.status));

  if (up1.body?.data?.uploadedCount < 1 || up2.body?.data?.uploadedCount < 2) {
    fail(`${label} document repository`, "upload counts insufficient");
  }
  pass(`${label} document repository`, "single + folder uploads accepted");

  return {
    mobile,
    token,
    oppRef,
    contactRef,
    productCode,
    enterpriseProductCode: cfg.body.data.enterpriseProductCode,
    transactionType:
      cfg.body.data.transactionType ||
      (productCode === "home-loan-balance-transfer" ? "balance_transfer" : "fresh"),
    recommendations: rec,
    advantage: adv,
    lodSource: lodBefore.body?.data?.dtoSource,
    submitReference: submit.body.data.reference,
    lodMandatoryPending: lodAfter.mandatoryPending ?? 0,
  };
}

async function proveUploadRejection(token, orgId, opportunityId) {
  const before = await operationalCounts(orgId, opportunityId, null);
  const lodBefore = await call("/api/compass/journey/lod", { headers: journeyHeaders(token) });
  const lodPendingBefore = lodBefore.body?.data?.mandatoryPending ?? 0;

  const fdBad = new FormData();
  fdBad.append(
    "file0",
    new File([Buffer.from("MZ")], "virus.exe", { type: "application/x-msdownload" }),
  );
  const badFile = await call("/api/compass/journey/documents", {
    method: "POST",
    headers: journeyHeaders(token),
    body: fdBad,
  });
  if (badFile.res.status < 400 || badFile.res.status >= 500) {
    fail("unsupported upload status", String(badFile.res.status));
  }
  pass("unsupported file upload rejected", String(badFile.res.status));

  const after = await operationalCounts(orgId, opportunityId, null);
  if (after.documents !== before.documents) {
    fail("unsupported upload document rows", `${before.documents} -> ${after.documents}`);
  }
  pass("unsupported upload zero document rows");

  if (after.blobs !== before.blobs) {
    fail("unsupported upload blob rows", `${before.blobs} -> ${after.blobs}`);
  }
  pass("unsupported upload zero blob rows");

  const lodAfter = await call("/api/compass/journey/lod", { headers: journeyHeaders(token) });
  const lodPendingAfter = lodAfter.body?.data?.mandatoryPending ?? 0;
  if (lodPendingAfter !== lodPendingBefore) {
    fail("unsupported upload lod change", `${lodPendingBefore} -> ${lodPendingAfter}`);
  }
  pass("unsupported upload lod unchanged");

  return { before, after, status: badFile.res.status };
}

async function crossCustomerIsolation(evidenceA, evidenceB, orgId) {
  const oppA = await resolveOpportunity(orgId, evidenceA.oppRef);
  const oppB = await resolveOpportunity(orgId, evidenceB.oppRef);
  if (!oppA || !oppB) fail("cross-customer resolve", "missing opportunity");

  const bSnapshotBefore = JSON.stringify(oppB.snapshot);
  const bCountsBefore = await operationalCounts(orgId, oppB.id, oppB.primaryContactId);

  const readBWithA = await call("/api/compass/journey/lod", {
    headers: journeyHeaders(evidenceA.token),
  });
  if (!readBWithA.res.ok) fail("contact A lod read", JSON.stringify(readBWithA.body));
  if (readBWithA.body?.data?.dtoSource !== "enterprise_compass_lod") {
    fail("contact A lod authority", readBWithA.body?.data?.dtoSource);
  }
  pass("contact A reads own lod only");

  const patchBWithA = await call("/api/compass/journey/answers", {
    method: "PATCH",
    headers: journeyHeaders(evidenceA.token, { "content-type": "application/json" }),
    body: JSON.stringify({ answers: { loanAmount: 1 } }),
  });
  if (!patchBWithA.res.ok) fail("contact A patch own answers", JSON.stringify(patchBWithA.body));

  const oppBAfterA = await resolveOpportunity(orgId, evidenceB.oppRef);
  if (JSON.stringify(oppBAfterA.snapshot) !== bSnapshotBefore) {
    fail("contact A patch affected B", "B snapshot changed");
  }
  pass("contact A patch does not mutate B");

  const exp = Math.floor(Date.now() / 1000) + 3600;
  const mismatchedContact = craftJourneyToken({
    sid: randomBytes(16).toString("hex"),
    journeyRef: `cjg_${randomBytes(6).toString("hex")}`,
    contactRef: evidenceA.contactRef,
    opportunityRef: evidenceB.oppRef,
    productCode: evidenceB.productCode,
    exp,
  });
  const mismatchedProduct = craftJourneyToken({
    sid: randomBytes(16).toString("hex"),
    journeyRef: `cjg_${randomBytes(6).toString("hex")}`,
    contactRef: evidenceB.contactRef,
    opportunityRef: evidenceB.oppRef,
    productCode: "home-loan",
    exp,
  });

  for (const [label, badToken] of [
    ["mismatched contactRef", mismatchedContact],
    ["mismatched productCode", mismatchedProduct],
  ]) {
    const lod = await call("/api/compass/journey/lod", { headers: journeyHeaders(badToken) });
    if (lod.res.ok) fail(`${label} lod`, "expected rejection");
    pass(`${label} lod rejected`, String(lod.res.status));

    const patch = await call("/api/compass/journey/answers", {
      method: "PATCH",
      headers: journeyHeaders(badToken, { "content-type": "application/json" }),
      body: JSON.stringify({ answers: { loanAmount: 2 } }),
    });
    if (patch.res.ok) fail(`${label} answers`, "expected rejection");
    pass(`${label} answers rejected`, String(patch.res.status));

    const fd = new FormData();
    fd.append("file0", new File([syntheticPdf("cross.pdf")], "cross.pdf", { type: "application/pdf" }));
    const upload = await call("/api/compass/journey/documents", {
      method: "POST",
      headers: journeyHeaders(badToken),
      body: fd,
    });
    if (upload.res.ok) fail(`${label} upload`, "expected rejection");
    pass(`${label} upload rejected`, String(upload.res.status));

    const submit = await call("/api/compass/journey/submit", {
      method: "POST",
      headers: journeyHeaders(badToken, { "content-type": "application/json" }),
      body: JSON.stringify({ consentAccepted: true, declarationsAccepted: true }),
    });
    if (submit.res.ok) fail(`${label} submit`, "expected rejection");
    pass(`${label} submit rejected`, String(submit.res.status));
  }

  const fdCross = new FormData();
  fdCross.append("file0", new File([syntheticPdf("a-only.pdf")], "a-only.pdf", { type: "application/pdf" }));
  const uploadA = await call("/api/compass/journey/documents", {
    method: "POST",
    headers: journeyHeaders(evidenceA.token),
    body: fdCross,
  });
  if (!uploadA.res.ok) fail("contact A upload", JSON.stringify(uploadA.body));

  const bCountsAfter = await operationalCounts(orgId, oppB.id, oppB.primaryContactId);
  if (bCountsAfter.documents !== bCountsBefore.documents) {
    fail("A upload created B documents", `${bCountsBefore.documents} -> ${bCountsAfter.documents}`);
  }
  pass("contact A upload does not create B documents");

  return { bCountsBefore, bCountsAfter };
}

async function proveOperationalIdempotency(orgId) {
  const mobile = `9${String(Date.now()).slice(-9)}`;
  const start = await call("/api/compass/journey/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productCode: "home-loan",
      mobile,
      displayName: "E2E Idempotency HL",
      city: "Mumbai",
      consentAccepted: true,
    }),
  });
  if (!start.res.ok) fail("idempotency start", JSON.stringify(start.body));
  const token = start.body.data.journeySessionToken;
  const oppRef = start.body.data.opportunityRef;
  const opp = await resolveOpportunity(orgId, oppRef);
  if (!opp) fail("idempotency opp", oppRef);

  await call("/api/compass/journey/answers", {
    method: "PATCH",
    headers: journeyHeaders(token, { "content-type": "application/json" }),
    body: JSON.stringify({
      answers: {
        loanAmount: 5000000,
        propertyValue: 8000000,
        propertyType: "ready",
        incomeType: "salaried",
        monthlyIncome: 150000,
        city: "Mumbai",
        otpVerified: true,
      },
    }),
  });

  const before = await operationalCounts(orgId, opp.id, opp.primaryContactId);
  const snapshotBefore = JSON.stringify(opp.snapshot);

  const submit1 = await call("/api/compass/journey/submit", {
    method: "POST",
    headers: journeyHeaders(token, { "content-type": "application/json" }),
    body: JSON.stringify({ consentAccepted: true, declarationsAccepted: true }),
  });
  if (!submit1.res.ok) fail("idempotency submit1", JSON.stringify(submit1.body));

  const afterFirst = await operationalCounts(orgId, opp.id, opp.primaryContactId);
  const oppAfterFirst = await resolveOpportunity(orgId, oppRef);

  const submit2 = await call("/api/compass/journey/submit", {
    method: "POST",
    headers: journeyHeaders(token, { "content-type": "application/json" }),
    body: JSON.stringify({ consentAccepted: true, declarationsAccepted: true }),
  });
  if (!submit2.res.ok) fail("idempotency submit2", JSON.stringify(submit2.body));

  const afterSecond = await operationalCounts(orgId, opp.id, opp.primaryContactId);

  const nonDecreasing = [
    ["contacts", before.contacts, afterSecond.contacts],
    ["opportunities", before.opportunities, afterSecond.opportunities],
    ["loanFiles", before.loanFiles, afterSecond.loanFiles],
    ["documents", before.documents, afterSecond.documents],
    ["blobs", before.blobs, afterSecond.blobs],
  ];
  for (const [name, startCount, endCount] of nonDecreasing) {
    if (endCount < startCount) fail(`idempotency ${name} decreased`, `${startCount} -> ${endCount}`);
  }
  pass("idempotency single-instance entities stable");

  const stableAfterResubmit = [
    ["contacts", afterFirst.contacts, afterSecond.contacts],
    ["opportunities", afterFirst.opportunities, afterSecond.opportunities],
    ["loanFiles", afterFirst.loanFiles, afterSecond.loanFiles],
    ["earEvents", afterFirst.earEvents, afterSecond.earEvents],
    ["notifications", afterFirst.notifications, afterSecond.notifications],
  ];
  for (const [name, first, second] of stableAfterResubmit) {
    if (second !== first) fail(`idempotency resubmit ${name}`, `${first} -> ${second}`);
  }
  pass("idempotency resubmit does not duplicate durable records");

  const snap =
    oppAfterFirst?.snapshot && typeof oppAfterFirst.snapshot === "object"
      ? oppAfterFirst.snapshot
      : null;
  const handoffAt = snap?.compassOperationalHandoffAt;
  const consentAt = snap?.compassSubmittedAt;
  if (!handoffAt || !consentAt) {
    fail("idempotency snapshot audit", "missing compassOperationalHandoffAt or compassSubmittedAt");
  }
  pass("idempotency submission audit snapshot recorded");

  return {
    before,
    afterFirst,
    afterSecond,
    lifecycleNote:
      "Loan File / Enterprise Deal are not created at requirement_captured; Deal creation occurs at Move to Deal / lender negotiation stage.",
    eteNote:
      "ETE tasks are generated in-memory via generateTasksForBusinessEvent; durable ETE persistence is guarded by snapshotHasOperationalHandoff idempotency.",
    snapshotBefore,
  };
}

async function securityTests(tokenA) {
  const badKeyRes = await fetch(`${base}/api/compass/journey/config?productCode=home-loan`, {
    headers: { "x-compass-gateway-key": "invalid-key" },
    cache: "no-store",
  });
  if (badKeyRes.status !== 401) fail("invalid gateway key", String(badKeyRes.status));
  pass("invalid gateway key rejected");

  const tampered = `${tokenA.slice(0, -4)}xxxx`;
  const badTok = await call("/api/compass/journey/lod", {
    headers: journeyHeaders(tampered),
  });
  if (badTok.res.status < 400) fail("tampered token", String(badTok.res.status));
  pass("tampered journey token rejected");

  const noConsent = await call("/api/compass/journey/submit", {
    method: "POST",
    headers: journeyHeaders(tokenA, { "content-type": "application/json" }),
    body: JSON.stringify({ consentAccepted: false, declarationsAccepted: false }),
  });
  if (noConsent.res.ok) fail("missing consent", "submit succeeded");
  pass("missing consent blocks submit");

  const startNoConsent = await call("/api/compass/journey/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productCode: "personal-loan",
      mobile: "9876543210",
      consentAccepted: false,
    }),
  });
  if (startNoConsent.res.ok) fail("start without consent", "succeeded");
  pass("start without consent rejected");

  const badMobile = await call("/api/compass/journey/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productCode: "personal-loan",
      mobile: "12",
      consentAccepted: true,
    }),
  });
  if (badMobile.res.ok) fail("invalid mobile", "succeeded");
  pass("invalid mobile rejected");

  const invalidProducts = [
    "vehicle-loan",
    "lease-rental-discounting",
    "equipment-finance",
    "gold-loan",
    "education-loan",
    "not-a-product",
    "lap",
  ];
  for (const p of invalidProducts) {
    const r = await call(`/api/compass/journey/config?productCode=${p}`);
    if (r.res.ok && r.body?.data?.advantage) {
      fail(`${p} advantage boundary`, "advantage returned");
    }
    pass(`${p} no gateway config/advantage`, String(r.res.status));
  }
}

async function main() {
  const health = await fetch(`${base}/api/compass/journey/config?productCode=home-loan`, {
    headers: { "x-compass-gateway-key": key },
  }).catch(() => null);
  if (!health?.ok) fail("C1 health", `status=${health?.status}`);
  pass("C1 gateway health");

  const org = await resolveE2eOrg();

  evidence.hl = await runProductScenario("home-loan", "HL");
  evidence.hlbt = await runProductScenario("home-loan-balance-transfer", "HLBT");

  const matrix = [
    ["personal-loan", "PL", { loanPurpose: "Medical" }, { expectAdvantage: false, enterprise: "PERSONAL_LOAN" }],
    [
      "business-loan",
      "BL",
      { companyName: "E2E Synthetic Business Pvt Ltd", constitution: "private_limited", annualTurnover: 25000000 },
      { expectAdvantage: false, enterprise: "BUSINESS_LOAN_UNSECURED", expectCompany: true },
    ],
    [
      "loan-against-property",
      "LAP",
      { propertyUsage: "self-occupied", propertyValue: 9000000 },
      { expectAdvantage: false, enterprise: "LAP" },
    ],
    [
      "working-capital",
      "WC",
      {
        facilityType: "cash_credit",
        companyName: "E2E Synthetic WC Traders",
        constitution: "proprietorship",
        annualTurnover: 18000000,
      },
      { expectAdvantage: false, enterprise: "WORKING_CAPITAL_SECURED", expectCompany: true },
    ],
    [
      "construction-finance",
      "CF",
      {
        projectCost: 50000000,
        companyName: "E2E Synthetic Builders LLP",
        constitution: "llp",
      },
      { expectAdvantage: false, enterprise: "CONSTRUCTION_FINANCE", expectCompany: true },
    ],
    [
      "project-finance",
      "PF",
      {
        projectCost: 120000000,
        companyName: "E2E Synthetic Project SPV",
        constitution: "private_limited",
      },
      { expectAdvantage: false, enterprise: "PROJECT_FINANCE", expectCompany: true },
    ],
  ];

  evidence.products = {};
  for (const [code, tag, extras, opts] of matrix) {
    evidence.products[tag] = await runProductScenario(code, tag, extras, opts);
    const row = await resolveOpportunity(org.id, evidence.products[tag].oppRef);
    if (!row) fail(`${tag} db opportunity`, "missing");
    if (row.productCode !== opts.enterprise) {
      fail(`${tag} product mapping`, `${row.productCode} != ${opts.enterprise}`);
    }
    if (row.sourceCode !== "website_compass") fail(`${tag} source`, row.sourceCode);
    if (!row.primaryContactId) fail(`${tag} contact relation`, "missing primaryContactId");
    if (opts.expectCompany && !row.companyId) fail(`${tag} company relation`, "missing companyId");
    pass(`${tag} database mapping`, row.productCode);
  }

  const plVsHl = evidence.products.PL.enterpriseProductCode;
  if (plVsHl === "HOME_LOAN" || evidence.products.PL.oppRef === evidence.hl.oppRef) {
    fail("PL/HL collision", `${plVsHl} ${evidence.products.PL.oppRef}`);
  }
  pass("PL never maps to HOME_LOAN");

  if (evidence.products.BL.enterpriseProductCode === "PERSONAL_LOAN") {
    fail("BL/PL collision", evidence.products.BL.enterpriseProductCode);
  }
  pass("BL never maps to PERSONAL_LOAN");

  if (evidence.hlbt.enterpriseProductCode !== "HOME_LOAN_BT") {
    fail("HLBT product separation", evidence.hlbt.enterpriseProductCode);
  }
  if (evidence.hl.oppRef === evidence.hlbt.oppRef) {
    fail("HL/HLBT collision", "same opportunity ref");
  }
  pass("HL/HLBT separation");

  const oppHlbt = await resolveOpportunity(org.id, evidence.hlbt.oppRef);
  evidence.uploadRejection = await proveUploadRejection(
    evidence.hlbt.token,
    org.id,
    oppHlbt.id,
  );

  await securityTests(evidence.hl.token);
  evidence.crossCustomer = await crossCustomerIsolation(evidence.hl, evidence.hlbt, org.id);
  evidence.idempotency = await proveOperationalIdempotency(org.id);

  evidence.authority = {
    config: "enterprise_initial_data_collection via buildPartnerOpportunityJourneyConfig",
    chanakya: "deriveChanakyaOpportunityRecommendationsFromOptions",
    advantage: "enterprise_compass_advantage / computeCompassAdvantage (C1 commercial engine placeholder)",
    lod: evidence.hl.lodSource || "enterprise_compass_lod",
    documents: "enterpriseTransactionDocumentService + postgres_blob adapter + compass upload policy",
    workflow: "executeCompassFirstSubmissionHandoff (EAR + ETE + notifications)",
    uploadPolicy: "src/constants/compass-customer-gateway/upload-policy.ts",
  };

  console.log("\nCO-COMPASS-E2E-FULL: PASS");
  const evidenceDir = join(process.cwd(), "docs", "_tmp-compass-e2e");
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(
    join(evidenceDir, "evidence.json"),
    JSON.stringify(
      {
        results,
        evidence,
        host,
        databaseFingerprint: createHash("sha256").update(dbUrl).digest("hex").slice(0, 16),
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
