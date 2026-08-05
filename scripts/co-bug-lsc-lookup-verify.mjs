/**
 * CO-BUG-LSC-LOOKUP — Lender Sales Contact SSOT + performance verification.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const lib = read("src/lib/lender-sales-contact/index.ts");
assert.match(lib, /searchLenderSalesContactsLive/);
assert.match(lib, /institutionKeys/);
assert.match(lib, /skipTotal:\s*true/);
assert.match(lib, /ecmApiClient\.queryContacts/);
assert.match(lib, /contactProductPriority/);
assert.doesNotMatch(lib, /apiQuery = userQuery \|\| lenderBias/);
const liveFn = lib.slice(lib.indexOf("export async function searchLenderSalesContactsLive"));
const liveFnBody = liveFn.slice(0, liveFn.indexOf("export async function findLenderSalesContactDuplicatesLive"));
assert.match(liveFnBody, /institutionKeys/);
assert.match(liveFnBody, /userQuery\.length >= 2/);
assert.doesNotMatch(liveFnBody, /liveListAllEcmContactsByRole/);
assert.doesNotMatch(liveFnBody, /listBankerContacts\(\)/);
assert.doesNotMatch(liveFnBody, /maxPages:\s*25/);

const repo = read("server/repositories/ecm/contact.repository.ts");
assert.match(repo, /queryByInstitutionKeys/);
assert.match(repo, /institutionKeys/);
assert.match(repo, /skipTotal/);
assert.match(repo, /lender_employee.*institution|path: \["lender_employee", "institution"\]/);

const route = read("src/app/api/ecm/contacts/route.ts");
assert.match(route, /institutionKeys/);
assert.match(route, /skipTotal/);
assert.match(route, /Do NOT sync full registry/);
assert.doesNotMatch(
  route,
  /const result = await ecmContactService\.query\(query\);\s*await syncEcmPortsFromPrisma\(\)/,
);

const client = read("src/lib/enterprise-persistence/ecm-api-client.ts");
assert.match(client, /institutionKeys/);
assert.match(client, /skipTotal/);

const ui = read("src/components/catalyst-one/execution/lender-sales-contact-capture.tsx");
assert.match(ui, /searchLenderSalesContactsLive/);
assert.doesNotMatch(ui, /hydrating \|\| searching/);

const migration = path.join(
  root,
  "prisma/migrations/20260805120000_co_bug_lsc_institution_lookup/migration.sql",
);
assert.ok(fs.existsSync(migration), "institution lookup migration missing");

console.log("CO-BUG-LSC-LOOKUP verify: PASS");
