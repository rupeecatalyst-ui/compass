#!/usr/bin/env node
/**
 * CO-COMPASS-LOCAL-INTEGRATION-001 — safe non-production integration probe.
 * Requires: CATALYST_ONE_API_URL, COMPASS_GATEWAY_API_KEY, COMPASS_JOURNEY_SESSION_SECRET, DATABASE_URL
 */
const required = [
  "CATALYST_ONE_API_URL",
  "COMPASS_GATEWAY_API_KEY",
  "COMPASS_JOURNEY_SESSION_SECRET",
  "DATABASE_URL",
];

const missing = required.filter((k) => !process.env[k]?.trim());
if (missing.length > 0) {
  console.log("CO-COMPASS-LOCAL-INTEGRATION-001: BLOCKED");
  console.log(`Missing env: ${missing.join(", ")}`);
  console.log("Configure an isolated test database and gateway secrets before running.");
  process.exit(2);
}

const base = process.env.CATALYST_ONE_API_URL.replace(/\/$/, "");
const key = process.env.COMPASS_GATEWAY_API_KEY;
const testMobile = `9${String(Date.now()).slice(-9)}`;

async function call(path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("x-compass-gateway-key", key);
  const res = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
  const body = await res.json().catch(() => null);
  return { res, body };
}

function assertOk(step, condition, detail) {
  if (!condition) {
    console.error(`FAIL ${step}: ${detail}`);
    process.exit(1);
  }
  console.log(`PASS ${step}`);
}

const hlConfig = await call("/api/compass/journey/config?productCode=home-loan");
assertOk("1 HL config", hlConfig.res.ok && hlConfig.body?.success, JSON.stringify(hlConfig.body));
assertOk("1 IDC source", hlConfig.body?.data?.dtoSource === "enterprise_initial_data_collection", hlConfig.body?.data?.dtoSource);

const hlbtConfig = await call("/api/compass/journey/config?productCode=home-loan-balance-transfer");
assertOk("1b HLBT config", hlbtConfig.res.ok, hlbtConfig.body?.error?.message);
assertOk("1b product separation", hlbtConfig.body?.data?.enterpriseProductCode === "HOME_LOAN_BT", hlbtConfig.body?.data?.enterpriseProductCode);

const start = await call("/api/compass/journey/start", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    productCode: "home-loan",
    mobile: testMobile,
    city: "Mumbai",
    consentAccepted: true,
  }),
});
assertOk("2 start journey", start.res.ok && start.body?.data?.journeySessionToken, JSON.stringify(start.body));
const token = start.body.data.journeySessionToken;
const oppRef = start.body.data.opportunityRef;

const startAgain = await call("/api/compass/journey/start", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    productCode: "home-loan",
    mobile: testMobile,
    city: "Mumbai",
    consentAccepted: true,
  }),
});
assertOk("3 prospect idempotency", startAgain.body?.data?.opportunityRef === oppRef, `${oppRef} vs ${startAgain.body?.data?.opportunityRef}`);

const patch = await call("/api/compass/journey/answers", {
  method: "PATCH",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    answers: {
      loanAmount: 5000000,
      propertyValue: 8000000,
      propertyType: "ready",
      incomeType: "salaried",
      monthlyIncome: 150000,
      existingEmi: 0,
      city: "Mumbai",
      otpVerified: true,
    },
  }),
});
assertOk("4 patch answers", patch.res.ok, JSON.stringify(patch.body));

const analyze = await call("/api/compass/journey/analyze", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({}),
});
assertOk("5 analyze", analyze.res.ok, JSON.stringify(analyze.body));
const recStatus = analyze.body?.data?.recommendations?.status;
assertOk("6 recommendations state", ["ready", "pending"].includes(recStatus), recStatus);
assertOk("7 advantage boundary", analyze.body?.data?.advantage?.status === "not_available", analyze.body?.data?.advantage?.status);

const lod = await call("/api/compass/journey/lod", {
  headers: { authorization: `Bearer ${token}` },
});
assertOk("8 lod", lod.res.ok && Array.isArray(lod.body?.data?.items), JSON.stringify(lod.body));

console.log("CO-COMPASS-LOCAL-INTEGRATION-001: PARTIAL PASS (upload/submit steps require multipart runner — extend in staging)");
