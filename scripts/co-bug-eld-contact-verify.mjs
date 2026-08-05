/**
 * CO-BUG-ELD-CONTACT — static verification (persistence + Products Handled).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const required = [
  "src/components/catalyst-one/contacts/contact-workspace-modal.tsx",
  "src/components/catalyst-one/contacts/banker-lender-registry-fields.tsx",
  "src/lib/enterprise-contact-master/banker-hierarchy.ts",
  "src/lib/enterprise-persistence/ecm-persist.ts",
  "src/constants/enterprise-contact-master/role-templates.ts",
  "src/lib/enterprise-lender-directory/compose-directory.ts",
  "docs/co-bug-eld-contact/CO-BUG-ELD-CONTACT-READINESS-REPORT.md",
];

for (const rel of required) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

const workspace = read("src/components/catalyst-one/contacts/contact-workspace-modal.tsx");
assert.match(workspace, /persistRegisterEcmContact/);
assert.match(workspace, /persistUpdateEcmContact/);
assert.doesNotMatch(workspace, /\bregisterEcmContact\s*\(/);
assert.doesNotMatch(workspace, /\bupdateEcmContact\s*\(/);
assert.match(workspace, /BankerProductsHandledMultiSelect/);
assert.match(workspace, /product_multi/);
assert.match(workspace, /institutionLabel \|\|/);
assert.match(workspace, /lenderName/);

const fields = read("src/components/catalyst-one/contacts/banker-lender-registry-fields.tsx");
assert.match(fields, /BankerProductsHandledMultiSelect/);
assert.match(fields, /useProductMasterOptions/);
assert.match(fields, /serializeBankerProductsHandled/);

const hierarchy = read("src/lib/enterprise-contact-master/banker-hierarchy.ts");
assert.match(hierarchy, /persistUpdateEcmContact/);
assert.match(hierarchy, /parseBankerProductsHandled/);
assert.match(hierarchy, /buildInstitutionBankerProductIndex/);
assert.match(hierarchy, /listEcmBankersForInstitution/);
assert.match(hierarchy, /async function setBankerReportingManager/);

const templates = read("src/constants/enterprise-contact-master/role-templates.ts");
assert.match(templates, /product_multi/);
assert.match(templates, /productsHandled/);

const compose = read("src/lib/enterprise-lender-directory/compose-directory.ts");
assert.match(compose, /enrichDirectoryRowsWithBankerProducts/);

const slide = read(
  "src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx",
);
assert.match(slide, /listEcmBankersForInstitution/);
assert.match(slide, /productsLabel/);

console.log("CO-BUG-ELD-CONTACT verify: PASS");
