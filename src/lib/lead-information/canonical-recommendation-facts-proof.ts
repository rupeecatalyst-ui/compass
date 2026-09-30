/**
 * CHANAKYA Phase A — canonical Opportunity facts + Lead Information capture.
 * No database. Does not apply a migration.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { emptyLeadInformationForm } from "@/constants/lead-information-workspace";
import { formFromOpportunity, buildLeadInformationPatchBody } from "@/lib/lead-information/form-helpers";
import { validateLeadInformationForm } from "@/lib/lead-information/validate-lead-information";
import {
  canonicalFactsForLeadInformation,
  parseCanonicalRecommendationFactBody,
  storedCanonicalDate,
} from "@/lib/lead-information/canonical-recommendation-facts";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const checks: Array<[string, boolean]> = [];
function check(name: string, ok: boolean) {
  checks.push([name, ok]);
  if (!ok) console.error("FAIL", name);
}

function baseForm() {
  return {
    ...emptyLeadInformationForm(),
    productCode: "HOME_LOAN",
    productLabel: "Home Loan",
    requestedAmount: "50000000",
    transactionType: "fresh",
    lendingType: "secured",
    businessSource: "direct",
    employmentTypeCode: "salaried",
    approxCibilScore: "750_799",
    cityLabel: "Pune",
    stateLabel: "Maharashtra",
    requestedTenureMonths: "240",
    monthlyIncomeRupees: "80000",
    existingMonthlyObligationsRupees: "0",
    propertyValueRupees: "9000000",
    propertyCategory: "residential",
    constructionStatus: "ready",
    residency: "resident",
  };
}

const salaried = validateLeadInformationForm(baseForm(), { requireMandatory: true });
check("salaried home loan facts accepted", salaried.valid && salaried.requirementReady);

const saved = buildLeadInformationPatchBody(baseForm(), 1, {});
check("requested tenure stored in months", saved.requestedTenureMonths === 240);
check("zero obligations remains declared", saved.existingMonthlyObligationsRupees === 0);

const missingObligations = buildLeadInformationPatchBody(
  { ...baseForm(), existingMonthlyObligationsRupees: "" },
  1,
  {},
);
check("missing obligations remains null", missingObligations.existingMonthlyObligationsRupees === null);

const nullOpp = validateLeadInformationForm(
  {
    ...baseForm(),
    requestedTenureMonths: "",
    monthlyIncomeRupees: "",
    existingMonthlyObligationsRupees: "",
    propertyValueRupees: "",
    propertyCategory: "",
    constructionStatus: "",
    residency: "",
  },
  { requireMandatory: true },
);
check("existing null opportunity facts remain valid", nullOpp.valid && nullOpp.requirementReady);

const reopened = formFromOpportunity({
  id: "opp-1",
  productCode: "HOME_LOAN",
  productLabel: "Home Loan",
  requestedAmount: 50_00_00_000,
  transactionType: "fresh",
  employmentTypeCode: "salaried",
  cityLabel: "Pune",
  stateLabel: "Maharashtra",
  sourceCode: "direct",
  requestedTenureMonths: 240,
  monthlyIncomeRupees: 80000,
  existingMonthlyObligationsRupees: 0,
  propertyValueRupees: 9000000,
  propertyCategory: "residential",
  constructionStatus: "ready",
  residency: "resident",
  lendingExtension: { approxCibilScore: "750_799", lendingType: "secured", btAmount: 1200000 },
} as EnterpriseOpportunityApiRecord);
check(
  "edit reopen restores canonical values",
  reopened.requestedTenureMonths === "240" &&
    reopened.monthlyIncomeRupees === "80000" &&
    reopened.existingMonthlyObligationsRupees === "0" &&
    reopened.propertyValueRupees === "9000000" &&
    reopened.propertyCategory === "residential" &&
    reopened.cityLabel === "Pune" &&
    reopened.stateLabel === "Maharashtra",
);

const contaminated = buildLeadInformationPatchBody(
  {
    ...baseForm(),
    currentRoiPercent: "9.1",
    currentHomeLoanEmiRupees: "42000",
    remainingTenureMonths: "180",
    loanStartDate: "2020-01-15",
    repaymentTrack: "yes",
    delayedEmiCount: "1",
  },
  1,
  { btAmount: 100, btInstitutionId: "lender-1", btInstitutionName: "Bank" },
);
check(
  "home loan does not persist hlbt-only facts",
  contaminated.currentRoiPercent === null &&
    contaminated.currentHomeLoanEmiRupees === null &&
    contaminated.remainingTenureMonths === null &&
    contaminated.loanStartDate === null &&
    contaminated.repaymentTrack === null &&
    contaminated.delayedEmiCount === null &&
    contaminated.lendingExtension?.btAmount == null,
);

const bt = buildLeadInformationPatchBody(
  {
    ...baseForm(),
    productCode: "HOME_LOAN_BT",
    transactionType: "balance_transfer",
    btAmount: "2500000",
    btInstitutionId: "lender-1",
    btInstitutionName: "Bank",
    currentRoiPercent: "8.5",
    currentHomeLoanEmiRupees: "41000",
    remainingTenureMonths: "168",
    loanStartDate: "2019-06-01",
    repaymentTrack: "yes",
    delayedEmiCount: "0",
  },
  1,
  {},
);
check(
  "hlbt journey stores hlbt facts and existing outstanding",
  bt.currentRoiPercent === 8.5 &&
    bt.currentHomeLoanEmiRupees === 41000 &&
    bt.remainingTenureMonths === 168 &&
    bt.loanStartDate === "2019-06-01" &&
    bt.repaymentTrack === "yes" &&
    bt.delayedEmiCount === 0 &&
    bt.lendingExtension?.btAmount === 2500000 &&
    bt.lendingExtension?.btInstitutionId === "lender-1",
);

const huge = validateLeadInformationForm(
  { ...baseForm(), requestedAmount: "5000000000" },
  { requireMandatory: true },
);
check("requested amount unlimited capture remains", huge.valid && huge.requirementReady);

check("zero tenure rejected", !validateLeadInformationForm({ ...baseForm(), requestedTenureMonths: "0" }).valid);
check("negative tenure rejected", !validateLeadInformationForm({ ...baseForm(), requestedTenureMonths: "-12" }).valid);
check("decimal tenure rejected", !validateLeadInformationForm({ ...baseForm(), requestedTenureMonths: "240.5" }).valid);
check("positive income accepted", canonicalFactsForLeadInformation({ ...baseForm(), monthlyIncomeRupees: "75000.5" }).ok);
check("invalid income rejected", !validateLeadInformationForm({ ...baseForm(), monthlyIncomeRupees: "-1" }).valid);
check("positive obligations accepted", buildLeadInformationPatchBody({ ...baseForm(), existingMonthlyObligationsRupees: "15000" }, 1, {}).existingMonthlyObligationsRupees === 15000);
check("negative obligations rejected", !validateLeadInformationForm({ ...baseForm(), existingMonthlyObligationsRupees: "-1" }).valid);
check("positive property value accepted", buildLeadInformationPatchBody(baseForm(), 1, {}).propertyValueRupees === 9000000);
check("zero property value rejected", !validateLeadInformationForm({ ...baseForm(), propertyValueRupees: "0" }).valid);
check("negative property value rejected", !validateLeadInformationForm({ ...baseForm(), propertyValueRupees: "-5" }).valid);

const hlbtForm = {
  ...baseForm(),
  productCode: "HOME_LOAN_BT",
  transactionType: "balance_transfer",
  btAmount: "2500000",
  btInstitutionId: "lender-1",
  btInstitutionName: "Bank",
};
check("negative roi rejected", !validateLeadInformationForm({ ...hlbtForm, currentRoiPercent: "-1" }).valid);
check("zero emi rejected", !validateLeadInformationForm({ ...hlbtForm, currentHomeLoanEmiRupees: "0" }).valid);
check("zero remaining tenure rejected", !validateLeadInformationForm({ ...hlbtForm, remainingTenureMonths: "0" }).valid);
check("zero delayed emi accepted", validateLeadInformationForm({ ...hlbtForm, delayedEmiCount: "0" }).valid);
check("negative delayed emi rejected", !validateLeadInformationForm({ ...hlbtForm, delayedEmiCount: "-1" }).valid);

function calendarDateRoundTrip(iso: string): boolean {
  const form = { ...hlbtForm, loanStartDate: iso };
  if (!validateLeadInformationForm(form).valid) return false;
  const patch = buildLeadInformationPatchBody(form, 1, {});
  if (patch.loanStartDate !== iso) return false;
  const server = parseCanonicalRecommendationFactBody({ loanStartDate: iso }, "salaried");
  if (!server.ok || !(server.patch.loanStartDate instanceof Date)) return false;
  const [year, month, day] = iso.split("-").map(Number);
  const stored = server.patch.loanStartDate;
  const utcMatches =
    stored.getUTCFullYear() === year &&
    stored.getUTCMonth() === month - 1 &&
    stored.getUTCDate() === day &&
    stored.toISOString().slice(0, 10) === iso;
  const reopened = formFromOpportunity({
    id: "opp-date",
    productCode: "HOME_LOAN_BT",
    loanStartDate: patch.loanStartDate,
    lendingExtension: {},
  } as EnterpriseOpportunityApiRecord).loanStartDate;
  const reopenedFromUtcMidnight = storedCanonicalDate(stored);
  return utcMatches && reopened === iso && reopenedFromUtcMidnight === iso;
}

check("calendar date 2026-01-01", calendarDateRoundTrip("2026-01-01"));
check("calendar date 2026-02-28", calendarDateRoundTrip("2026-02-28"));
check("calendar date 2028-02-29", calendarDateRoundTrip("2028-02-29"));
check(
  "invalid calendar date 2026-02-30 rejected",
  !validateLeadInformationForm({ ...hlbtForm, loanStartDate: "2026-02-30" }).valid &&
    parseCanonicalRecommendationFactBody({ loanStartDate: "2026-02-30" }, "salaried").ok === false,
);

const serverZero = parseCanonicalRecommendationFactBody({ requestedTenureMonths: 0 }, "salaried");
const serverNeg = parseCanonicalRecommendationFactBody({ requestedTenureMonths: -1 }, "salaried");
const serverDec = parseCanonicalRecommendationFactBody({ requestedTenureMonths: 240.5 }, "salaried");
const serverIncome = parseCanonicalRecommendationFactBody({ monthlyIncomeRupees: 80000 }, "salaried");
const serverBadIncome = parseCanonicalRecommendationFactBody({ monthlyIncomeRupees: 0 }, "salaried");
const serverOblZero = parseCanonicalRecommendationFactBody({ existingMonthlyObligationsRupees: 0 }, "salaried");
const serverOblNull = parseCanonicalRecommendationFactBody({ existingMonthlyObligationsRupees: null }, "salaried");
const serverOblNeg = parseCanonicalRecommendationFactBody({ existingMonthlyObligationsRupees: -1 }, "salaried");
const serverProp = parseCanonicalRecommendationFactBody({ propertyValueRupees: 1 }, "salaried");
const serverPropZero = parseCanonicalRecommendationFactBody({ propertyValueRupees: 0 }, "salaried");
check("server tenure positive integer", serverZero.ok === false && serverNeg.ok === false && serverDec.ok === false);
check("server income and obligations semantics", serverIncome.ok && serverBadIncome.ok === false && serverOblZero.ok && serverOblZero.patch.existingMonthlyObligationsRupees === 0 && serverOblNull.ok && serverOblNull.patch.existingMonthlyObligationsRupees === null && serverOblNeg.ok === false);
check("server property value semantics", serverProp.ok && serverPropZero.ok === false);

const selfEmployedIncome = parseCanonicalRecommendationFactBody(
  { monthlyIncomeRupees: 100000 },
  "self-employed-professional",
);
check("self-employed monthly income rejected", selfEmployedIncome.ok === false);
const selfEmployedForm = canonicalFactsForLeadInformation({
  ...baseForm(),
  employmentTypeCode: "self-employed-business",
  monthlyIncomeRupees: "100000",
});
check(
  "self-employed form does not store salaried income",
  selfEmployedForm.ok && selfEmployedForm.facts.monthlyIncomeRupees === null,
);

check("cibil stays in lending extension", saved.lendingExtension?.approxCibilScore === "750_799");
check("city and state stay on opportunity labels", saved.cityLabel === "Pune" && saved.stateLabel === "Maharashtra");
check("patch does not carry custom field values", !("customFieldValues" in saved));
check("patch does not carry date of birth", !("dateOfBirth" in saved));

const migration = readFileSync(
  path.join(repoRoot, "prisma/migrations/20260930153000_opportunity_canonical_recommendation_facts/migration.sql"),
  "utf8",
);
const migrationSql = migration
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
const migrationUpper = migrationSql.toUpperCase();
check(
  "migration additive nullable only",
  migration.includes("ADD COLUMN") &&
    !migrationUpper.includes("DROP ") &&
    !migrationUpper.includes("DELETE ") &&
    !migrationUpper.includes("UPDATE ") &&
    !migrationUpper.includes("DEFAULT") &&
    !migration.includes("NOT NULL"),
);
const opportunitySchema = readFileSync(path.join(repoRoot, "prisma/schema.prisma"), "utf8");
check(
  "loan start date column is calendar DATE",
  migrationSql.includes('"loan_start_date" DATE') &&
    !migrationSql.includes("TIMESTAMP") &&
    /loanStartDate\s+DateTime\?\s+@map\("loan_start_date"\)\s+@db\.Date/.test(opportunitySchema),
);
check(
  "migration does not touch assessment recommendation programme fcm or compass",
  !migrationSql.toLowerCase().includes("assessment") &&
    !migrationSql.toLowerCase().includes("recommendation") &&
    !migrationSql.toLowerCase().includes("field_control") &&
    !migrationSql.toLowerCase().includes("programme") &&
    !migrationSql.toLowerCase().includes("compass"),
);

const readiness = readFileSync(
  path.join(repoRoot, "server/services/opportunity-assessment/readiness.ts"),
  "utf8",
);
check(
  "self-employed recommendation remains fail closed",
  readiness.includes("SELF_EMPLOYED_INCOME_METHODOLOGY_UNSUPPORTED"),
);
const eligibility = readFileSync(
  path.join(repoRoot, "server/services/lender-recommendation/canonical-governed-eligibility.ts"),
  "utf8",
);
check("recommendation engine file untouched by this module", !eligibility.includes("canonical-recommendation-facts"));
const leadUi = readFileSync(
  path.join(repoRoot, "src/components/catalyst-one/lead-information/lead-information-workspace.tsx"),
  "utf8",
);
check("fcm operational collector remains", leadUi.includes("OperationalCustomFieldsCollector"));
check("lead capture does not write local storage", !leadUi.includes("localStorage"));
const compass = readFileSync(
  path.join(repoRoot, "server/services/compass-customer-gateway/compass-journey.service.ts"),
  "utf8",
);
check("compass still uses product amount ceiling", compass.includes("assertRequestedAmountWithinProductLimit"));

const failed = checks.filter(([, ok]) => !ok);
console.log(`LEAD_INFORMATION_CANONICAL_RECOMMENDATION_FACTS_PROOF checks=${checks.length} failed=${failed.length}`);
if (failed.length) {
  for (const [name] of failed) console.error(name);
  process.exit(1);
}
