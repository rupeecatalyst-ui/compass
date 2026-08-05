/**
 * CO-ECC-001 — Enterprise Communication Center verification.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const profiles = read("src/constants/enterprise-communication-center/profiles.ts");
assert.match(profiles, /CHANNEL_PARTNERS/);
assert.match(profiles, /CUSTOMERS/);
assert.match(profiles, /Rupee Catalyst Champion/);
assert.match(profiles, /Rupee Catalyst Connect/);
assert.match(profiles, /champion@rupeecatalyst\.com/);
assert.match(profiles, /connect@rupeecatalyst\.com/);

const events = read("src/constants/enterprise-communication-center/events.ts");
assert.match(events, /wealth_partner_invitation/);
assert.match(events, /document_request/);
assert.match(events, /CHANNEL_PARTNERS/);
assert.match(events, /CUSTOMERS/);
assert.match(events, /ECC_EMAIL_TEMPLATE_PROFILE_REFS/);

const schema = read("prisma/schema.prisma");
assert.match(schema, /model EnterpriseCommunicationProfile/);
assert.match(schema, /smtp_password_enc/);

const migration = read(
  "prisma/migrations/20260731190000_co_ecc_001_communication_profiles/migration.sql",
);
assert.match(migration, /enterprise_communication_profiles/);

const service = read("server/services/enterprise-communication-center/ecc.service.ts");
assert.match(service, /resolveIdentity/);
assert.match(service, /ensureProfilesSeeded/);

const invite = read("server/services/invitation-engine/invitation-engine.service.ts");
assert.match(invite, /wealth_partner_invitation/);
assert.match(invite, /enterpriseCommunicationCenterService/);
assert.doesNotMatch(invite, /ENTERPRISE_COMMUNICATION_SENDER_SEED/);

const adminUi = read(
  "src/components/catalyst-one/admin/enterprise-communication/enterprise-communication-center-admin.tsx",
);
assert.match(adminUi, /Enterprise Communication Center/);
assert.match(adminUi, /SMTP Provider/);
assert.match(adminUi, /Reply-To Email/);

const page = read("src/app/(dashboard)/admin/enterprise-communication/page.tsx");
assert.match(page, /EnterpriseCommunicationCenterAdmin/);

const routes = read("src/constants/routes.ts");
assert.match(routes, /ADMIN_ENTERPRISE_COMMUNICATION/);

const nav = read("src/config/navigation.ts");
assert.match(nav, /ADMIN_ENTERPRISE_COMMUNICATION/);

const consoleReg = read("src/constants/administration-console.ts");
assert.match(consoleReg, /enterprise-communication/);

const docReq = read("src/constants/document-requests/index.ts");
assert.match(docReq, /DOCUMENT_REQUEST_COMMUNICATION_REF/);
assert.match(docReq, /getCommunicationProfileSeed/);

const report = read("docs/co-ecc-001/CO-ECC-001-COMMUNICATION-CENTER-READINESS-REPORT.md");
assert.match(report, /Business Acceptance Checklist/);
assert.match(report, /CHANNEL_PARTNERS/);

console.log("CO-ECC-001 verify: PASS");
