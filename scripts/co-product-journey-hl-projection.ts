/**
 * Runs the Home Loan and Home Loan BT projections through the server config
 * graph. Uses a file store so it does not read or write the configured database.
 */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIdcJourneyDraft } from "../server/services/compass-customer-gateway/compass-journey-config.service";
import { importJourneyDraft, publishProductJourney, previewProductJourney, resolvePublishedJourney } from "../src/lib/product-journey/publication";
import { configureProductJourneyStore, createFileProductJourneyStore } from "../src/lib/product-journey/store";

const organizationId = "org-hl-projection";
const actorId = "proof-admin";

configureProductJourneyStore(
  "proof",
  createFileProductJourneyStore(join(mkdtempSync(join(tmpdir(), "journey-hl-")), "book.json")),
);

async function project(productCode: string, expectAdvantage: boolean) {
  const draft = await buildIdcJourneyDraft(productCode, organizationId);
  assert.equal(draft.lifecycle, "draft");
  assert.ok(draft.fields.length > 0, `${productCode} projected no fields`);
  assert.equal(draft.stages.some((stage) => stage.kind === "mobile"), true);
  assert.equal(draft.stages.some((stage) => stage.kind === "name"), true);
  assert.equal(draft.stages.some((stage) => stage.kind === "email"), true);
  assert.equal(draft.advantageEnabled, expectAdvantage);
  assert.equal(draft.lodSource, "opportunity_lod");
  assert.equal(draft.mobileCapture, "required");
  assert.equal(draft.otpVerification, "off");
  assert.equal(draft.stages.some((stage) => stage.kind === "otp"), false);
  assert.equal(draft.consentVersion, "compass-consent-v1");
  const conditional = draft.fields.filter((field) => field.visibleWhen || field.requiredWhen);
  assert.ok(conditional.length > 0, `${productCode} lost conditional questions`);
  const imported = await importJourneyDraft({ organizationId, actorId, draft });
  assert.equal(imported.imported, true);
  assert.equal(imported.alreadyPublished, false);
  const again = await importJourneyDraft({ organizationId, actorId, draft });
  assert.equal(again.imported, false);
  assert.equal(again.alreadyPublished, false);
  assert.equal(await resolvePublishedJourney(organizationId, draft.productCode, null), null);
  await previewProductJourney(organizationId, draft.productCode, {}, actorId);
  const published = await publishProductJourney(organizationId, draft.productCode, actorId);
  assert.equal(published.ok, true);
  if (!published.ok) throw new Error(published.errors.join(","));
  const third = await importJourneyDraft({ organizationId, actorId, draft });
  assert.equal(third.alreadyPublished, true);
  assert.equal((await resolvePublishedJourney(organizationId, draft.productCode, null))?.journeyVersion, 1);
  return { productCode: draft.productCode, fields: draft.fields.length, stages: draft.stages.map((stage) => stage.stageId) };
}

async function main() {
  const homeLoan = await project("HOME_LOAN", true);
  const balanceTransfer = await project("HOME_LOAN_BT", true);
  assert.notEqual(homeLoan.productCode, balanceTransfer.productCode);
  console.log(JSON.stringify({ HOME_LOAN: homeLoan, HOME_LOAN_BT: balanceTransfer }));
  console.log("PRODUCT_JOURNEY_HL_PROJECTION pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
