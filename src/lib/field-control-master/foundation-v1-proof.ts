/**
 * Foundation V1 registry invariants. Does not read or write a database.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EDL_CHANGE_CATEGORIES } from "@/constants/enterprise-decision-ledger";
import { listHomeLoanGovernedDerivedFacts } from "@/lib/home-loan-recommendation/governed-derived-facts";
import { resolveProjectedField } from "@/lib/product-recommendation/field-projection";
import {
  assertDistinctMakerChecker,
  assertOptionKeysNotRemoved,
  assertTypeAndOwnerUnchanged,
  buildFieldDefinitionLedgerInput,
  deactivateFieldDefinition,
  IDC_KEYS_REQUIRING_EQUIVALENCE_DECISION,
  listFieldControlDefinitions,
  nextFieldDefinitionVersion,
  normalizeCurrencyToInr,
  resolveFieldControlDefinition,
} from "./index";

const definitions = listFieldControlDefinitions();
const derivedIds = new Set(listHomeLoanGovernedDerivedFacts().map((fact) => fact.id));
const registeredDerived = definitions.filter((definition) => definition.classification === "derived");

assert.equal(registeredDerived.length, derivedIds.size);
for (const fact of listHomeLoanGovernedDerivedFacts()) {
  const match = registeredDerived.find((definition) => definition.fieldId === fact.id);
  assert.ok(match, fact.id);
  assert.equal(match.owningDomain, "derived_engine");
  assert.equal(match.ownershipReview, "certified_binding");
}

assert.equal(resolveFieldControlDefinition("foirFit")?.fieldId, "derived:foirPercent");
assert.equal(resolveProjectedField("foirFit")?.id, "derived:foirPercent");
assert.equal(resolveFieldControlDefinition("ltvFit")?.fieldId, "derived:ltvPercent");
assert.equal(resolveFieldControlDefinition("roiCompetitiveness")?.fieldId, "derived:applicableRoiPercent");
assert.equal(resolveFieldControlDefinition("eligibleAmount")?.fieldId, "derived:assessedOfferRupees");
assert.equal(resolveFieldControlDefinition("fundingFit")?.fieldId, "derived:assessedOfferRupees");
assert.equal(resolveFieldControlDefinition("tenureAvailability")?.fieldId, "derived:effectiveTenureMonths");
assert.equal(resolveFieldControlDefinition("balanceTransferBenefit")?.fieldId, "derived:btSavingsRupees");

assert.equal(resolveFieldControlDefinition("assessment:borrower.dateOfBirth")?.fieldId, "assessment:borrower.dateOfBirth");
assert.equal(resolveFieldControlDefinition("assessment:borrower.dateOfBirth")?.candidateMirrorOf, "contact.dateOfBirth");
assert.notEqual(resolveFieldControlDefinition("contact.dateOfBirth")?.fieldId, "assessment:borrower.dateOfBirth");

assert.equal(normalizeCurrencyToInr(2, "crore"), 20_000_000);
assert.equal(normalizeCurrencyToInr(75, "lakh"), 7_500_000);
assert.equal(normalizeCurrencyToInr(1, "thousand"), 1_000);
assert.equal(normalizeCurrencyToInr(10, "rupees"), 10);

const amount = definitions.find((definition) => definition.fieldId === "opportunity.requestedAmount");
assert.ok(amount);
assert.deepEqual([...amount.currencyUnits], ["lakh", "crore"]);
assert.equal("required" in amount, false);
assert.equal("weight" in amount, false);

for (const definition of definitions) {
  assert.equal(definition.controlsRuntime, false);
  assert.equal(definition.customerFacingActivation, false);
  assert.equal(definition.fieldId.startsWith("ppo:"), false);
  assert.equal(definition.lifecycleStatus, "draft");
}

for (const key of IDC_KEYS_REQUIRING_EQUIVALENCE_DECISION) {
  assert.equal(
    definitions.some((definition) => definition.fieldId === `idc:${key}` || definition.aliases.includes(key)),
    false,
    key,
  );
}

assert.equal(definitions.some((definition) => definition.classification === "programme_constraint_reference"), false);

const legacy = resolveFieldControlDefinition("lenderScore");
assert.equal(legacy?.fieldId, "legacy:lenderScore");
assert.equal(legacy?.ownershipReview, "owner_requires_product_decision");
assert.equal(legacy?.candidateMirrorOf, null);

const dob = definitions.find((definition) => definition.fieldId === "contact.dateOfBirth");
assert.ok(dob);
const renamed = nextFieldDefinitionVersion(dob, { friendlyLabel: "Birth date" });
assert.equal(dob.friendlyLabel, "Date of birth");
assert.equal(renamed.friendlyLabel, "Birth date");
assert.equal(renamed.versionNumber, 2);
assert.throws(() => assertTypeAndOwnerUnchanged(dob, { ...dob, fieldType: "text" }));
assert.throws(() => assertTypeAndOwnerUnchanged(dob, { ...dob, owningDomain: "opportunity" }));
assert.throws(() => assertOptionKeysNotRemoved(["salaried"], ["self_employed"]));
assert.doesNotThrow(() => assertOptionKeysNotRemoved(["salaried"], ["salaried", "self_employed"]));

const deactivated = deactivateFieldDefinition(dob);
assert.equal(deactivated.previous.lifecycleStatus, "draft");
assert.equal(deactivated.previous.friendlyLabel, "Date of birth");
assert.equal(deactivated.next.lifecycleStatus, "inactive");
assert.equal(dob.lifecycleStatus, "draft");

assert.throws(() => assertDistinctMakerChecker("same-user", "same-user"));
const ledgerInput = buildFieldDefinitionLedgerInput({
  definition: dob,
  makerUserId: "maker-user",
  checkerUserId: "checker-user",
  businessJustification: "Foundation inspection baseline for contact date of birth.",
  effectiveFrom: "2026-09-26T00:00:00.000Z",
});
assert.equal(ledgerInput.changeCategory, EDL_CHANGE_CATEGORIES.FIELD_DEFINITION);
assert.equal(ledgerInput.impactScope, "transaction_future_only");
assert.equal("weight" in (ledgerInput.newValue as object), false);

const published = { ...dob, lifecycleStatus: "active" as const };
assert.throws(() => nextFieldDefinitionVersion(published, { friendlyLabel: "Changed" }));

const migrationSql = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql",
  ),
  "utf8",
);
const migrationExecutable = migrationSql
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("--"))
  .join("\n");
assert.match(migrationExecutable, /ALTER TABLE "field_control_definitions" ENABLE ROW LEVEL SECURITY;/);
assert.equal((migrationExecutable.match(/\bALTER\b/g) ?? []).length, 1);
assert.equal(migrationExecutable.includes("CREATE POLICY"), false);
assert.equal(migrationExecutable.includes("FORCE ROW LEVEL SECURITY"), false);
assert.equal(/USING\s*\(\s*true\s*\)/i.test(migrationExecutable), false);
for (const forbidden of ["DROP ", "DELETE ", "UPDATE ", "INSERT ", "TRUNCATE ", "RENAME "]) {
  assert.equal(migrationExecutable.includes(forbidden), false, forbidden);
}
assert.match(migrationExecutable, /fcm_foundation_v1_no_runtime_control/);
assert.match(migrationExecutable, /fcm_foundation_v1_no_customer_facing/);

console.log(`FIELD_CONTROL_MASTER_FOUNDATION_V1_PROOF PASS definitions=${definitions.length}`);
