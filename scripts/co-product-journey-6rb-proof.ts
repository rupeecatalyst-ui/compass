/**
 * STEP 6R-B local certification.
 * File-backed journey store and pure functions only.
 * Does not open a database and does not call production.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROPERTY_TYPES } from "../src/constants/loan-stage-master";
import { buildIdcJourneyDraft } from "../server/services/compass-customer-gateway/compass-journey-config.service";
import { compassJourneyService } from "../server/services/compass-customer-gateway/compass-journey.service";
import { CompassJourneyError } from "../server/services/compass-customer-gateway/compass-journey-errors";
import { projectRegistryProgrammeRecommendations } from "../server/services/compass-customer-gateway/compass-recommendations.service";
import { answersToSnapshotFields } from "../server/services/compass-customer-gateway/compass-opportunity-projection";
import {
  importJourneyDraft,
  previewProductJourney,
  publishProductJourney,
  resolvePublishedJourney,
  type JourneyCondition,
  type JourneyDraft,
} from "../src/lib/product-journey/publication";
import { configureProductJourneyStore, createFileProductJourneyStore } from "../src/lib/product-journey/store";
import type { PublishedLenderOption } from "../src/lib/enterprise-lender-registry/published-directory";
import type { EnterpriseLenderProgramRecord } from "../src/types/enterprise-lender-registry";
import type { PartnerOpportunityDetailDto } from "../src/types/enterprise-partner-business";
import { EdieLodCertificationError, generateOpportunityLod } from "../src/lib/document-requests/generate-lod";

const TARGET_FIELDS = [
  "employmentTypeCode",
  "employerName",
  "occupation",
  "monthlyIncomeLabel",
  "annualTurnoverLabel",
  "approxCibilScore",
  "propertyCategory",
  "constructionStatus",
  "propertyValueLabel",
  "requestedAmountLabel",
] as const;

const RECOMMENDATION_FIELDS = new Set([
  "employmentTypeCode",
  "employerName",
  "monthlyIncomeLabel",
  "annualTurnoverLabel",
  "approxCibilScore",
  "propertyCategory",
  "constructionStatus",
  "propertyValueLabel",
  "requestedAmountLabel",
]);

const TARGET_STAGES = [
  "welcome",
  "mobile",
  "displayName",
  "recommendation",
  "analysing",
  "lenders",
  "advantage",
  "email",
  "application",
  "review",
  "documents",
  "confirmation",
];

function conditionText(condition: JourneyCondition | undefined): string {
  return JSON.stringify(condition ?? null);
}

function field(draft: JourneyDraft, fieldId: string) {
  const found = draft.fields.find((item) => item.fieldId === fieldId);
  assert.ok(found, `missing ${fieldId}`);
  return found;
}

function assertHomeLoanShape(draft: JourneyDraft, label: string) {
  assert.equal(draft.productCode, "HOME_LOAN", label);
  assert.equal(draft.otpVerification, "off", label);
  assert.equal(draft.mobileCapture, "required", label);
  assert.equal(draft.advantageEnabled, true, label);
  assert.equal(draft.recommendationBinding, "governed_chanakya", label);
  assert.equal(draft.consentVersion, "compass-consent-v1", label);
  assert.equal(draft.lodSource, "opportunity_lod", label);
  assert.deepEqual(draft.stages.map((stage) => stage.stageId), TARGET_STAGES, label);
  assert.equal(draft.stages.some((stage) => stage.kind === "otp"), false, label);
  assert.deepEqual(draft.fields.map((item) => item.fieldId), [...TARGET_FIELDS], label);
  const sequences = draft.fields.map((item) => item.sequence);
  assert.deepEqual(sequences, sequences.map((_, index) => index + 1), `${label} sequence`);
  assert.equal(new Set(sequences).size, sequences.length, `${label} unique`);

  const employer = field(draft, "employerName");
  assert.match(conditionText(employer.visibleWhen), /employmentTypeCode/);
  assert.match(conditionText(employer.visibleWhen), /salaried/);
  assert.equal(employer.purpose, "recommendation");

  const occupation = field(draft, "occupation");
  assert.match(conditionText(occupation.visibleWhen), /employmentTypeCode/);
  assert.match(conditionText(occupation.visibleWhen), /self-employed/);
  assert.equal(occupation.purpose, "application");

  const turnover = field(draft, "annualTurnoverLabel");
  assert.match(conditionText(turnover.visibleWhen), /employmentTypeCode/);
  assert.match(conditionText(turnover.visibleWhen), /self-employed/);
  assert.equal(turnover.purpose, "recommendation");

  const income = field(draft, "monthlyIncomeLabel");
  assert.ok(income.notRequiredWhenFilled?.includes("annualTurnoverLabel"));
  assert.equal(income.purpose, "recommendation");

  for (const key of RECOMMENDATION_FIELDS) {
    assert.equal(field(draft, key).purpose, "recommendation", key);
  }

  const category = field(draft, "propertyCategory");
  assert.deepEqual(category.options?.map((option) => option.value), ["residential"]);
  const construction = field(draft, "constructionStatus");
  assert.deepEqual(construction.options?.map((option) => option.value), ["ready", "under_construction"]);
  const publicValues = draft.fields.flatMap((item) => item.options?.map((option) => option.value) ?? []);
  for (const banned of ["agricultural", "commercial", "industrial"]) {
    assert.equal(publicValues.some((value) => value.toLowerCase().includes(banned)), false, banned);
  }
  assert.equal(draft.fields.some((item) => item.fieldId === "propertyType"), false);
  assert.equal(draft.fields.some((item) => item.fieldId === "currentLendingInstitution"), false);
  assert.equal(draft.fields.some((item) => item.fieldId === "outstandingLoanAmountLabel"), false);

  const employmentIndex = TARGET_FIELDS.indexOf("employmentTypeCode");
  const creditIndex = TARGET_FIELDS.indexOf("approxCibilScore");
  const propertyIndex = TARGET_FIELDS.indexOf("propertyCategory");
  const amountIndex = TARGET_FIELDS.indexOf("requestedAmountLabel");
  assert.ok(employmentIndex < creditIndex && creditIndex < propertyIndex && propertyIndex < amountIndex);
}

async function main() {
  const homeLoan = await buildIdcJourneyDraft("HOME-LOAN");
  const lower = await buildIdcJourneyDraft("home-loan");
  const canonical = await buildIdcJourneyDraft("HOME_LOAN");
  assertHomeLoanShape(homeLoan, "HOME-LOAN");
  assert.deepEqual(lower.fields.map((item) => item.fieldId), homeLoan.fields.map((item) => item.fieldId));
  assert.deepEqual(canonical.productCode, "HOME_LOAN");
  assert.equal(lower.productCode, "HOME_LOAN");

  const balanceTransfer = await buildIdcJourneyDraft("HOME_LOAN_BT");
  assert.equal(balanceTransfer.productCode, "HOME_LOAN_BT");
  assert.notEqual(balanceTransfer.productCode, homeLoan.productCode);
  assert.equal(field(balanceTransfer, "currentLendingInstitution").purpose, "recommendation");
  assert.equal(field(balanceTransfer, "outstandingLoanAmountLabel").purpose, "recommendation");
  const freshIds = new Set(homeLoan.fields.map((item) => item.fieldId));
  assert.equal(freshIds.has("currentLendingInstitution"), false);
  assert.equal(freshIds.has("outstandingLoanAmountLabel"), false);

  assert.ok(PROPERTY_TYPES.includes("Agricultural Land"));
  assert.ok(PROPERTY_TYPES.some((item) => item.startsWith("Commercial")));
  assert.ok(PROPERTY_TYPES.some((item) => item.startsWith("Industrial")));

  configureProductJourneyStore(
    "proof",
    createFileProductJourneyStore(join(mkdtempSync(join(tmpdir(), "journey-6rb-")), "book.json")),
  );
  const organizationId = "org-6rb-proof";
  const actorId = "proof-admin";
  const first = await importJourneyDraft({ organizationId, actorId, draft: homeLoan });
  const second = await importJourneyDraft({ organizationId, actorId, draft: lower });
  const third = await importJourneyDraft({ organizationId, actorId, draft: canonical });
  assert.equal(first.imported, true);
  assert.equal(second.imported, false);
  assert.equal(third.imported, false);
  const preview = await previewProductJourney(organizationId, "HOME-LOAN", {}, actorId);
  assert.equal(preview.ok, true, preview.errors?.join(",") ?? "preview");
  const published = await publishProductJourney(organizationId, "HOME-LOAN", actorId);
  assert.equal(published.ok, true, published.ok ? "" : published.errors.join(","));
  for (const code of ["HOME-LOAN", "home-loan", "HOME_LOAN"]) {
    assert.equal((await resolvePublishedJourney(organizationId, code, null))?.journeyVersion, 1, code);
  }
  const btImport = await importJourneyDraft({ organizationId, actorId, draft: balanceTransfer });
  assert.equal(btImport.imported, true);
  assert.equal(await resolvePublishedJourney(organizationId, "HOME_LOAN_BT", null), null);
  const btPreview = await previewProductJourney(organizationId, "HOME_LOAN_BT", {}, actorId);
  assert.equal(btPreview.ok, true, btPreview.errors?.join(",") ?? "bt preview");
  const btPublished = await publishProductJourney(organizationId, "HOME_LOAN_BT", actorId);
  assert.equal(btPublished.ok, true, btPublished.ok ? "" : btPublished.errors.join(","));
  const freshBook = (await resolvePublishedJourney(organizationId, "HOME_LOAN", null))?.productCode;
  const transferBook = (await resolvePublishedJourney(organizationId, "HOME_LOAN_BT", null))?.productCode;
  assert.equal(freshBook, "home_loan");
  assert.equal(transferBook, "home_loan_bt");
  assert.notEqual(freshBook, transferBook);

  const mapped = answersToSnapshotFields({
    employmentTypeCode: "self-employed-business",
    annualTurnoverLabel: "2400000",
    propertyCategory: "residential",
    constructionStatus: "under_construction",
    requestedAmountLabel: "5000000",
  });
  assert.equal(mapped.borrowerFields.annualTurnoverLabel, "2400000");
  assert.equal(mapped.productFields.propertyCategory, "residential");
  assert.equal(mapped.productFields.constructionStatus, "under_construction");
  assert.equal(mapped.productFields.requestedAmountLabel, "5000000");

  const lender: PublishedLenderOption = {
    id: "registry-proof-lender",
    code: "PROOFBANK",
    displayName: "Proof Bank",
    legalName: "Proof Bank",
    institutionCategory: "bank",
    aliases: [],
    source: "api",
    published: true,
    active: true,
  };
  const programme = {
    id: "prog-proof",
    lenderId: lender.id,
    productCode: "HOME_LOAN",
    enabled: true,
    isDeleted: false,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    employmentTypes: ["salaried"],
    propertyCategories: ["residential"],
    constructionStatuses: ["ready", "under_construction"],
    versionNumber: 4,
  } as EnterpriseLenderProgramRecord;
  const detail = {
    opportunityId: "opp-proof",
    reference: "OPP-PROOF",
    customerId: "ctc-proof",
    customerDisplayName: "Proof Customer",
    ownerLabel: "",
    createdAt: new Date().toISOString(),
    productCode: "HOME_LOAN",
    productLabel: "HOME_LOAN",
    requiredAmountLabel: "5000000",
    borrowerFields: { employmentTypeCode: "salaried", monthlyIncomeLabel: "100000" },
    productFields: {
      requestedAmountLabel: "5000000",
      propertyCategory: "residential",
      constructionStatus: "ready",
      lendingType: "secured",
      transactionType: "fresh",
    },
  } as PartnerOpportunityDetailDto;
  const matched = projectRegistryProgrammeRecommendations({
    detail,
    lenders: [lender],
    programs: [programme],
  });
  assert.equal(matched.status, "ready");
  assert.equal(matched.cards.length, 1);
  assert.equal(matched.cards[0]?.lenderRef, "lender:registry-proof-lender");
  assert.equal(matched.cards[0]?.programmeVersion, 4);

  const excluded = projectRegistryProgrammeRecommendations({
    detail: {
      ...detail,
      productFields: { ...detail.productFields, propertyCategory: "commercial" },
    },
    lenders: [lender],
    programs: [programme],
  });
  assert.equal(excluded.status, "ready");
  assert.deepEqual(excluded.cards, []);
  assert.match(excluded.message, /No published programme matches/);

  const analyzeSource = readFileSync(
    join(__dirname, "../server/services/compass-customer-gateway/compass-journey.service.ts"),
    "utf8",
  );
  assert.match(analyzeSource, /projectRegistryProgrammeRecommendations/);
  assert.doesNotMatch(analyzeSource, /GOVERNED_CUSTOMER_RECOMMENDATION/);
  assert.equal(compassJourneyService.startJourney.toString().includes("CONSENT_REQUIRED"), false);

  const startRoute = readFileSync(
    join(__dirname, "../compass/src/app/api/journey/start/route.ts"),
    "utf8",
  );
  const startClient = readFileSync(
    join(__dirname, "../compass/src/services/catalyst-one/client.ts"),
    "utf8",
  );
  const discovery = readFileSync(
    join(__dirname, "../compass/src/components/home-loan-experience/discovery/discovery-context.tsx"),
    "utf8",
  );
  assert.doesNotMatch(startRoute, /consentAccepted/);
  assert.doesNotMatch(startClient, /consentAccepted:\s*input\.consentAccepted/);
  assert.doesNotMatch(startClient, /consentAccepted:\s*true/);
  assert.doesNotMatch(discovery, /consentAccepted:\s*true/);

  async function expectConsent(input: {
    consentAccepted: boolean;
    lenderShareAccepted: boolean;
    declarationsAccepted: boolean;
  }) {
    await compassJourneyService.submit("x", input);
  }
  await assert.rejects(expectConsent({ consentAccepted: false, lenderShareAccepted: true, declarationsAccepted: true }), (error: unknown) => {
    assert.ok(error instanceof CompassJourneyError);
    assert.equal(error.code, "CONSENT_REQUIRED");
    return true;
  });
  await assert.rejects(expectConsent({ consentAccepted: true, lenderShareAccepted: false, declarationsAccepted: true }), (error: unknown) => {
    assert.ok(error instanceof CompassJourneyError);
    assert.equal(error.code, "CONSENT_REQUIRED");
    return true;
  });
  await assert.rejects(expectConsent({ consentAccepted: true, lenderShareAccepted: true, declarationsAccepted: false }), (error: unknown) => {
    assert.ok(error instanceof CompassJourneyError);
    assert.equal(error.code, "CONSENT_REQUIRED");
    return true;
  });
  await assert.rejects(expectConsent({ consentAccepted: true, lenderShareAccepted: true, declarationsAccepted: true }), (error: unknown) => {
    assert.ok(error instanceof CompassJourneyError);
    assert.equal(error.code, "INVALID_SESSION");
    return true;
  });

  const salaried = generateOpportunityLod({
    productLabel: "Home Loan",
    employmentType: "salaried",
    borrowerCategory: "individual",
    transactionType: "fresh",
    contactChannelPolicy: "compass_public",
  });
  assert.equal(salaried.length, 8);
  assert.throws(
    () =>
      generateOpportunityLod({
        productLabel: "Home Loan",
        employmentType: "self-employed-business",
        borrowerCategory: "individual",
        transactionType: "fresh",
        contactChannelPolicy: "compass_public",
      }),
    (error: unknown) => error instanceof EdieLodCertificationError,
  );

  console.log("STEP_6RB_PROOF pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
