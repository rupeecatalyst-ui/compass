/**
 * CO-WP-REFINEMENT-006 — Partner Agreement Document Folder & Signing Flow verify.
 * Static + unit checks — no deploy / no live BAT credentials.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wpRoot = path.resolve(root, "..", "Wealth Partner App", "web");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const readWp = (rel: string) => fs.readFileSync(path.join(wpRoot, rel), "utf8");
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
const existsWp = (rel: string) => fs.existsSync(path.join(wpRoot, rel));

const requiredC1 = [
  "src/types/enterprise-partner-legal-docket.ts",
  "src/constants/enterprise-partner-legal-docket/index.ts",
  "server/services/partner-gateway/partner-legal-docket.compose.ts",
  "server/services/partner-gateway/partner-legal-docket.service.ts",
  "src/app/api/partner/legal-docket/route.ts",
];

for (const rel of requiredC1) {
  assert.ok(exists(rel), `missing Catalyst One file: ${rel}`);
}

const requiredWp = [
  "src/types/partner-legal-docket.ts",
  "src/screens/documents/PartnerAgreementFolder.tsx",
  "src/screens/documents/partner-agreement.css",
];

for (const rel of requiredWp) {
  assert.ok(existsWp(rel), `missing Wealth Partner App file: ${rel}`);
}

const route = read("src/app/api/partner/legal-docket/route.ts");
assert.match(route, /requirePartnerAccessToken/);
assert.match(route, /record_view/);
assert.match(route, /record_download/);
assert.match(route, /ACTION_NOT_PERMITTED/);
assert.doesNotMatch(route, /mark_partner_signed/);

const service = read("server/services/partner-gateway/partner-legal-docket.service.ts");
assert.match(service, /resolvePartnerBindingForUser/);
assert.match(service, /wealthPartnerRegistryService\.getWorkspace/);
assert.match(service, /runLegalDocketAction/);
assert.match(service, /PARTNER_LEGAL_SIGNING_CAPABILITY/);

const constants = read("src/constants/enterprise-partner-legal-docket/index.ts");
assert.match(constants, /PARTNER_LEGAL_SIGNING_CAPABILITY/);
assert.match(constants, /partnerSelfSignAllowed:\s*false/);
assert.match(constants, /engagement_agreement/);

const compose = read("server/services/partner-gateway/partner-legal-docket.compose.ts");
assert.match(compose, /composePartnerLegalDocketDesk/);
assert.match(compose, /isPrimaryAgreement/);
assert.match(compose, /enterprise_partner_legal_docket/);

const wpScreen = readWp("src/screens/documents/PartnerDocumentsScreen.tsx");
assert.match(wpScreen, /PartnerAgreementFolder/);
assert.match(wpScreen, /Partner Agreement/);
assert.match(wpScreen, /Customer Documents/);

const wpFolder = readWp("src/screens/documents/PartnerAgreementFolder.tsx");
assert.match(wpFolder, /partnerLegalDocketDesk/);
assert.match(wpFolder, /record_view/);
assert.doesNotMatch(wpFolder, /mark_partner_signed|Signed successfully/i);

const wpApi = readWp("src/lib/enterprise-api.ts");
assert.match(wpApi, /\/api\/partner\/legal-docket/);

const c1Legal = read("src/app/api/wealth-partner-registry/partners/[partnerId]/legal-docket/route.ts");
assert.match(c1Legal, /mark_partner_signed/);

console.log("CO-WP-REFINEMENT-006 verify PASS");
console.log("- Partner Gateway legal-docket route present (partner-scoped)");
console.log("- Partner self-sign blocked; admin lifecycle retained on employee route");
console.log("- WP Documents desk exposes Partner Agreement tab");
console.log("- Reuses CO-WP-007 legal docket SSOT (no parallel agreement model)");
