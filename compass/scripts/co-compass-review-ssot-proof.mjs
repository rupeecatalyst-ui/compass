/**
 * Local proof: Review and the answer/submit payload do not declare the
 * discovery slider default of ₹75,00,000 when property value was not collected.
 * A genuinely supplied property value is declared instead.
 *
 * Does not start a journey, write production, or publish a product journey.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DISCOVERY_VISUAL_DEFAULTS,
  authoritativeRequestedAmountRupees,
  buildCompassAnswersPayload,
  buildReviewDeclarationRows,
  compassSubmitDeclarationBody,
  propertyValueRupeesFromPayload,
} from "../src/lib/declarable-journey-answers.ts";

const root = dirname(fileURLToPath(import.meta.url));
const discoverySource = readFileSync(join(root, "../src/config/home-loan-discovery.ts"), "utf8");
const propertyBlock = discoverySource.slice(discoverySource.indexOf("propertyValue: {"), discoverySource.indexOf("mobile: {"));
if (!propertyBlock.includes("default: 75_00_000")) {
  throw new Error("discovery propertyValue default drifted from 75_00_000");
}
if (DISCOVERY_VISUAL_DEFAULTS.propertyValue !== 75_00_000) {
  throw new Error("declarable visual default drifted from 75_00_000");
}

const fields = [
  { fieldId: "employmentTypeCode", label: "Employment Type", fieldType: "select", sequence: 1, options: [{ value: "salaried", label: "Salaried" }] },
  { fieldId: "employerName", label: "Employer", fieldType: "text", sequence: 2 },
  { fieldId: "occupation", label: "Occupation", fieldType: "text", sequence: 3 },
  { fieldId: "monthlyIncomeLabel", label: "Monthly Income", fieldType: "currency", sequence: 4 },
  { fieldId: "annualTurnoverLabel", label: "Annual Turnover", fieldType: "currency", sequence: 5 },
  { fieldId: "approxCibilScore", label: "Expected CIBIL", fieldType: "select", sequence: 6, options: [{ value: "750_799", label: "750 – 799" }] },
  { fieldId: "propertyCategory", label: "Property Category", fieldType: "select", sequence: 7, options: [{ value: "residential", label: "Residential" }] },
  { fieldId: "constructionStatus", label: "Construction Status", fieldType: "select", sequence: 8, options: [{ value: "ready", label: "Ready" }] },
  { fieldId: "propertyValueLabel", label: "Property Value", fieldType: "currency", sequence: 9 },
  { fieldId: "requestedAmountLabel", label: "Required Amount", fieldType: "currency", sequence: 10 },
];

const allowed = new Set([
  "loanAmount",
  "mobile",
  "otpVerified",
  "city",
  "approxCibilScore",
  "employmentTypeCode",
  "propertyType",
  "propertyValue",
  "incomeType",
  "monthlyIncome",
  "existingEmi",
  "displayName",
  "personalEmail",
  "employerName",
  "occupation",
  "monthlyIncomeLabel",
  "annualTurnoverLabel",
  "propertyCategory",
  "constructionStatus",
  "propertyValueLabel",
  "requestedAmountLabel",
]);

function g5cAnswers(extra = {}) {
  return {
    displayName: "STAGE1B FINAL CERTIFICATION",
    mobile: "9000710952",
    personalEmail: "stage1b.final.cert.202610050952@example.com",
    loanAmount: DISCOVERY_VISUAL_DEFAULTS.loanAmount,
    propertyValue: DISCOVERY_VISUAL_DEFAULTS.propertyValue,
    monthlyIncome: DISCOVERY_VISUAL_DEFAULTS.monthlyIncome,
    existingEmi: DISCOVERY_VISUAL_DEFAULTS.existingEmi,
    annualTurnover: DISCOVERY_VISUAL_DEFAULTS.annualTurnover,
    projectCost: DISCOVERY_VISUAL_DEFAULTS.projectCost,
    outstandingLoanAmount: DISCOVERY_VISUAL_DEFAULTS.outstandingLoanAmount,
    collectedFacts: {},
    fieldAnswers: {
      employmentTypeCode: "salaried",
      employerName: "STAGE1B SYNTHETIC EMPLOYER",
      monthlyIncomeLabel: "150000",
      approxCibilScore: "750_799",
      propertyCategory: "residential",
      constructionStatus: "ready",
      requestedAmountLabel: "5000000",
    },
    ...extra,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const absent = g5cAnswers();
const absentRows = buildReviewDeclarationRows(absent, fields);
const absentText = absentRows.map((row) => `${row.label}: ${row.value}`).join(" | ");
assert(!absentText.includes("75,00,000"), `uncollected property value leaked into review: ${absentText}`);
assert(!absentText.includes("Property Value"), `property value row shown without an answer: ${absentText}`);
assert(absentText.includes("STAGE1B FINAL CERTIFICATION"), absentText);
assert(absentText.includes("9000710952"), absentText);
assert(absentText.includes("stage1b.final.cert.202610050952@example.com"), absentText);
assert(absentText.includes("Salaried"), absentText);
assert(absentText.includes("STAGE1B SYNTHETIC EMPLOYER"), absentText);
assert(absentText.includes("₹1,50,000"), absentText);
assert(absentText.includes("750 – 799"), absentText);
assert(absentText.includes("Residential"), absentText);
assert(absentText.includes("Ready"), absentText);
assert(absentText.includes("₹50,00,000"), absentText);
assert(!absentText.includes("Occupation"), absentText);
assert(!absentText.includes("Annual Turnover"), absentText);
assert(!absentText.includes("Existing EMI"), absentText);

const absentPayload = buildCompassAnswersPayload(absent, allowed);
assert(absentPayload.propertyValue == null, "uncollected propertyValue was sent");
assert(absentPayload.propertyValueLabel == null, "uncollected propertyValueLabel was sent");
assert(absentPayload.requestedAmountLabel === "5000000", "requested amount was dropped");
assert(absentPayload.monthlyIncomeLabel === "150000", "monthly income label was dropped");
assert(absentPayload.monthlyIncome == null, "visual monthly-income default was sent");
assert(absentPayload.loanAmount == null, "visual loan-amount default was sent");
assert(absentPayload.existingEmi == null, "visual EMI default was sent");
assert(absentPayload.annualTurnover == null, "visual turnover default was sent");
assert(propertyValueRupeesFromPayload(absentPayload) == null, "propertyValueRupees would not stay null");
assert(authoritativeRequestedAmountRupees(absent) === 5000000, "requested amount did not come from the collected answer");

const supplied = g5cAnswers({
  fieldAnswers: {
    ...absent.fieldAnswers,
    propertyValueLabel: "8800000",
  },
});
const suppliedRows = buildReviewDeclarationRows(supplied, fields);
const suppliedText = suppliedRows.map((row) => `${row.label}: ${row.value}`).join(" | ");
assert(suppliedText.includes("Property Value: ₹88,00,000"), suppliedText);
assert(!suppliedText.includes("75,00,000"), suppliedText);
const suppliedPayload = buildCompassAnswersPayload(supplied, allowed);
assert(suppliedPayload.propertyValueLabel === "8800000", "supplied property value was dropped");
assert(suppliedPayload.propertyValue == null, "visual default was sent beside a real property value");
assert(propertyValueRupeesFromPayload(suppliedPayload) === 8800000, "supplied property value did not project");

const legacyConfirmed = g5cAnswers({
  propertyValue: 6400000,
  collectedFacts: { propertyValue: true },
});
const legacyText = buildReviewDeclarationRows(legacyConfirmed, fields).map((row) => row.value).join(" ");
assert(legacyText.includes("₹64,00,000"), legacyText);
assert(!legacyText.includes("75,00,000"), legacyText);
const legacyPayload = buildCompassAnswersPayload(legacyConfirmed, allowed);
assert(legacyPayload.propertyValue === 6400000, "confirmed legacy property value was dropped");

const submitBody = compassSubmitDeclarationBody({
  consentAccepted: true,
  lenderShareAccepted: true,
  declarationsAccepted: true,
});
assert(JSON.stringify(Object.keys(submitBody).sort()) === JSON.stringify(["consentAccepted", "declarationsAccepted", "lenderShareAccepted"]), "submit body gained answer fields");
assert(!JSON.stringify(submitBody).includes("7500000"), "submit body contains the property default");
assert(!JSON.stringify(submitBody).includes("propertyValue"), "submit body contains property value");

console.log("REVIEW_SSOT_PROOF pass");
console.log(JSON.stringify({
  absentReview: absentRows,
  absentPayloadKeys: Object.keys(absentPayload).sort(),
  propertyValueRupeesWhenUncollected: propertyValueRupeesFromPayload(absentPayload),
  suppliedReviewValue: suppliedRows.find((row) => row.id === "propertyValueLabel")?.value ?? null,
  requestedAmount: authoritativeRequestedAmountRupees(absent),
}, null, 2));
