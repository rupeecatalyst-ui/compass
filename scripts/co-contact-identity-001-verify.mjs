/**
 * CO-CONTACT-IDENTITY-001 — smoke verify (no deploy).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `Missing: ${rel}`);
  return fs.readFileSync(p, "utf8");
}

mustExist("src/components/catalyst-one/contacts/restore-contact-dialog.tsx");
mustExist("src/app/api/ecm/contacts/identity/route.ts");
mustExist("server/services/ecm/contact-identity-errors.ts");

const service = mustExist("server/services/ecm/contact.service.ts");
assert.match(service, /resolveIdentityByMobile/);
assert.match(service, /EcmContactSoftDeletedError/);
assert.match(service, /findIdentityByMobile/);

const repo = mustExist("server/repositories/ecm/contact.repository.ts");
assert.match(repo, /findIdentityByMobile/);

const route = mustExist("src/app/api/ecm/contacts/route.ts");
assert.match(route, /ECM_CONTACT_SOFT_DELETED/);
assert.match(route, /softDeletedContact/);
assert.doesNotMatch(route, /Create New Anyway/);

const progressive = mustExist(
  "src/components/catalyst-one/contacts/progressive-contact-create-modal.tsx",
);
assert.match(progressive, /RestoreContactDialog/);
assert.match(progressive, /lookupContactIdentity/);

const wizard = mustExist(
  "src/components/catalyst-one/contacts/quick-contact-creation-wizard.tsx",
);
assert.match(wizard, /RestoreContactDialog/);
assert.match(wizard, /lookupContactIdentity/);

const dialog = mustExist(
  "src/components/catalyst-one/contacts/restore-contact-dialog.tsx",
);
assert.match(dialog, /Restore Contact/);
assert.match(dialog, /Opportunities/);
assert.doesNotMatch(dialog, /Create New Anyway/);

const nav = mustExist("src/config/navigation.ts");
assert.match(nav, /Enterprise Recovery Center/);
assert.match(nav, /ADMIN_ENTERPRISE_RECOVERY_CENTER/);

const admin = mustExist("src/constants/administration-console.ts");
assert.match(admin, /recovery-center/);

const recoveryPage = mustExist(
  "src/app/(dashboard)/admin/enterprise-recovery-center/page.tsx",
);
assert.match(recoveryPage, /EnterpriseRecoveryCenterWorkspace/);

// No schema redesign artefacts
assert.doesNotMatch(repo, /partial.*unique|@@unique.*deleted/i);

console.log("CO-CONTACT-IDENTITY-001 verify: PASS");
