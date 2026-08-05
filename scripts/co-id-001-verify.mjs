/**
 * CO-ID-001 — Enterprise Identity Model verify (static).
 * No migrate / no deploy / no live-data mutation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "src/constants/enterprise-identity-model/index.ts",
  "src/types/enterprise-identity-model.ts",
  "src/lib/enterprise-identity-model/index.ts",
  ".cursor/rules/enterprise-identity-model.mdc",
  "src/components/catalyst-one/contacts/contact-identity-roles-section.tsx",
  "docs/co-id-001/CO-ID-001-ENTERPRISE-IDENTITY-MODEL-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const constants = read("src/constants/enterprise-identity-model/index.ts");
assert.match(constants, /ENTERPRISE_IDENTITY_PRINCIPLES/);
assert.match(constants, /Onboard Wealth Partner/);
assert.match(constants, /wealth_partner/);

const lib = read("src/lib/enterprise-identity-model/index.ts");
assert.match(lib, /deriveContactIdentityRoles/);
assert.match(lib, /mergePartnerRoleOntoContact/);

const ecm = read("server/services/ecm/contact.service.ts");
assert.match(ecm, /assignPartnerRoleForWealthPartner/);
assert.match(ecm, /roleProfiles/);

const wp = read(
  "server/services/wealth-partner-registry/wealth-partner-registry.service.ts",
);
assert.match(wp, /assignPartnerRoleForWealthPartner/);
assert.match(wp, /CO-ID-001/);

const wizard = read(
  "src/components/catalyst-one/wealth-partner-registry/create-wealth-partner-wizard.tsx",
);
assert.match(wizard, /WEALTH_PARTNER_ONBOARD_COPY/);
assert.match(wizard, /wealth_partner_onboarding/);
assert.match(wizard, /convertCta/);

const copy = read("src/constants/enterprise-identity-model/index.ts");
assert.match(copy, /Create Wealth Partner Profile/);
assert.match(copy, /Onboard Wealth Partner/);

const view = read(
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-registry-view.tsx",
);
assert.match(view, /registryCta/);
assert.match(view, /WEALTH_PARTNER_ONBOARD_COPY/);

const workspace = read(
  "src/components/catalyst-one/contacts/contact-workspace-modal.tsx",
);
assert.match(workspace, /ContactIdentityRolesSection/);
assert.match(workspace, /deriveContactIdentityRoles/);

const progressive = read(
  "src/components/catalyst-one/contacts/progressive-contact-create-modal.tsx",
);
assert.match(progressive, /identityIntent/);
assert.match(progressive, /wealth_partner_onboarding/);

const rule = read(".cursor/rules/enterprise-identity-model.mdc");
assert.match(rule, /FROZEN/);
assert.match(rule, /Contact Registry/);

console.log("CO-ID-001 Enterprise Identity Model verify: PASS");
console.log("NOTE: No migrate / no deploy / no live-data mutation.");
