#!/usr/bin/env node
/**
 * COMPASS customer identity — full name (mandatory), mobile (mandatory),
 * email (optional). Engineering gate. Does not call production APIs or Prisma.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const {
  parseCompassCustomerIdentity,
  parseCompassDisplayName,
  mergeResumedContactIdentity,
  shouldPersistContactName,
  shouldPersistPersonalEmail,
  COMPASS_PLACEHOLDER_CONTACT_NAME,
} = await import("../src/lib/compass-customer-gateway/customer-identity.ts");

const compassIdentity = await import("../compass/src/lib/customer-identity.ts");
const { getDiscoveryStepOrder, COMPASS_GATEWAY_PRODUCTS, getPersistedDiscoveryAnswerKeys } =
  await import("../compass/src/config/compass-lending-products.ts");

const EIGHT = [
  "home-loan",
  "home-loan-balance-transfer",
  "personal-loan",
  "loan-against-property",
  "business-loan",
  "working-capital",
  "construction-finance",
  "project-finance",
];

function assertSameParse(input, label) {
  const a = parseCompassCustomerIdentity(input);
  const b = compassIdentity.parseCompassCustomerIdentity(input);
  assert.equal(a.ok, b.ok, `${label} ok mismatch`);
  if (a.ok && b.ok) {
    assert.deepEqual(a.value, b.value, `${label} value mismatch`);
  } else if (!a.ok && !b.ok) {
    assert.equal(a.code, b.code, `${label} code mismatch`);
    assert.equal(a.message, b.message, `${label} message mismatch`);
  }
}

// --- 1. Valid full name + mobile + blank email ---
{
  const r = parseCompassCustomerIdentity({
    displayName: "  mary-jane o'brien  ",
    mobile: "9876543210",
    personalEmail: "",
  });
  assert.equal(r.ok, true, "case 1");
  assert.equal(r.value.displayName, "Mary-Jane O'Brien");
  assert.equal(r.value.mobile, "9876543210");
  assert.equal(r.value.personalEmail, null);
  assertSameParse(
    { displayName: "  mary-jane o'brien  ", mobile: "9876543210", personalEmail: "" },
    "case 1 compass",
  );
}

// --- 2. Valid full name + mobile + valid email ---
{
  const r = parseCompassCustomerIdentity({
    displayName: "Amit Sharma",
    mobile: "+91 98765 43210",
    personalEmail: "  Amit.Sharma@Example.COM ",
  });
  assert.equal(r.ok, true, "case 2");
  assert.equal(r.value.displayName, "Amit Sharma");
  assert.equal(r.value.mobile, "919876543210");
  assert.equal(r.value.personalEmail, "amit.sharma@example.com");
  const alias = parseCompassCustomerIdentity({
    displayName: "Amit Sharma",
    mobile: "9876543210",
    email: "amit@example.com",
  });
  assert.equal(alias.ok, true, "email alias");
  assert.equal(alias.value.personalEmail, "amit@example.com");
}

// --- 3. Blank full name ---
{
  for (const displayName of ["", "   ", null, undefined]) {
    const r = parseCompassCustomerIdentity({ displayName, mobile: "9876543210" });
    assert.equal(r.ok, false, `case 3 ${JSON.stringify(displayName)}`);
    assert.equal(r.code, "INVALID_DISPLAY_NAME");
  }
  const placeholder = parseCompassDisplayName(COMPASS_PLACEHOLDER_CONTACT_NAME);
  assert.equal(placeholder.ok, false, "placeholder name rejected");
}

// --- 4. Blank mobile ---
{
  const r = parseCompassCustomerIdentity({ displayName: "Amit Sharma", mobile: "" });
  assert.equal(r.ok, false, "case 4");
  assert.equal(r.code, "INVALID_MOBILE");
}

// --- 5. Invalid mobile ---
{
  const r = parseCompassCustomerIdentity({ displayName: "Amit Sharma", mobile: "12345" });
  assert.equal(r.ok, false, "case 5");
  assert.equal(r.code, "INVALID_MOBILE");
}

// --- 6. Invalid non-empty email ---
{
  const r = parseCompassCustomerIdentity({
    displayName: "Amit Sharma",
    mobile: "9876543210",
    personalEmail: "not-an-email",
  });
  assert.equal(r.ok, false, "case 6");
  assert.equal(r.code, "INVALID_EMAIL");
}

// --- 7–8 persist mappings (source + merge) ---
const journeyService = read("server/services/compass-customer-gateway/compass-journey.service.ts");
const startTypes = read("src/types/compass-customer-gateway.ts");
const client = read("compass/src/services/catalyst-one/client.ts");
const context = read("compass/src/components/home-loan-experience/discovery/discovery-context.tsx");
const snapshot = read("src/constants/compass-customer-gateway/snapshot-answers.ts");
const persistKeys = read("compass/src/config/compass-lending-products.ts");
const mobileStep = read("compass/src/components/home-loan-experience/discovery/discovery-journey.tsx");
const review = read("compass/src/components/home-loan-experience/discovery/discovery-review-step.tsx");

assert.match(startTypes, /displayName\?:/);
assert.match(startTypes, /personalEmail\?:/);
assert.match(journeyService, /parseCompassCustomerIdentity/);
assert.match(journeyService, /name: identity\.displayName/);
assert.match(journeyService, /personalEmail: identity\.personalEmail/);
assert.match(journeyService, /primaryContactName: contact\.name/);
assert.match(journeyService, /primaryContactEmail: contact\.personalEmail/);
assert.match(journeyService, /syncIdentityOntoOpportunity/);
assert.doesNotMatch(journeyService, /\|\|\s*"COMPASS Prospect"/);
assert.match(client, /displayName: input\.displayName/);
assert.match(client, /personalEmail: input\.personalEmail/);
assert.match(client, /displayName: answers\.displayName/);
assert.match(context, /displayName: answers\.displayName/);
assert.match(snapshot, /displayName/);
assert.match(snapshot, /personalEmail/);
assert.match(persistKeys, /"displayName"/);
assert.match(persistKeys, /"personalEmail"/);
assert.match(mobileStep, /setAnswer\("displayName"/);
assert.match(mobileStep, /setAnswer\("personalEmail"/);
assert.match(review, /Full name/);
assert.match(review, /answers\.displayName/);
assert.match(review, /Not Specified/);

// --- 9. Blank email does not overwrite existing ---
assert.equal(shouldPersistPersonalEmail("kept@example.com", null), false);
assert.equal(shouldPersistPersonalEmail("kept@example.com", "new@example.com"), false);
assert.equal(shouldPersistPersonalEmail("", "new@example.com"), true);
assert.equal(shouldPersistPersonalEmail(null, "new@example.com"), true);
{
  const merged = mergeResumedContactIdentity(
    { name: "Amit Sharma", personalEmail: "kept@example.com" },
    { displayName: "Rahul Verma", mobile: "9876543210", personalEmail: null },
  );
  assert.equal(merged.name, "Amit Sharma");
  assert.equal(merged.personalEmail, "kept@example.com");
  assert.equal(merged.emailChanged, false);
}

// --- 10–12 resume / no duplicate / no placeholder revert ---
assert.equal(shouldPersistContactName("COMPASS Prospect", "Amit Sharma"), true);
assert.equal(shouldPersistContactName("Amit Sharma", "Rahul Verma"), false);
assert.equal(shouldPersistContactName("", "Amit Sharma"), true);
assert.equal(shouldPersistContactName("Amit Sharma", ""), false);
{
  const legacy = mergeResumedContactIdentity(
    { name: "COMPASS Prospect", personalEmail: null },
    { displayName: "Amit Sharma", mobile: "9876543210", personalEmail: "amit@example.com" },
  );
  assert.equal(legacy.name, "Amit Sharma");
  assert.equal(legacy.personalEmail, "amit@example.com");
  assert.equal(legacy.nameChanged, true);
}
{
  const keep = mergeResumedContactIdentity(
    { name: "Amit Sharma", personalEmail: "amit@example.com" },
    { displayName: "Rahul Verma", mobile: "9876543210", personalEmail: "other@example.com" },
  );
  assert.equal(keep.name, "Amit Sharma", "case 11 keep existing name");
  assert.equal(keep.personalEmail, "amit@example.com");
}
assert.match(journeyService, /findReusableDraft/);
assert.match(journeyService, /findIdentityByMobile/);
const draftBeforeCreate = journeyService.indexOf("findReusableDraft");
const createAt = journeyService.indexOf("createOpportunity");
assert.ok(draftBeforeCreate > 0 && draftBeforeCreate < createAt, "case 12 reuse draft before create");

assert.equal(COMPASS_GATEWAY_PRODUCTS.length, 8);
assert.deepEqual([...COMPASS_GATEWAY_PRODUCTS].sort(), [...EIGHT].sort());

for (const code of EIGHT) {
  const steps = getDiscoveryStepOrder(code);
  assert.ok(steps.includes("mobile"), `${code} identity step`);
  assert.equal(steps.filter((s) => s === "mobile").length, 1, `${code} identity once`);
  const keys = getPersistedDiscoveryAnswerKeys(code);
  assert.ok(keys.includes("displayName"), `${code} persist displayName`);
  assert.ok(keys.includes("personalEmail"), `${code} persist personalEmail`);
}

assert.equal((mobileStep.match(/function MobileStep/g) || []).length, 1);
assert.equal((mobileStep.match(/case "mobile"/g) || []).length, 1);
const displayNameSets = mobileStep.match(/setAnswer\("displayName"/g) || [];
assert.equal(displayNameSets.length, 1, "name collected once");
assert.match(context, /startCompassJourney\(/);
assert.match(read("compass/src/app/api/journey/start/route.ts"), /catalystOneGateway\.startJourney/);
assert.doesNotMatch(
  read("compass/src/components/pages/loan-products-page-content.tsx"),
  /startCompassJourney|startJourneySession/,
);

// --- 13. Existing CIBIL, income, ceiling, LOD, Advantage journeys remain ---
assert.match(read("src/constants/compass-customer-gateway/snapshot-answers.ts"), /approxCibilScore/);
assert.match(persistKeys, /approxCibilScore/);
assert.match(review, /approxCibilScore/);
assert.match(read("scripts/co-compass-expected-cibil-field-verify.mjs"), /Expected CIBIL Score/);
assert.match(read("scripts/co-compass-income-conditionality-verify.mjs"), /monthlyIncome/);
assert.match(read("scripts/co-compass-requested-amount-limits-verify.mjs"), /getApprovedMaxRequestedAmountRupees/);
assert.match(read("scripts/co-compass-advantage-commercial-verify.mjs"), /calculateAdvantageFromSchedule/);
assert.match(read("compass/src/components/home-loan-experience/discovery/discovery-documents-step.tsx"), /lod/);
assert.match(mobileStep, /DiscoveryAdvantageStep|advantage/);

console.log("CO-COMPASS-CUSTOMER-IDENTITY verify: PASS");
