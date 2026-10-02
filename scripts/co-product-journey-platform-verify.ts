/**
 * Proof that an ordinary product journey is published from Catalyst One
 * configuration and rendered without a product-specific question list.
 * This script does not create a Contact, Opportunity, recommendation, or document.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { publicStageOrder } from "../compass/src/lib/journey-config";
import { publicJourneyStages } from "../src/lib/compass-customer-gateway/public-question-plan";
import {
  buildJourneyDraftFromProjection,
  evaluateJourneyCondition,
  importJourneyDraft,
  journeyPublicationState,
  previewProductJourney,
  publishProductJourney,
  renderPublishedJourney,
  retireProductJourney,
  resolvePublishedJourney,
  saveProductJourneyDraft,
  validateProductJourneyDraft,
  type JourneyDraft,
} from "../src/lib/product-journey/publication";
import { configureProductJourneyStore, createFileProductJourneyStore } from "../src/lib/product-journey/store";

const organizationId = "org-proof";
const actorId = "proof-admin";
configureProductJourneyStore(
  "proof",
  createFileProductJourneyStore(join(mkdtempSync(join(tmpdir(), "journey-proof-")), "book.json")),
);

const root = resolve(__dirname, "..");
const productCode = "synthetic-lending-proof";

function draft(fieldOrder: { city: number; employment: number }): JourneyDraft {
  return {
    productCode,
    productLabel: "Synthetic Lending Proof",
    lifecycle: "draft",
    previewed: false,
    publiclyEnabled: true,
    advantageEnabled: false,
    recommendationBinding: "unavailable",
    consentVersion: "synthetic-consent-v1",
    lodSource: "opportunity_lod",
    mobileCapture: "required",
    otpVerification: "on",
    confirmation: {
      title: "Application received",
      body: "This is a synthetic preview. No application was created.",
    },
    stages: [
      { stageId: "welcome", kind: "welcome", label: "Welcome", sequence: 1 },
      { stageId: "mobile", kind: "mobile", label: "Mobile", sequence: 2 },
      { stageId: "otp", kind: "otp", label: "Verification", sequence: 3 },
      { stageId: "name", kind: "name", label: "Name", sequence: 4 },
      { stageId: "about", kind: "questions", label: "About the requirement", sequence: 5 },
      { stageId: "email", kind: "email", label: "Email", sequence: 6 },
      { stageId: "review", kind: "review", label: "Review", sequence: 7 },
    ],
    fields: [
      {
        fieldId: "mobile",
        stageId: "mobile",
        label: "Mobile number",
        fieldType: "mobile",
        required: true,
        sequence: 1,
        purpose: "identity",
      },
      {
        fieldId: "displayName",
        stageId: "name",
        label: "Full name",
        fieldType: "short_text",
        required: true,
        sequence: 1,
        purpose: "identity",
      },
      {
        fieldId: "city",
        stageId: "about",
        label: "City",
        fieldType: "short_text",
        required: false,
        sequence: fieldOrder.city,
        purpose: "application",
      },
      {
        fieldId: "employmentType",
        stageId: "about",
        label: "Employment",
        fieldType: "single_select",
        required: true,
        sequence: fieldOrder.employment,
        purpose: "recommendation",
        options: [
          { value: "salaried", label: "Salaried" },
          { value: "self_employed", label: "Self-employed" },
        ],
      },
      {
        fieldId: "employerName",
        stageId: "about",
        label: "Employer",
        fieldType: "short_text",
        required: true,
        sequence: 3,
        purpose: "recommendation",
        visibleWhen: { op: "equals", fieldId: "employmentType", value: "salaried" },
      },
      {
        fieldId: "personalEmail",
        stageId: "email",
        label: "Email",
        fieldType: "email",
        required: true,
        sequence: 1,
        purpose: "identity",
      },
    ],
  };
}

void (async () => {
await saveProductJourneyDraft(organizationId, draft({ city: 1, employment: 2 }), actorId);

const invalid = await validateProductJourneyDraft(organizationId, productCode, actorId);
assert.equal(invalid.ok, true, invalid.errors.join(","));

const preview = await previewProductJourney(organizationId, productCode, { employmentType: "self_employed" }, actorId);
assert.equal(preview.createdRecords, false);
assert.equal(preview.synthetic, true);
assert.equal(preview.advantageEnabled, false);
assert.equal(preview.identityStages.mobile, "mobile");
assert.equal(preview.identityStages.name, "name");
assert.equal(preview.identityStages.email, "email");
assert.equal(preview.visibleFieldIds.includes("employerName"), false);
const unanswered = await previewProductJourney(organizationId, productCode, {}, actorId);
assert.ok(unanswered.missingRecommendationFieldIds.includes("employmentType"));
assert.equal(evaluateJourneyCondition(
  { op: "equals", fieldId: "employmentType", value: "salaried" },
  { employmentType: "salaried" },
), true);

const published = await publishProductJourney(organizationId, productCode, actorId);
assert.equal(published.ok, true);
if (!published.ok) throw new Error("publish failed");
assert.equal(published.journey.journeyVersion, 1);

const first = renderPublishedJourney(published.journey);
assert.deepEqual(
  first.questions.filter((item) => item.stageId === "about").map((item) => item.fieldId),
  ["city", "employmentType", "employerName"],
);

await saveProductJourneyDraft(organizationId, draft({ city: 2, employment: 1 }), actorId);
const stillFirst = await resolvePublishedJourney(organizationId, productCode, null);
assert.equal(stillFirst?.journeyVersion, 1);
assert.equal(
  renderPublishedJourney(stillFirst!).questions.find((item) => item.fieldId === "city")?.sequence,
  1,
);

await previewProductJourney(organizationId, productCode, {}, actorId);
const second = await publishProductJourney(organizationId, productCode, actorId);
assert.equal(second.ok, true);
if (!second.ok) throw new Error("republish failed");
assert.equal(second.journey.journeyVersion, 2);

const opened = await resolvePublishedJourney(organizationId, productCode, null);
const pinned = await resolvePublishedJourney(organizationId, productCode, 1);
assert.equal(opened?.journeyVersion, 2);
assert.deepEqual(
  renderPublishedJourney(opened!).questions.filter((item) => item.stageId === "about").map((item) => item.fieldId),
  ["employmentType", "city", "employerName"],
);
assert.deepEqual(
  renderPublishedJourney(pinned!).questions.filter((item) => item.stageId === "about").map((item) => item.fieldId),
  ["city", "employmentType", "employerName"],
);

assert.equal((await retireProductJourney(organizationId, productCode, actorId)).ok, true);
assert.equal(await resolvePublishedJourney(organizationId, productCode, null), null);
assert.equal((await resolvePublishedJourney(organizationId, productCode, 1))?.journeyVersion, 1);

await saveProductJourneyDraft(organizationId, {
  ...draft({ city: 1, employment: 2 }),
  productCode: "synthetic-circular",
  fields: [
    {
      fieldId: "left",
      stageId: "about",
      label: "Left",
      fieldType: "short_text",
      required: false,
      sequence: 1,
      purpose: "application",
      visibleWhen: { op: "equals", fieldId: "right", value: "yes" },
    },
    {
      fieldId: "right",
      stageId: "about",
      label: "Right",
      fieldType: "short_text",
      required: false,
      sequence: 2,
      purpose: "application",
      visibleWhen: { op: "equals", fieldId: "left", value: "yes" },
    },
  ],
});
const circular = await validateProductJourneyDraft(organizationId, "synthetic-circular", actorId);
assert.equal(circular.ok, false);
assert.ok(circular.errors.includes("CIRCULAR_CONDITION"));

const publicationSource = readFileSync(resolve(root, "src/lib/product-journey/publication.ts"), "utf8");
assert.equal(publicationSource.includes("prisma"), false);
assert.equal(publicationSource.includes("enterpriseOpportunity"), false);
assert.equal(publicationSource.includes("ecmContact"), false);

const rendererSource = readFileSync(resolve(root, "compass/src/lib/journey-config.ts"), "utf8");
assert.equal(rendererSource.includes("DYNAMIC_PRODUCTS"), false);
assert.equal(rendererSource.includes("if (productCode === \"home-loan\")"), false);
const configSource = readFileSync(
  resolve(root, "server/services/compass-customer-gateway/compass-journey-config.service.ts"),
  "utf8",
);
assert.equal(configSource.includes('productCode === "home-loan"'), false);
const discoverySource = readFileSync(
  resolve(root, "compass/src/components/home-loan-experience/discovery/discovery-context.tsx"),
  "utf8",
);
assert.equal(discoverySource.includes('productCode === "home-loan" || productCode === "home-loan-balance-transfer"'), false);

const presented = publicStageOrder(productCode, {
  productCode,
  enterpriseProductCode: productCode,
  productLabel: first.productLabel,
  borrowerKind: "individual",
  configVersion: `journey-v${first.journeyVersion}`,
  fields: [],
  stages: first.stages,
  otpVerification: "on",
  mobileCapture: "required",
  journeyVersion: first.journeyVersion,
  dtoSource: "published_product_journey",
});
assert.deepEqual(presented, first.stages);
const sameRendererForAnotherProduct = publicStageOrder("personal-loan", {
  productCode: "personal-loan",
  enterpriseProductCode: "PERSONAL_LOAN",
  productLabel: "Personal Loan",
  borrowerKind: "individual",
  configVersion: `journey-v${opened!.journeyVersion}`,
  fields: [],
  stages: renderPublishedJourney(opened!).stages,
  otpVerification: "on",
  mobileCapture: "required",
  journeyVersion: opened!.journeyVersion,
  dtoSource: "published_product_journey",
});
assert.deepEqual(sameRendererForAnotherProduct, renderPublishedJourney(opened!).stages);
assert.equal(await journeyPublicationState(organizationId, productCode), "unavailable");

await saveProductJourneyDraft(organizationId, {
  ...draft({ city: 1, employment: 2 }),
  productCode: "synthetic-unclassified",
  fields: [
    {
      fieldId: "notes",
      stageId: "about",
      label: "Notes",
      fieldType: "short_text",
      required: true,
      sequence: 1,
      purpose: "",
    },
  ],
});
const unclassified = await validateProductJourneyDraft(organizationId, "synthetic-unclassified", actorId);
assert.equal(unclassified.ok, false);
assert.ok(unclassified.errors.includes("PURPOSE_REQUIRED"));

const lendingSource = readFileSync(resolve(root, "compass/src/config/compass-lending-products.ts"), "utf8");
assert.equal(lendingSource.includes("HL_STEPS"), true);

const homeLoanDraft = buildJourneyDraftFromProjection({
  productCode: "home-loan",
  productLabel: "Home Loan",
  advantageEnabled: true,
  stageIds: publicJourneyStages({ advantageEnabled: true }),
  fields: [
    {
      fieldId: "employmentTypeCode",
      label: "Employment",
      fieldType: "select",
      required: true,
      sequence: 2,
      purpose: "recommendation",
      options: [{ value: "salaried", label: "Salaried" }],
    },
    {
      fieldId: "employerName",
      label: "Employer",
      fieldType: "text",
      required: false,
      sequence: 3,
      purpose: "recommendation",
      visibleWhenField: "employmentTypeCode",
      visibleWhenValues: ["salaried"],
    },
  ],
});
const imported = await importJourneyDraft({ organizationId, actorId, draft: homeLoanDraft });
assert.equal(imported.imported, true);
assert.equal(imported.alreadyPublished, false);
await previewProductJourney(organizationId, "home-loan", {}, actorId);
const homeLoan = await publishProductJourney(organizationId, "home-loan", actorId);
assert.equal(homeLoan.ok, true);
if (!homeLoan.ok) throw new Error("home loan publish failed");
assert.equal(homeLoan.journey.journeyVersion, 1);
assert.equal(homeLoan.journey.advantageEnabled, true);
assert.equal(homeLoan.journey.stages.some((stage) => stage.kind === "advantage"), true);
const importedAgain = await importJourneyDraft({ organizationId, actorId, draft: homeLoanDraft });
assert.equal(importedAgain.alreadyPublished, true);
assert.equal((await resolvePublishedJourney(organizationId, "home-loan", null))?.journeyVersion, 1);
assert.equal(publicationSource.includes("const books"), false);
assert.equal(publicationSource.includes("publishIdcProjectionIfAbsent"), false);

console.log("PRODUCT_JOURNEY_PLATFORM_VERIFY pass");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
