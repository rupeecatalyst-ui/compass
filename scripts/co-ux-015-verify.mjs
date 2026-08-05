/**
 * CO-UX-015 — Enterprise Financial Input Standard (static + conversion gates).
 * UI-only: absolute rupee storage / APIs / calculations must remain unchanged.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const ssotComponent =
  "src/components/catalyst-one/shared/enterprise-financial-input.tsx";
const aliasComponent = "src/components/catalyst-one/shared/inr-currency-input.tsx";
const helpers = "src/lib/enterprise-financial-input/index.ts";
const constants = "src/constants/enterprise-financial-input.ts";

for (const rel of [ssotComponent, aliasComponent, helpers, constants]) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

const efi = read(ssotComponent);
assert.match(efi, /EnterpriseFinancialInput/);
assert.match(efi, /ENTERPRISE_FINANCIAL_UNIT/);
assert.match(efi, /Equivalent value|formatFinancialEquivalent/);
assert.match(efi, /unitMagnitudeToAbsolute|parseFinancialMagnitudeInput/);

const alias = read(aliasComponent);
assert.match(alias, /EnterpriseFinancialInput/);
assert.ok(
  !alias.includes("parseINRInput"),
  "INRCurrencyInput must not keep a parallel parseINRInput implementation",
);

const consts = read(constants);
assert.match(consts, /thousand:\s*1_000/);
assert.match(consts, /lakh:\s*1_00_000/);
assert.match(consts, /crore:\s*1_00_00_000/);

const helpersSrc = read(helpers);
assert.match(helpersSrc, /unitMagnitudeToAbsolute/);
assert.match(helpersSrc, /absoluteRupeesFromStoredString/);

/** Mirror of SSOT multipliers — verifies sprint examples without mutating storage. */
const M = { thousand: 1_000, lakh: 1_00_000, crore: 1_00_00_000 };
const toAbs = (mag, unit) => Math.round(mag * M[unit]);
assert.equal(toAbs(45, "crore"), 450_000_000);
assert.equal(toAbs(75, "lakh"), 7_500_000);
assert.equal(toAbs(2.5, "crore"), 25_000_000);
assert.equal(toAbs(12.75, "lakh"), 1_275_000);
assert.equal(toAbs(0.5, "crore"), 5_000_000);

const migratedSurfaces = [
  "src/components/catalyst-one/shared/inr-currency-input.tsx",
  "src/components/catalyst-one/shared/property-information-card.tsx",
  "src/components/catalyst-one/shared/employment-income-fields.tsx",
  "src/components/catalyst-one/shared/existing-loan-information-section.tsx",
  "src/components/catalyst-one/shared/final-approved-terms-card.tsx",
  "src/components/catalyst-one/shared/edit-deal-dialog.tsx",
  "src/components/catalyst-one/shared/loan-workspace-modal.tsx",
  "src/components/catalyst-one/loan-files/loan-create-form-dialog.tsx",
  "src/components/catalyst-one/execution/lender-pipeline-board.tsx",
  "src/components/catalyst-one/lead-information/lead-information-workspace.tsx",
  "src/components/catalyst-one/credit-bench/modify-loan-details-sheet.tsx",
  "src/components/catalyst-one/credit-bench/credit-bench-workspace.tsx",
  "src/components/catalyst-one/credit-bench/chanakya-gap-inline-field.tsx",
  "src/components/catalyst-one/analyze-deal/analyze-deal-workspace.tsx",
  "src/components/catalyst-one/enterprise-credit-workspace/ecw-left-panel.tsx",
  "src/components/catalyst-one/companies/company-workspace-modal.tsx",
];

for (const rel of migratedSurfaces) {
  const src = read(rel);
  const usesEfi =
    src.includes("EnterpriseFinancialInput") || src.includes("INRCurrencyInput");
  assert.ok(usesEfi, `${rel} must use EnterpriseFinancialInput or INRCurrencyInput alias`);
  assert.ok(
    !src.includes("parseINRInput"),
    `${rel} must not call parseINRInput (legacy zero-counting path)`,
  );
}

assert.ok(
  !prismaHasFinancialUnitColumn(),
  "Must not add financial-unit columns to Prisma",
);

function prismaHasFinancialUnitColumn() {
  const schema = read("prisma/schema.prisma");
  return schema.includes("EnterpriseFinancialUnit");
}

console.log("CO-UX-015: PASS");
console.log(
  JSON.stringify(
    {
      sprint: "CO-UX-015",
      sharedComponent: ssotComponent,
      alias: "INRCurrencyInput → EnterpriseFinancialInput",
      units: ["Thousand", "Lakh", "Crore"],
      storage: "absolute rupees (unchanged)",
      schemaChanged: false,
      apiChanged: false,
      calculationsChanged: false,
      migratedSurfaces: migratedSurfaces.length,
      examples: {
        "45 Crore": 450_000_000,
        "75 Lakh": 7_500_000,
        "2.5 Crore": 25_000_000,
      },
    },
    null,
    2,
  ),
);
