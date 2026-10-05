import assert from "node:assert/strict";
import { buildReviewDeclarationRows } from "../src/lib/declarable-journey-answers";

const fields = [
  { fieldId: "assessment:borrower.ageYears", label: "Your age", fieldType: "number", sequence: 4 },
  {
    fieldId: "assessment:borrower.residency",
    label: "Residency status",
    fieldType: "single_select",
    sequence: 5,
    options: [
      { value: "resident", label: "Resident" },
      { value: "nri", label: "NRI" },
      { value: "pio", label: "PIO" },
    ],
  },
  { fieldId: "propertyCity", label: "Property city", fieldType: "city", sequence: 8 },
  { fieldId: "propertyValueLabel", label: "Property value", fieldType: "currency", sequence: 14 },
];

const rows = buildReviewDeclarationRows(
  {
    loanAmount: 50_00_000,
    propertyValue: 75_00_000,
    monthlyIncome: 1_50_000,
    existingEmi: 0,
    outstandingLoanAmount: 40_00_000,
    annualTurnover: 2_00_00_000,
    projectCost: 10_00_00_000,
    fieldAnswers: {
      "assessment:borrower.ageYears": "35",
      "assessment:borrower.residency": "resident",
      propertyCity: "mumbai-mh",
    },
    fieldLabels: { propertyCity: "Mumbai, Maharashtra" },
  },
  fields,
);

assert.equal(rows.find((row) => row.id === "assessment:borrower.ageYears")?.value, "35");
assert.equal(rows.find((row) => row.id === "assessment:borrower.residency")?.value, "Resident");
assert.equal(rows.find((row) => row.id === "propertyCity")?.value, "Mumbai, Maharashtra");
assert.equal(rows.some((row) => row.value.includes("75,00,000")), false);
assert.equal(rows.some((row) => row.id === "propertyState"), false);
assert.equal(rows.some((row) => /constitution|fresh/i.test(row.label)), false);

const unanswered = buildReviewDeclarationRows(
  {
    loanAmount: 50_00_000,
    propertyValue: 75_00_000,
    monthlyIncome: 1_50_000,
    existingEmi: 0,
    outstandingLoanAmount: 40_00_000,
    annualTurnover: 2_00_00_000,
    projectCost: 10_00_00_000,
    fieldAnswers: {},
  },
  fields,
);
assert.equal(unanswered.length, 0);

console.log("HOME_LOAN v2 review provenance proof passed");
