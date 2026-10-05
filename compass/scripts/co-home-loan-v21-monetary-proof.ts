import assert from "node:assert/strict";
import { buildCompassAnswersPayload, buildReviewDeclarationRows } from "../src/lib/declarable-journey-answers";
import {
  commitGovernedMonetaryAnswer,
  governedMonetaryVisualRupees,
  isGovernedMonetaryField,
} from "../src/lib/governed-monetary-answer";

const min = 10_00_000;
const max = 10_00_00_000;
const visual = governedMonetaryVisualRupees({
  fieldId: "requestedAmountLabel",
  min,
  max,
});

assert.equal(commitGovernedMonetaryAnswer({ touched: false, value: visual, min, max }), null);
assert.equal(commitGovernedMonetaryAnswer({ touched: true, value: 10_000_000, min, max }), "10000000");
assert.equal(commitGovernedMonetaryAnswer({ touched: true, value: 10_000_000.4, min, max }), "10000000");
assert.equal(commitGovernedMonetaryAnswer({ touched: true, value: max + 1, min, max }), null);

const propertyVisual = governedMonetaryVisualRupees({
  fieldId: "propertyValueLabel",
  min: 15_00_000,
  max: 10_00_00_000,
});
assert.equal(
  commitGovernedMonetaryAnswer({
    touched: false,
    value: propertyVisual,
    min: 15_00_000,
    max: 10_00_00_000,
  }),
  null,
);
assert.equal(
  commitGovernedMonetaryAnswer({
    touched: true,
    value: 82_50_000,
    min: 15_00_000,
    max: 10_00_00_000,
  }),
  "8250000",
);

for (const fieldId of ["monthlyIncomeLabel", "annualTurnoverLabel", "requestedAmountLabel", "propertyValueLabel"]) {
  assert.equal(isGovernedMonetaryField(fieldId), true);
  const position = governedMonetaryVisualRupees({ fieldId, min: 1, max: 10_00_00_00_000 });
  assert.equal(commitGovernedMonetaryAnswer({ touched: false, value: position, min: 1, max: 10_00_00_00_000 }), null);
}

const fields = [
  { fieldId: "requestedAmountLabel", label: "Required Amount", fieldType: "currency", sequence: 12 },
  { fieldId: "propertyValueLabel", label: "Property value", fieldType: "currency", sequence: 13 },
];
const untouched = buildReviewDeclarationRows(
  {
    loanAmount: visual,
    propertyValue: propertyVisual,
    monthlyIncome: 1_50_000,
    existingEmi: 0,
    outstandingLoanAmount: 40_00_000,
    annualTurnover: 2_00_00_000,
    projectCost: 10_00_00_000,
    fieldAnswers: {},
  },
  fields,
);
assert.equal(untouched.some((row) => row.id === "propertyValueLabel" || row.id === "requestedAmountLabel"), false);

const payload = buildCompassAnswersPayload(
  {
    loanAmount: visual,
    propertyValue: propertyVisual,
    monthlyIncome: 1_50_000,
    existingEmi: 0,
    outstandingLoanAmount: 40_00_000,
    annualTurnover: 2_00_00_000,
    projectCost: 10_00_00_000,
    fieldAnswers: { requestedAmountLabel: "10000000" },
    collectedFacts: {},
  },
  new Set(["loanAmount", "propertyValue", "requestedAmountLabel", "propertyValueLabel"]),
);
assert.equal(payload.requestedAmountLabel, "10000000");
assert.equal(payload.propertyValue, undefined);
assert.equal(payload.loanAmount, undefined);

console.log("HOME_LOAN v2.1 monetary answer proof passed");
