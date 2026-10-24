/**
 * Focused tests: durable Google Sheets binding hydration after process restart.
 * Isolated memory durability. No Prisma production writes, no Google API, no listBindings.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED = "false";
process.env.NODE_ENV = "production";
process.env.ENTERPRISE_MARKETING_SHEETS_MODE = "live";
process.env.ENTERPRISE_MARKETING_ALLOW_FIXTURE = "false";
process.env.GOOGLE_SHEETS_CLIENT_EMAIL = "isolated-hydration@example.invalid";
process.env.GOOGLE_SHEETS_PRIVATE_KEY = "isolated-hydration-not-a-real-key";
delete process.env.MARKETING_SHEETS_DEFAULT_SPREADSHEET_ID;
delete process.env.MARKETING_SHEETS_DEFAULT_ORG_ID;
process.env.ENTERPRISE_MARKETING_AUTHORISED_SPREADSHEET_ID = "HL_EXISTING_SHEET_ID";

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const results = [];
function record(id, status, evidence) {
  results.push({ id, status, evidence });
  console.log(`${status}\t${id}\t${evidence}`);
}

const adapterSrc = read("server/services/enterprise-marketing-engine/adapters/google-sheets.adapter.ts");
assert.ok(adapterSrc.includes("resolveRuntimeWorkbookForOrg"));
assert.ok(adapterSrc.includes("await requireBinding(bindingId, organizationId)"));
assert.equal((adapterSrc.match(/await requireBinding\(bindingId, organizationId\)/g) || []).length >= 6, true);
assert.doesNotMatch(
  adapterSrc,
  /requireBinding[\s\S]{0,400}marketingDataSourceBindingStore\.getForOrg/,
);
record("ADAPTER_USES_DURABLE_RESOLVE", "PASS", "discover/schema/health/preview/stream await durable resolveRuntimeWorkbookForOrg");

const durability = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/durability/composition.ts")).href
);
const memoryPorts = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/durability/repositories/memory.ts")).href
);
const registry = await import(
  pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/workbook-registry.ts")).href
);
const bindingStore = await import(
  pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/binding-store.ts")).href
);

durability.resetMarketingDurabilityComposition();
const ts = new Date().toISOString();
const org = "org-hl";
const otherOrg = "org-other";
const hlId = `mkt-src-env-${org}`;
const secondId = `mkt-src-${org}-second`;
const revokedId = `mkt-src-${org}-revoked`;
const foreignId = `mkt-src-${otherOrg}-foreign`;

function stamp(id, organizationId, spreadsheetId, extra = {}) {
  return {
    id,
    organizationId,
    displayName: spreadsheetId,
    spreadsheetId,
    driveFileId: spreadsheetId,
    authorised: extra.authorised !== false,
    authRef: "google-sheets:service-account",
    status: extra.status ?? "ACTIVE",
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

const ports = memoryPorts.createMemoryMarketingDurabilityPorts({
  bindings: [
    stamp(hlId, org, "HL_EXISTING_SHEET_ID"),
    stamp(secondId, org, "SECOND_AUTHORISED_SHEET_ID"),
    stamp(revokedId, org, "REVOKED_SHEET_ID", { authorised: false, status: "DISABLED" }),
    stamp(foreignId, otherOrg, "FOREIGN_SHEET_ID"),
  ],
});

let durableGets = 0;
const originalGet = ports.bindings.getForOrg.bind(ports.bindings);
ports.bindings.getForOrg = async (id, organizationId) => {
  durableGets += 1;
  return originalGet(id, organizationId);
};

durability.configureMarketingDurabilityTestFixture(ports);
bindingStore.clearRuntimeMarketingBindingsForTests();

const afterRestart = await registry.resolveRuntimeWorkbookForOrg(secondId, org);
assert.equal(afterRestart.spreadsheetId, "SECOND_AUTHORISED_SHEET_ID");
assert.equal(afterRestart.organizationId, org);
assert.equal(afterRestart.id, secondId);
assert.equal(bindingStore.marketingDataSourceBindingStore.getForOrg(secondId, org)?.spreadsheetId, "SECOND_AUTHORISED_SHEET_ID");
assert.equal(durableGets, 1);
record(
  "SECOND_WORKBOOK_AFTER_RESTART",
  "PASS",
  "Persisted second workbook resolved after runtime cache clear without listBindings",
);

const cachedGets = durableGets;
const cached = await registry.resolveRuntimeWorkbookForOrg(secondId, org);
assert.equal(cached.spreadsheetId, "SECOND_AUTHORISED_SHEET_ID");
assert.equal(cached.status, "ACTIVE");
assert.ok(durableGets > cachedGets);
record(
  "ACTIVE_CACHE_RECHECKS_DURABLE",
  "PASS",
  "Hydrated ACTIVE binding still re-reads the organisation-scoped persisted record",
);

const hl = await registry.resolveRuntimeWorkbookForOrg(hlId, org);
assert.equal(hl.spreadsheetId, "HL_EXISTING_SHEET_ID");
assert.notEqual(hl.spreadsheetId, afterRestart.spreadsheetId);
record("HL_SOURCE_STILL_RESOLVES", "PASS", "Home Loan env workbook still resolves by its own bindingId");

try {
  await registry.resolveRuntimeWorkbookForOrg("mkt-src-unknown", org);
  throw new Error("expected NOT_FOUND");
} catch (err) {
  assert.equal(err.code, "NOT_FOUND");
  assert.equal(err.statusCode, 404);
}
record("UNKNOWN_BINDING_FAILS_CLOSED", "PASS", "Unknown bindingId is NOT_FOUND");

try {
  await registry.resolveRuntimeWorkbookForOrg(foreignId, org);
  throw new Error("expected NOT_FOUND cross-org");
} catch (err) {
  assert.equal(err.code, "NOT_FOUND");
}
const foreignStill = await ports.bindings.getForOrg(foreignId, otherOrg);
assert.equal(foreignStill?.spreadsheetId, "FOREIGN_SHEET_ID");
record("CROSS_ORG_FAILS_CLOSED", "PASS", "Foreign-org binding is not readable in the Home Loan org");

try {
  await registry.resolveRuntimeWorkbookForOrg(revokedId, org);
  throw new Error("expected ACCESS_REVOKED");
} catch (err) {
  assert.equal(err.code, "ACCESS_REVOKED");
  assert.equal(err.statusCode, 403);
}
const afterRevokeHl = await registry.resolveRuntimeWorkbookForOrg(hlId, org);
assert.equal(afterRevokeHl.spreadsheetId, "HL_EXISTING_SHEET_ID");
record(
  "REVOKED_DOES_NOT_FALL_BACK_TO_HL",
  "PASS",
  "Revoked workbook fails ACCESS_REVOKED and does not return the Home Loan spreadsheetId",
);

await ports.bindings.upsert(stamp(secondId, org, "SECOND_AUTHORISED_SHEET_ID", { authorised: false, status: "DISABLED" }));
try {
  await registry.resolveRuntimeWorkbookForOrg(secondId, org);
  throw new Error("expected ACCESS_REVOKED after other-process revoke");
} catch (err) {
  assert.equal(err.code, "ACCESS_REVOKED");
}
assert.equal(bindingStore.marketingDataSourceBindingStore.getForOrg(secondId, org)?.status, "DISABLED");
record(
  "OTHER_PROCESS_REVOKE_FAILS_CLOSED",
  "PASS",
  "Durable DISABLED/authorised=false rejects the next resolve even when this process had ACTIVE cache",
);

bindingStore.hydrateRuntimeBinding({
  id: secondId,
  organizationId: org,
  providerType: "GOOGLE_SHEETS",
  displayName: "stale-active",
  spreadsheetId: "SECOND_AUTHORISED_SHEET_ID",
  driveFileId: "SECOND_AUTHORISED_SHEET_ID",
  authRef: "google-sheets:service-account",
  status: "ACTIVE",
  createdAt: ts,
  updatedAt: ts,
});
try {
  await registry.resolveRuntimeWorkbookForOrg(secondId, org);
  throw new Error("expected ACCESS_REVOKED stale ACTIVE vs durable DISABLED");
} catch (err) {
  assert.equal(err.code, "ACCESS_REVOKED");
}
record("ACTIVE_CACHE_CANNOT_OVERRIDE_DISABLED", "PASS", "Stale ACTIVE runtime cache cannot override durable DISABLED");

const failingGet = ports.bindings.getForOrg;
ports.bindings.getForOrg = async () => {
  throw Object.assign(new Error("durability unavailable"), { statusCode: 503, code: "DURABLE_UNAVAILABLE" });
};
bindingStore.hydrateRuntimeBinding({
  id: hlId,
  organizationId: org,
  providerType: "GOOGLE_SHEETS",
  displayName: "HL",
  spreadsheetId: "HL_EXISTING_SHEET_ID",
  driveFileId: "HL_EXISTING_SHEET_ID",
  authRef: "google-sheets:service-account",
  status: "ACTIVE",
  createdAt: ts,
  updatedAt: ts,
});
try {
  await registry.resolveRuntimeWorkbookForOrg(hlId, org);
  throw new Error("expected lookup failure not to use cached ACTIVE");
} catch (err) {
  assert.notEqual(err.code, undefined);
  assert.notEqual(err.message, "expected lookup failure not to use cached ACTIVE");
  assert.equal(err.code === "ACCESS_REVOKED" || err.statusCode === 503 || err.code === "DURABLE_UNAVAILABLE" || err.code === "BINDING_LOOKUP_FAILED", true);
}
ports.bindings.getForOrg = failingGet;
record(
  "LOOKUP_FAILURE_DOES_NOT_USE_CACHE",
  "PASS",
  "Authoritative getForOrg failure does not fall back to cached ACTIVE",
);

const hlAfter = await registry.resolveRuntimeWorkbookForOrg(hlId, org);
assert.equal(hlAfter.spreadsheetId, "HL_EXISTING_SHEET_ID");
assert.equal(hlAfter.status, "ACTIVE");
record("HL_STILL_RESOLVES_AFTER_REVOKE_CHECKS", "PASS", "Home Loan binding still resolves after fail-closed revoke/lookup paths");

durability.resetMarketingDurabilityComposition();
console.log(JSON.stringify({ results }, null, 2));
const failed = results.filter((r) => r.status !== "PASS");
if (failed.length) process.exit(1);
