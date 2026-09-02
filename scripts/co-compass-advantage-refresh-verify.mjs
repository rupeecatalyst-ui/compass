#!/usr/bin/env node
/**
 * COMPASS Advantage — recalculate current result when requested amount changes.
 * Schedule/version pin stays first-write. Engineering gate only — no Prisma, no production records.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const { buildApprovedInitialSchedule } = await import("../src/constants/compass-advantage/approved-initial.ts");
const { calculateAdvantageFromSchedule } = await import("../src/lib/compass-advantage/calculate.ts");
const {
  buildAdvantagePin,
  mergePinIntoSnapshot,
  pinAlreadySet,
} = await import("../src/lib/compass-advantage/pin.ts");
const {
  shouldReuseCurrentAdvantageSnapshot,
  decideAdvantageSnapshotWrite,
  advantageLoanAmountsEqual,
} = await import("../src/lib/compass-advantage/current-snapshot.ts");
const { toCompassAdvantageDto } = await import("../src/lib/compass-advantage/map-dto.ts");

function scheduleFor(productCode) {
  const built = buildApprovedInitialSchedule(productCode);
  return {
    id: `${productCode}-v1-pinned`,
    versionNumber: 1,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    ...built,
  };
}

function calc(productCode, amount, schedule = scheduleFor(productCode)) {
  return calculateAdvantageFromSchedule({
    schedule,
    productCode,
    requestedLoanAmount: String(amount),
  });
}

function simulateCurrentSnapshot(productCode) {
  const schedule = scheduleFor(productCode);
  const pin = buildAdvantagePin({
    productCode,
    caseReceivedAt: new Date("2026-08-01T00:00:00.000Z"),
    schedule,
  });
  let current = null;
  const audit = [];
  function analyse(amount, requestStartedAt = new Date()) {
    const reuse = Boolean(
      current &&
        shouldReuseCurrentAdvantageSnapshot({
          existingRequestedLoanAmount: current.requestedLoanAmount,
          existingScheduleId: current.scheduleId,
          existingScheduleVersion: current.scheduleVersion,
          incomingRequestedLoanAmount: amount,
          pinScheduleId: pin.scheduleId,
          pinVersionNumber: pin.versionNumber,
        }),
    );
    if (reuse) {
      return { write: "reuse", dto: current, pin };
    }
    const result = calc(productCode, amount, schedule);
    const dto = toCompassAdvantageDto("home-loan", result, {
      calculatedAt: new Date().toISOString(),
    });
    const decision = decideAdvantageSnapshotWrite({
      hasExisting: Boolean(current),
      reuse: false,
      existingCalculatedAt: current?.calculatedAt ? new Date(current.calculatedAt) : null,
      requestStartedAt,
    });
    if (decision === "ignore-stale-request") {
      return { write: "ignore-stale-request", dto, pin, current };
    }
    const next = {
      requestedLoanAmount: result.requestedLoanAmount,
      totalAdvantageAmount: result.totalAdvantageAmount,
      percentageBenefitAmount: result.percentageBenefitAmount,
      fixedBenefitComponents: result.fixedBenefitComponents,
      scheduleId: result.scheduleId,
      scheduleVersion: result.scheduleVersion,
      calculatedAt: dto.calculatedAt,
    };
    if (decision === "replace") {
      audit.push({
        action: "calculation_refreshed",
        before: current.totalAdvantageAmount,
        after: next.totalAdvantageAmount,
      });
      current = next;
      return { write: "replace", dto, pin, current };
    }
    audit.push({ action: "calculation_created", after: next.totalAdvantageAmount });
    current = next;
    return { write: "create", dto, pin, current };
  }
  return { pin, analyse, getCurrent: () => current, getAudit: () => audit };
}

for (const product of ["HOME_LOAN", "HOME_LOAN_BT"]) {
  const session = simulateCurrentSnapshot(product);

  const first = session.analyse(2_00_00_000);
  assert.equal(first.write, "create", `${product} first write`);
  assert.equal(first.dto.totalAdvantageAmount, "85000");
  assert.equal(first.dto.requestedLoanAmount, "20000000");
  assert.equal(session.pin.scheduleId, `${product}-v1-pinned`);
  assert.equal(session.pin.versionNumber, 1);

  const same = session.analyse(2_00_00_000);
  assert.equal(same.write, "reuse", `${product} re-analyse same amount reuses current row`);
  assert.equal(session.getAudit().length, 1, `${product} re-analyse does not duplicate current/audit row`);
  assert.equal(session.getCurrent().totalAdvantageAmount, "85000");

  const refreshed = session.analyse(1_00_00_000);
  assert.equal(refreshed.write, "replace", `${product} amount change replaces current`);
  assert.equal(refreshed.dto.totalAdvantageAmount, "30000");
  assert.equal(refreshed.dto.requestedLoanAmount, "10000000");
  assert.notEqual(session.getCurrent().totalAdvantageAmount, "85000");
  assert.equal(session.getCurrent().totalAdvantageAmount, "30000");
  assert.equal(session.pin.versionNumber, 1, `${product} pin stays Version 1`);

  const evidence = simulateCurrentSnapshot(product);
  const high = evidence.analyse(2_03_94_262);
  assert.equal(high.dto.totalAdvantageAmount, "86183", `${product} 2,03,94,262`);
  const low = evidence.analyse(1_02_50_820);
  assert.equal(low.dto.totalAdvantageAmount, "30752", `${product} 1,02,50,820`);
  assert.notEqual(evidence.getCurrent().totalAdvantageAmount, "86183");
  assert.equal(evidence.getCurrent().requestedLoanAmount, "10250820");

  const threshold = simulateCurrentSnapshot(product);
  const below = threshold.analyse(1_99_99_999);
  assert.equal(below.dto.totalAdvantageAmount, "60000");
  assert.equal(below.dto.fixedBenefitComponents.length, 0, `${product} below 2cr percentage only`);
  const at = threshold.analyse(2_00_00_000);
  assert.equal(at.dto.totalAdvantageAmount, "85000");
  assert.equal(at.dto.fixedBenefitComponents.length, 2);
  const back = threshold.analyse(1_99_99_999);
  assert.equal(back.dto.totalAdvantageAmount, "60000");
  assert.equal(back.dto.fixedBenefitComponents.length, 0, `${product} drop below 2cr removes fixed`);
  assert.equal(threshold.getCurrent().totalAdvantageAmount, "60000");
}

{
  const stale = decideAdvantageSnapshotWrite({
    hasExisting: true,
    reuse: false,
    existingCalculatedAt: new Date("2026-09-02T12:00:01.000Z"),
    requestStartedAt: new Date("2026-09-02T12:00:00.000Z"),
  });
  assert.equal(stale, "ignore-stale-request");
  const replace = decideAdvantageSnapshotWrite({
    hasExisting: true,
    reuse: false,
    existingCalculatedAt: new Date("2026-09-02T11:59:00.000Z"),
    requestStartedAt: new Date("2026-09-02T12:00:00.000Z"),
  });
  assert.equal(replace, "replace");
  assert.equal(advantageLoanAmountsEqual("10250820", 1_02_50_820), true);
  assert.equal(advantageLoanAmountsEqual("20000000", "10000000"), false);
}

{
  const v1 = scheduleFor("HOME_LOAN");
  const pin = buildAdvantagePin({
    productCode: "HOME_LOAN",
    caseReceivedAt: new Date("2026-08-01T00:00:00.000Z"),
    schedule: v1,
  });
  const first = mergePinIntoSnapshot({}, pin);
  const v2Pin = buildAdvantagePin({
    productCode: "HOME_LOAN",
    caseReceivedAt: new Date("2026-09-02T00:00:00.000Z"),
    schedule: { ...v1, id: "HOME_LOAN-v2", versionNumber: 2 },
  });
  const second = mergePinIntoSnapshot(first, v2Pin);
  assert.equal(pinAlreadySet(second).scheduleId, v1.id);
  assert.equal(pinAlreadySet(second).versionNumber, 1);
}

const commercial = read("server/services/compass-advantage/compass-advantage-commercial.service.ts");
assert.match(commercial, /shouldReuseCurrentAdvantageSnapshot/);
assert.match(commercial, /calculation_refreshed/);
assert.match(commercial, /calculateForPin/);
assert.doesNotMatch(
  commercial,
  /if\s*\(\s*existing\s*\)\s*return\s*snapshotToDto/,
  "must not return the first snapshot for every later analyse",
);
assert.match(commercial, /latest\?\.calculatedAt|existingCalculatedAt/);

const analyze = read("server/services/compass-customer-gateway/compass-journey.service.ts");
assert.match(analyze, /toIntegerRupees\(row\.requestedAmount\)/);
assert.match(analyze, /findReusableDraft/);
assert.match(analyze, /parseCompassCustomerIdentity/);
assert.match(analyze, /primaryContactName: contact\.name/);
assert.match(analyze, /syncIdentityOntoOpportunity/);

const startClient = read("compass/src/services/catalyst-one/client.ts");
assert.match(startClient, /displayName: answers\.displayName/);
assert.match(startClient, /cache:\s*"no-store"/);
assert.match(startClient, /patchAnswers/);

const context = read("compass/src/components/home-loan-experience/discovery/discovery-context.tsx");
assert.match(context, /key === "loanAmount"/);
assert.match(context, /intelligenceRequestId/);
assert.match(context, /setIntelligence\(null\)/);

const analyzeRoute = read("compass/src/app/api/journey/analyze/route.ts");
assert.match(analyzeRoute, /Cache-Control/);
assert.match(analyzeRoute, /no-store/);

const card = read("compass/src/components/home-loan-experience/discovery/discovery-advantage-step.tsx");
const review = read("compass/src/components/home-loan-experience/discovery/discovery-review-step.tsx");
const copy = read("compass/src/config/home-loan-discovery.ts");
assert.match(copy, /Requested loan amount/);
assert.match(copy, /Your COMPASS Advantage/);
assert.match(
  copy,
  /You will be eligible for this COMPASS Advantage amount after successful disbursal of this transaction\./,
);
for (const [label, src] of [
  ["advantage card", card],
  ["review advantage", review],
]) {
  assert.doesNotMatch(src, /percentageBenefitAmount|percentageRate/, `${label} hides percentage row`);
  assert.doesNotMatch(src, /NOI charges benefit|Additional benefit/, `${label} hides fixed rows`);
  assert.doesNotMatch(src, /fixedBenefitComponents/, `${label} hides component breakup`);
  assert.doesNotMatch(src, /Rule version|scheduleVersion/, `${label} hides rule version`);
  assert.doesNotMatch(src, /customerExplanation/, `${label} hides formula explanation`);
  assert.doesNotMatch(src, /It is not a charge payable by you/, `${label}`);
  assert.doesNotMatch(src, /It is not a sanctioned offer/, `${label}`);
  assert.doesNotMatch(src, /credit-appraisal|documentation\/credit/, `${label}`);
  assert.match(src, /eligibilityNote|requestedAmountLabel|resultTitle/, `${label} uses approved copy`);
}

const dto = read("src/types/compass-customer-gateway.ts");
assert.match(dto, /percentageBenefitAmount/);
assert.match(dto, /fixedBenefitComponents/);
assert.match(dto, /requestedLoanAmount/);

const engineCalc = read("src/lib/compass-advantage/calculate.ts");
assert.match(engineCalc, /percentageBenefitAmount/);
assert.match(engineCalc, /fixedBenefitComponents/);

const admin = read("src/components/catalyst-one/organization/compass-advantage-rules-workspace.tsx");
assert.match(admin, /JSON\.stringify\(data\.result/);

const identity = read("scripts/co-compass-customer-identity-verify.mjs");
assert.match(identity, /parseCompassCustomerIdentity/);
assert.match(identity, /home-loan-balance-transfer/);

const approved = read("src/constants/compass-advantage/approved-initial.ts");
assert.match(approved, /versionNumber:\s*1/);
assert.doesNotMatch(approved, /versionNumber:\s*2/);

console.log("CO-COMPASS-ADVANTAGE-REFRESH verify: PASS");
console.log(
  JSON.stringify(
    {
      homeLoan2crThen1cr: ["85000", "30000"],
      homeLoanEvidenceAmounts: ["86183", "30752"],
      pinRemainsVersion1: true,
      currentRowReplacedInPlace: true,
    },
    null,
    2,
  ),
);
