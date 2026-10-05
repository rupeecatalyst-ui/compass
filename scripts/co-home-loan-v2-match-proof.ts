/**
 * Local HOME_LOAN v2 matching proof.
 * Uses a disposable file journey book. Does not open the production database,
 * publish v2, or change lender programmes.
 */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { projectRegistryProgrammeRecommendations } from "../server/services/compass-customer-gateway/compass-recommendations.service";
import { answersToSnapshotFields } from "../server/services/compass-customer-gateway/compass-opportunity-projection";
import {
  findCompassProductDefinition,
  projectPublicProgrammeMatchInput,
  resolveCityMasterIdentity,
} from "../src/lib/compass-customer-gateway/public-programme-match";
import type { PublishedLenderOption } from "../src/lib/enterprise-lender-registry/published-directory";
import { buildHomeLoanV2Draft } from "../src/lib/product-journey/home-loan-v2-draft";
import {
  hashJourneyDefinition,
  previewProductJourney,
  publishProductJourney,
  resolvePublishedJourney,
  saveProductJourneyDraft,
  validateProductJourneyDraft,
  type JourneyDraft,
  type JourneyFieldDraft,
} from "../src/lib/product-journey/publication";
import { configureProductJourneyStore, createFileProductJourneyStore } from "../src/lib/product-journey/store";
import { matchPublishedProgramme } from "../src/lib/product-programme-operations/match-published";
import type { EnterpriseLenderProgramRecord } from "../src/types/enterprise-lender-registry";

const organizationId = "org-home-loan-v2-local";
const actorId = "home-loan-v2-proof";
configureProductJourneyStore(
  "home-loan-v2-proof",
  createFileProductJourneyStore(join(mkdtempSync(join(tmpdir(), "hl-v2-")), "book.json")),
);

function field(input: Partial<JourneyFieldDraft> & Pick<JourneyFieldDraft, "fieldId" | "label">): JourneyFieldDraft {
  return {
    stageId: "recommendation",
    fieldType: "short_text",
    required: false,
    sequence: 1,
    purpose: "recommendation",
    includeOnReview: true,
    ...input,
  };
}

const salaried = { op: "equals" as const, fieldId: "employmentTypeCode", value: "salaried" };
const selfEmployed = {
  op: "or" as const,
  conditions: [
    { op: "equals" as const, fieldId: "employmentTypeCode", value: "self-employed-professional" },
    { op: "equals" as const, fieldId: "employmentTypeCode", value: "self-employed-business" },
  ],
};

const v1Draft: JourneyDraft = {
  productCode: "HOME_LOAN",
  productLabel: "Home Loan",
  lifecycle: "draft",
  previewed: false,
  publiclyEnabled: true,
  advantageEnabled: true,
  recommendationBinding: "governed_chanakya",
  consentVersion: "compass-consent-v1",
  lodSource: "opportunity_lod",
  mobileCapture: "required",
  otpVerification: "off",
  confirmation: {
    title: "Application received",
    body: "Your application reference is ready. Document requirements come from the Opportunity checklist.",
  },
  stages: [
    ["welcome", "welcome"],
    ["mobile", "mobile"],
    ["displayName", "name"],
    ["recommendation", "questions"],
    ["analysing", "analysing"],
    ["lenders", "lenders"],
    ["advantage", "advantage"],
    ["email", "email"],
    ["application", "questions"],
    ["review", "review"],
    ["documents", "documents"],
    ["confirmation", "confirmation"],
  ].map(([stageId, kind], index) => ({
    stageId,
    kind: kind as JourneyDraft["stages"][number]["kind"],
    label: stageId,
    sequence: index + 1,
  })),
  fields: [
    field({ fieldId: "employmentTypeCode", label: "Employment Type", fieldType: "single_select", required: true, sequence: 1 }),
    field({ fieldId: "employerName", label: "Employer", required: false, sequence: 2, visibleWhen: salaried }),
    field({ fieldId: "occupation", label: "Occupation", required: false, sequence: 3, visibleWhen: selfEmployed }),
    field({ fieldId: "monthlyIncomeLabel", label: "Monthly Income", fieldType: "currency", required: false, sequence: 4, requiredWhen: salaried }),
    field({ fieldId: "annualTurnoverLabel", label: "Annual Turnover", fieldType: "currency", required: false, sequence: 5, visibleWhen: selfEmployed }),
    field({ fieldId: "approxCibilScore", label: "Expected CIBIL Score", fieldType: "single_select", required: true, sequence: 6 }),
    field({ fieldId: "propertyCategory", label: "Property Category", fieldType: "single_select", required: true, sequence: 7 }),
    field({ fieldId: "constructionStatus", label: "Construction Status", fieldType: "single_select", required: true, sequence: 8 }),
    field({ fieldId: "propertyValueLabel", label: "Property Value", fieldType: "currency", required: false, sequence: 9 }),
    field({ fieldId: "requestedAmountLabel", label: "Required Amount", fieldType: "currency", required: true, sequence: 10 }),
  ],
};

