#!/usr/bin/env node
/**
 * CO-COMPASS Advantage commercial engine — local engineering verifier.
 * Does not deploy, migrate production, or enable COMPASS_ADVANTAGE_COMMERCIAL_ENABLED.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) acc.push(full);
    else if (name.endsWith(".md") && dir.includes("compass")) acc.push(full);
  }
  return acc;
}

const {
  buildApprovedInitialSchedule,
  unavailableStatusWithoutSchedule,
} = await import("../src/constants/compass-advantage/approved-initial.ts");
const { calculateAdvantageFromSchedule } = await import("../src/lib/compass-advantage/calculate.ts");
const { validateScheduleForPublication, rangesOverlap } = await import("../src/lib/compass-advantage/validate.ts");
const { pickEffectiveSchedule, buildAdvantagePin, mergePinIntoSnapshot, pinAlreadySet } = await import(
  "../src/lib/compass-advantage/pin.ts"
);
const { multiplyAmountByRateRoundHalfUp } = await import("../src/lib/compass-advantage/exact-decimal.ts");

function scheduleFor(productCode, extra = {}) {
  const built = buildApprovedInitialSchedule(productCode);
  return {
    id: `${productCode}-v1`,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    ...built,
    ...extra,
  };
}

function calc(productCode, amount, schedule = scheduleFor(productCode)) {
  return calculateAdvantageFromSchedule({
    schedule,
    productCode,
    requestedLoanAmount: String(amount),
  });
}

const expected = [
  [50_00_000, "15000"],
  [1_00_00_000, "30000"],
  [1_50_00_000, "45000"],
  [1_99_99_999, "60000"],
  [2_00_00_000, "85000"],
  [2_50_00_000, "100000"],
  [5_00_00_000, "175000"],
  [10_00_00_000, "325000"],
];

for (const product of ["HOME_LOAN", "HOME_LOAN_BT"]) {
  for (const [amount, total] of expected) {
    const result = calc(product, amount);
    assert.equal(result.status, "ready", `${product} ${amount} status`);
    assert.equal(result.totalAdvantageAmount, total, `${product} ${amount} total`);
  }
  const below = calc(product, 1_99_99_999);
  assert.equal(below.fixedBenefitComponents.length, 0, `${product} below 2cr has no fixed benefits`);
  assert.equal(below.percentageBenefitAmount, "60000");
  const at2cr = calc(product, 2_00_00_000);
  assert.equal(at2cr.fixedBenefitComponents.length, 2, `${product} exactly 2cr is Range 2`);
  assert.equal(at2cr.matchedRange.rangeFromRupees, "20000000");
  assert.equal(at2cr.totalFixedBenefitAmount, "25000");
}

assert.equal(multiplyAmountByRateRoundHalfUp("10000000", "0.003"), "30000");
assert.doesNotMatch(String(0.1 + 0.2), /^0\.3$/);

const hl = scheduleFor("HOME_LOAN");
const hlbt = scheduleFor("HOME_LOAN_BT");
hlbt.ranges[1].fixedBenefits[0].amountRupees = "20000";
assert.equal(calc("HOME_LOAN", 2_00_00_000, hl).totalAdvantageAmount, "85000");
assert.equal(calc("HOME_LOAN_BT", 2_00_00_000, hlbt).totalAdvantageAmount, "90000");

const inactiveProduct = scheduleFor("HOME_LOAN", { advantageActive: false });
assert.equal(calc("HOME_LOAN", 50_00_000, inactiveProduct).status, "product_inactive");
assert.equal(calc("HOME_LOAN", 50_00_000, inactiveProduct).applies, false);

const uncovered = structuredClone(scheduleFor("HOME_LOAN"));
uncovered.ranges = [uncovered.ranges[1]];
assert.equal(calc("HOME_LOAN", 50_00_000, uncovered).status, "amount_not_in_range");

const inactiveRange = structuredClone(scheduleFor("HOME_LOAN"));
inactiveRange.ranges[0].active = false;
assert.equal(calc("HOME_LOAN", 50_00_000, inactiveRange).status, "amount_not_in_range");
assert.equal(calc("HOME_LOAN", 2_00_00_000, inactiveRange).status, "ready");

const draft = scheduleFor("HOME_LOAN", { status: "draft", versionNumber: 2, id: "draft" });
assert.equal(calc("HOME_LOAN", 50_00_000, draft).status, "not_available");
assert.equal(calc("HOME_LOAN", 50_00_000, draft).reason, "draft_not_effective");

const overlapping = structuredClone(scheduleFor("HOME_LOAN"));
overlapping.ranges[1].rangeFromRupees = "10000000";
overlapping.ranges[1].noUpperLimit = true;
overlapping.changeReason = "test";
const overlapValidation = validateScheduleForPublication(overlapping);
assert.equal(overlapValidation.ok, false);
assert.ok(overlapValidation.errors.some((msg) => /overlap/i.test(msg)));
assert.equal(rangesOverlap(overlapping.ranges[0], overlapping.ranges[1]), true);

const gapped = structuredClone(scheduleFor("HOME_LOAN"));
gapped.ranges[0].rangeToRupees = "10000000";
gapped.ranges[1].rangeFromRupees = "20000000";
gapped.changeReason = "intentional gap";
const gapValidation = validateScheduleForPublication(gapped);
assert.equal(gapValidation.ok, true);
assert.ok(gapValidation.uncoveredGaps.length >= 1);
assert.equal(calc("HOME_LOAN", 1_50_00_000, gapped).status, "amount_not_in_range");

const v1 = scheduleFor("HOME_LOAN", {
  id: "v1",
  versionNumber: 1,
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  effectiveTo: "2026-09-01T00:00:00.000Z",
});
const v2 = structuredClone(scheduleFor("HOME_LOAN"));
v2.id = "v2";
v2.versionNumber = 2;
v2.effectiveFrom = "2026-09-01T00:00:00.000Z";
v2.ranges[0].percentageRate = "0.004";
assert.equal(pickEffectiveSchedule([v1, v2], "HOME_LOAN", new Date("2026-08-31T12:00:00.000Z")).id, "v1");
assert.equal(pickEffectiveSchedule([v1, v2], "HOME_LOAN", new Date("2026-09-01T00:00:00.000Z")).id, "v2");
const oldCase = calc("HOME_LOAN", 1_00_00_000, v1);
assert.equal(oldCase.totalAdvantageAmount, "30000");
const newCase = calc("HOME_LOAN", 1_00_00_000, v2);
assert.equal(newCase.totalAdvantageAmount, "40000");

const pin = buildAdvantagePin({
  productCode: "HOME_LOAN",
  caseReceivedAt: new Date("2026-08-01T00:00:00.000Z"),
  schedule: v1,
});
const merged = mergePinIntoSnapshot({}, pin);
const second = mergePinIntoSnapshot(merged, buildAdvantagePin({
  productCode: "HOME_LOAN",
  caseReceivedAt: new Date("2026-09-02T00:00:00.000Z"),
  schedule: v2,
}));
assert.equal(pinAlreadySet(second).scheduleId, "v1");
assert.equal(pinAlreadySet(second).versionNumber, 1);

const nonePin = buildAdvantagePin({
  productCode: "HOME_LOAN",
  caseReceivedAt: new Date("2025-01-01T00:00:00.000Z"),
  schedule: null,
});
assert.equal(nonePin.noScheduleAtCreate, true);

assert.equal(unavailableStatusWithoutSchedule("HOME_LOAN"), "not_available");
assert.equal(unavailableStatusWithoutSchedule("HOME_LOAN_BT"), "not_available");
assert.equal(unavailableStatusWithoutSchedule("PERSONAL_LOAN"), "product_not_applicable");

const personal = calculateAdvantageFromSchedule({
  schedule: null,
  productCode: "PERSONAL_LOAN",
  requestedLoanAmount: "5000000",
  unavailableStatus: unavailableStatusWithoutSchedule("PERSONAL_LOAN"),
  unavailableReason: "product_not_applicable",
});
assert.equal(personal.status, "product_not_applicable");
assert.equal(personal.applies, false);

const missing = calculateAdvantageFromSchedule({
  schedule: null,
  productCode: "HOME_LOAN",
  requestedLoanAmount: "5000000",
  unavailableStatus: unavailableStatusWithoutSchedule("HOME_LOAN"),
  unavailableReason: "not_available",
});
assert.equal(missing.status, "not_available");

const publishedCopy = structuredClone(hl);
publishedCopy.status = "published";
assert.equal(publishedCopy.ranges[0].percentageRate, "0.003");

const scheduleSrc = readFileSync(join(root, "src/constants/compass-advantage/schedule.ts"), "utf8");
assert.doesNotMatch(scheduleSrc, /INDICATIVE_BPS|0\.50%|2_50_000|MIN_AMOUNT|MAX_AMOUNT/);
assert.doesNotMatch(
  readFileSync(join(root, "server/services/compass-customer-gateway/compass-advantage.service.ts"), "utf8"),
  /0\.0045|0\.0055|ltvFactor|incomeFactor|baseRate|INDICATIVE_BPS/,
);

const compassBanned =
  /0\.003\b|percentageRate|20000000|NOI charges benefit|INDICATIVE_BPS|2_50_000|calculateCompassAdvantageAmount|0\.50%/;
for (const file of walk(join(root, "compass/src"))) {
  if (file.endsWith(".md")) continue;
  const text = readFileSync(file, "utf8");
  assert.doesNotMatch(text, compassBanned, `COMPASS must not hardcode commercial calculation: ${file}`);
}

console.log("CO-COMPASS-ADVANTAGE-COMMERCIAL verify: PASS");
console.log(
  JSON.stringify(
    {
      cases: expected.map(([amount, total]) => ({ amount, total, hl: calc("HOME_LOAN", amount).totalAdvantageAmount })),
      twoCroreIsRange2: calc("HOME_LOAN", 2_00_00_000).matchedRange.rangeFromRupees,
      pinKeepsV1: pinAlreadySet(second).scheduleId,
    },
    null,
    2,
  ),
);
