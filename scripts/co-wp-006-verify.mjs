/**
 * CO-WP-006 — Wealth Partner conversion integrity verify (static).
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
  "server/services/wealth-partner-registry/wealth-partner-registry.service.ts",
  "server/repositories/wealth-partner-registry/wealth-partner-registry.repository.ts",
  "src/app/api/wealth-partner-registry/_lib/route-utils.ts",
  "src/lib/enterprise-wealth-partner-registry/index.ts",
  "src/components/catalyst-one/wealth-partner-registry/create-wealth-partner-wizard.tsx",
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-registry-view.tsx",
  "docs/co-wp-006/CO-WP-006-WEALTH-PARTNER-CONVERSION-INTEGRITY-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const service = read(
  "server/services/wealth-partner-registry/wealth-partner-registry.service.ts",
);
assert.match(service, /WealthPartnerAlreadyExistsError/);
assert.match(service, /This Contact is already an active Wealth Partner/);
assert.match(service, /Selected Contact not found/);
assert.match(service, /conversion_duplicate_detected/);
assert.match(service, /findSoftDeletedByIdentity/);
assert.match(service, /restoreSoftDeletedPartner/);
assert.ok(!/Contact already converted into a Wealth Partner \(\$\{existing\.code\}\)/.test(service));
assert.ok(!service.includes("This Contact is already registered as a Wealth Partner."));

const routeUtils = read("src/app/api/wealth-partner-registry/_lib/route-utils.ts");
assert.match(routeUtils, /WEALTH_PARTNER_ALREADY_REGISTERED/);
assert.match(routeUtils, /existingWealthPartner/);
assert.match(routeUtils, /WEALTH_PARTNER_CODE_COLLISION/);
assert.ok(
  !routeUtils.includes(
    "Contact already converted into a Wealth Partner (or a duplicate Wealth Partner code exists).",
  ),
);

const repo = read(
  "server/repositories/wealth-partner-registry/wealth-partner-registry.repository.ts",
);
assert.match(repo, /maxAttempts/);
assert.match(repo, /relationship_recovered/);
assert.match(repo, /contactId/);

const client = read("src/lib/enterprise-wealth-partner-registry/index.ts");
assert.match(client, /WealthPartnerApiError/);
assert.match(client, /existingWealthPartner/);
assert.match(client, /findByIdentity/);

const wizard = read(
  "src/components/catalyst-one/wealth-partner-registry/create-wealth-partner-wizard.tsx",
);
assert.match(wizard, /already-registered/);
assert.match(wizard, /Open Wealth Partner/);
assert.match(wizard, /Created Date/);
assert.match(wizard, /wealthPartnerTypeLabel/);

const view = read(
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-registry-view.tsx",
);
assert.match(view, /toast\.error/);
assert.match(view, /onOpenExisting/);

console.log("CO-WP-006 Wealth Partner Conversion Integrity verify: PASS");
console.log("NOTE: No migrate / no deploy / no live-data mutation.");