async function main() {
await saveProductJourneyDraft(organizationId, v1Draft, actorId);
assert.equal((await validateProductJourneyDraft(organizationId, "HOME_LOAN", actorId)).ok, true);
assert.equal((await previewProductJourney(organizationId, "HOME_LOAN", {}, actorId)).ok, true);
const published = await publishProductJourney(organizationId, "HOME_LOAN", actorId);
assert.equal(published.ok, true);
if (!published.ok) throw new Error("local v1 publish failed");
const v1Hash = published.journey.configurationHash;
assert.equal(published.journey.journeyVersion, 1);
assert.equal(published.journey.fields.length, 10);
assert.equal(published.journey.stages.length, 12);
assert.equal(hashJourneyDefinition(published.journey), v1Hash);

const v2 = buildHomeLoanV2Draft(published.journey);
assert.equal(hashJourneyDefinition(published.journey), v1Hash);
assert.equal(v2.previewed, false);
assert.equal(v2.lifecycle, "draft");
assert.equal(v2.consentVersion, "compass-consent-v1");
assert.equal(v2.advantageEnabled, true);
assert.equal(v2.recommendationBinding, "governed_chanakya");
assert.equal(v2.lodSource, "opportunity_lod");
assert.deepEqual(
  v2.fields.map((item) => item.fieldId),
  [
    "employmentTypeCode",
    "employerName",
    "occupation",
    "assessment:borrower.ageYears",
    "assessment:borrower.residency",
    "propertyCategory",
    "constructionStatus",
    "propertyCity",
    "monthlyIncomeLabel",
    "annualTurnoverLabel",
    "approxCibilScore",
    "requestedAmountLabel",
    "propertyValueLabel",
  ],
);
const propertyValue = v2.fields.find((item) => item.fieldId === "propertyValueLabel");
assert.equal(propertyValue?.required, false);
assert.equal(v2.fields.find((item) => item.fieldId === "assessment:borrower.ageYears")?.required, true);
assert.equal(v2.fields.find((item) => item.fieldId === "assessment:borrower.ageYears")?.min, 18);
assert.equal(v2.fields.find((item) => item.fieldId === "assessment:borrower.ageYears")?.max, 80);
await saveProductJourneyDraft(organizationId, v2, actorId);
const pinned = await resolvePublishedJourney(organizationId, "HOME_LOAN", 1);
assert.equal(pinned?.journeyVersion, 1);
assert.equal(pinned?.fields.length, 10);
assert.equal(hashJourneyDefinition(pinned!), v1Hash);
assert.equal(pinned?.fields.some((item) => item.fieldId === "assessment:borrower.ageYears"), false);
const current = await resolvePublishedJourney(organizationId, "HOME_LOAN", null);
assert.equal(current?.journeyVersion, 1);
assert.equal(hashJourneyDefinition(current!), v1Hash);

const product = findCompassProductDefinition("HOME_LOAN");
assert.equal(product?.borrowerKind, "individual");
assert.equal(product?.transactionType, "fresh");
assert.equal(findCompassProductDefinition("Home Loan")?.enterpriseProductCode, "HOME_LOAN");

const persisted = answersToSnapshotFields({
  employmentTypeCode: "salaried",
  monthlyIncomeLabel: "200000",
  approxCibilScore: "750_799",
  propertyCategory: "residential",
  constructionStatus: "ready",
  requestedAmountLabel: "10000000",
  "assessment:borrower.ageYears": "35",
  "assessment:borrower.residency": "resident",
  propertyCity: "mumbai-mh",
});
assert.equal(persisted.borrowerFields.ageYears, "35");
assert.equal(persisted.borrowerFields.residency, "resident");
assert.equal(persisted.productFields.propertyCity, "mumbai-mh");
assert.equal(persisted.borrowerFields.propertyState, undefined);
assert.equal(persisted.productFields.propertyState, undefined);

const detail = {
  productCode: "HOME_LOAN",
  productLabel: "Home Loan",
  requiredAmountLabel: "10000000",
  borrowerFields: persisted.borrowerFields,
  productFields: persisted.productFields,
};
const matchInput = projectPublicProgrammeMatchInput(detail);
assert.deepEqual(
  {
    productCode: matchInput.productCode,
    employmentType: matchInput.employmentType,
    constitution: matchInput.constitution,
    transactionType: matchInput.transactionType,
    residency: matchInput.residency,
    state: matchInput.state,
    city: matchInput.city,
    propertyCategory: matchInput.propertyCategory,
    constructionStatus: matchInput.constructionStatus,
    cibil: matchInput.cibil,
    age: matchInput.age,
    loanAmountExact: matchInput.loanAmountExact,
  },
  {
    productCode: "HOME_LOAN",
    employmentType: "salaried",
    constitution: "individual",
    transactionType: "fresh",
    residency: "resident",
    state: "MH",
    city: "Mumbai",
    propertyCategory: "residential",
    constructionStatus: "ready",
    cibil: 750,
    age: 35,
    loanAmountExact: "10000000.00",
  },
);
assert.equal(resolveCityMasterIdentity("delhi-dl")?.stateCode, "DL");
assert.equal(resolveCityMasterIdentity("not-a-city"), null);

type ProgrammeShape = {
  code: string;
  label: string;
  lenderId: string;
  minAge: number;
  maxAge: number;
  minCibil: number;
  maxLoan: string;
  states: string[];
  residency: string[];
  transactions: string[];
  property: boolean;
};

const inventory: ProgrammeShape[] = [
  ["BASE_AXIS_HOME_LOAN", "Axis Bank — Home Loan — Salaried", "lender-axis", 21, 65, 700, "1000000000.00", ["PAN_INDIA"], ["resident"], [], true],
  ["BASE_BOI_HOME_LOAN", "Bank of India — Home Loan — Salaried", "lender-boi", 21, 75, 700, "1000000000.00", ["PAN_INDIA"], ["resident"], [], true],
  ["BASE_BOM_HOME_LOAN", "Bank of Maharashtra — Home Loan — Salaried", "lender-bom", 21, 75, 700, "1000000000.00", ["PAN_INDIA"], ["resident"], [], true],
  ["BASE_CBI_HOME_LOAN", "Central Bank of India — Home Loan — Salaried", "lender-cbi", 21, 75, 700, "1000000000.00", ["GJ", "KA", "MH"], ["resident", "nri", "pio"], ["fresh", "balance_transfer", "top_up", "bt_top_up"], false],
  ["BASE_HDFC_HOME_LOAN", "HDFC Bank — Home Loan — Salaried", "lender-hdfc", 21, 65, 700, "1000000000.00", ["PAN_INDIA"], ["resident", "nri", "pio"], ["fresh", "balance_transfer", "top_up", "bt_top_up"], false],
  ["BASE_HSBC_HOME_LOAN", "HSBC Bank — Home Loan — Salaried", "lender-hsbc", 21, 65, 700, "250000000.00", ["PAN_INDIA"], ["resident"], [], true],
  ["BASE_ICICI_HOME_LOAN", "ICICI Bank — Home Loan — Salaried", "lender-icici", 21, 65, 700, "1000000000.00", ["PAN_INDIA"], ["resident"], [], true],
  ["BASE_SARASWAT_HOME_LOAN", "Saraswat Co-operative Bank — Home Loan — Salaried", "lender-saraswat", 21, 65, 650, "100000000.00", ["PAN_INDIA"], ["resident"], [], true],
  ["BASE_SBI_HOME_LOAN", "State Bank of India — Home Loan — Salaried", "lender-sbi", 21, 75, 700, "1000000000.00", ["PAN_INDIA"], ["resident"], [], true],
].map((row) => ({
  code: row[0] as string,
  label: row[1] as string,
  lenderId: row[2] as string,
  minAge: row[3] as number,
  maxAge: row[4] as number,
  minCibil: row[5] as number,
  maxLoan: row[6] as string,
  states: row[7] as string[],
  residency: row[8] as string[],
  transactions: row[9] as string[],
  property: row[10] as boolean,
}));

function asProgramme(row: ProgrammeShape): EnterpriseLenderProgramRecord {
  return {
    id: row.code,
    code: row.code,
    label: row.label,
    lenderId: row.lenderId,
    productCode: "HOME_LOAN",
    versionNumber: 1,
    enabled: true,
    isDeleted: false,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    employmentTypes: ["salaried"],
    legalConstitutions: ["individual"],
    residencyEligibility: row.residency,
    eligibleStates: row.states,
    eligibleCities: [],
    propertyCategories: row.property ? ["residential"] : [],
    constructionStatuses: row.property ? ["ready", "under_construction"] : [],
    propertyTypes: [],
    transactionTypes: row.transactions,
    minAge: row.minAge,
    maxAge: row.maxAge,
    minCibil: row.minCibil,
    maxCibil: 900,
    minLoanAmountExact: "2500000.00",
    maxLoanAmountExact: row.maxLoan,
  } as EnterpriseLenderProgramRecord;
}

function statusOf(program: EnterpriseLenderProgramRecord, input: typeof matchInput) {
  const result = matchPublishedProgramme(program, input);
  const status = result.matched
    ? "MATCH"
    : result.reason.includes("was not available")
      ? "UNVERIFIED"
      : "REJECT";
  return { code: program.code, label: program.label, status, reason: result.reason };
}

const programmes = inventory.map(asProgramme);
const evaluation = programmes.map((program) => statusOf(program, matchInput));
assert.equal(evaluation.every((row) => row.status === "MATCH"), true, JSON.stringify(evaluation, null, 2));

const missingAge = projectPublicProgrammeMatchInput({
  ...detail,
  borrowerFields: { ...detail.borrowerFields, ageYears: "", "assessment:borrower.ageYears": "" },
});
const unverifiedAge = programmes.map((program) => statusOf(program, missingAge));
assert.equal(unverifiedAge.every((row) => row.status === "UNVERIFIED" && row.reason.startsWith("Age")), true);

const selfEmployed = projectPublicProgrammeMatchInput({
  ...detail,
  borrowerFields: { ...detail.borrowerFields, employmentTypeCode: "self-employed-professional" },
});
const selfEmployedResult = programmes.map((program) => statusOf(program, selfEmployed));
assert.equal(
  selfEmployedResult.every((row) => row.status === "REJECT" && row.reason.includes("Employment")),
  true,
);

const older = projectPublicProgrammeMatchInput({
  ...detail,
  borrowerFields: { ...detail.borrowerFields, ageYears: "70", "assessment:borrower.ageYears": "70" },
});
const axis = statusOf(programmes[0], older);
const sbi = statusOf(programmes[8], older);
assert.equal(axis.status, "REJECT");
assert.match(axis.reason, /Age/);
assert.equal(sbi.status, "MATCH");

function geography(states: string[], state: string) {
  return matchPublishedProgramme(
    asProgramme({
      ...inventory[0],
      states,
      code: `GEO_${states.join("_")}`,
    }),
    { ...matchInput, state },
  );
}
assert.equal(geography(["PAN_INDIA"], "MH").matched, true);
assert.equal(geography(["GJ", "KA", "MH"], "MH").matched, true);
assert.equal(geography(["GJ", "KA", "MH"], "DL").matched, false);
assert.equal(geography(["PAN_INDIA"], "DL").matched, true);
assert.equal(geography(["PAN_INDIA"], "PAN_INDIA").matched, false);

const lenders: PublishedLenderOption[] = inventory.map((row) => ({
  id: row.lenderId,
  code: row.code,
  displayName: row.label,
  legalName: row.label,
  institutionCategory: "bank",
  source: "api",
  published: true,
  active: true,
}));
const cards = projectRegistryProgrammeRecommendations({
  detail: detail as never,
  lenders,
  programs: programmes,
});
assert.equal(evaluation.filter((row) => row.status === "MATCH").length, 9);
assert.equal(cards.cards.length, 9);
assert.equal(cards.message, "Published programme matches for this requirement.");
const shown = new Set(cards.cards.map((card) => card.displayName));
const outsideCap = evaluation.filter((row) => !shown.has(row.label ?? ""));

console.log(JSON.stringify({
  v1Hash,
  v1Fields: pinned?.fields.length,
  v1Stages: pinned?.stages.length,
  v2DraftFields: v2.fields.map((item) => item.fieldId),
  matchInput,
  evaluation,
  cards: cards.cards.length,
  outsideExistingEightCardCap: outsideCap.map((row) => row.label),
}, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
