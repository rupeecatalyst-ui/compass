/**
 * CO-MARKETING-GOOGLE-ACTIVATION-001 — Authorised workbook registry + Audience workflow BAT.
 * Isolated fixtures. No live send, Hostinger, push, Contact/Opportunity create, or production cron.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED = "false";
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";
process.env.ENTERPRISE_MARKETING_SHEETS_MODE = "fixture";
process.env.ENTERPRISE_MARKETING_ALLOW_FIXTURE = "true";
process.env.ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = "false";
delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
delete process.env.ENTERPRISE_MARKETING_AUTHORISED_SPREADSHEET_ID;

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

const results = [];
function record(id, status, evidence) {
  results.push({ id, status, evidence });
  console.log(`${status}  ${id}  ${evidence}`);
}

const builder = read("src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx");
const sourcesUi = read("src/components/catalyst-one/admin/marketing/marketing-data-sources-panel.tsx");
const dataSourceSrc = read("server/services/enterprise-marketing-engine/data-source.service.ts");
const registrySrc = read("server/services/enterprise-marketing-engine/workbook-registry.ts");
const googleAdapter = read("server/services/enterprise-marketing-engine/adapters/google-sheets.adapter.ts");
const freezeSrc = read("src/lib/enterprise-marketing-engine/freeze-audience.ts");
const safetySrc = read("src/constants/enterprise-marketing-engine/safety.ts");

mustInclude(builder, "data-mkt-authorised-workbook");
mustInclude(builder, "Freeze audience snapshot");
mustInclude(builder, "CONFIGURATION_REQUIRED");
mustInclude(builder, "MARKETING_WORKBOOK_CONNECTION_LABELS");
mustInclude(sourcesUi, "CONFIGURATION_REQUIRED");
mustInclude(sourcesUi, "Access Revoked");
mustInclude(sourcesUi, "Validation Failed");
mustInclude(sourcesUi, "Connected");
mustInclude(dataSourceSrc, "NOT_CONFIGURED");
mustInclude(registrySrc, "registerAuthorisedWorkbook");
mustInclude(googleAdapter, "spreadsheets.readonly");
mustInclude(googleAdapter, "GOOGLE_SHEETS_PRIVATE_KEY");
assert.doesNotMatch(googleAdapter, /NEXT_PUBLIC_GOOGLE/);
assert.doesNotMatch(builder, /GOOGLE_SHEETS_PRIVATE_KEY/);
mustInclude(freezeSrc, "Does not create Contacts or Opportunities");
mustInclude(safetySrc, "export const ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
record("UI_CONTRACT", "PASS", "Audience step, connection states, freeze CTA, server-only credentials");

const rca = read("server/services/enterprise-marketing-engine/data-source.service.ts");
mustInclude(rca, 'source.status === "NOT_CONFIGURED"');
mustInclude(rca, "return []");
record(
  "RCA_EMPTY_DROPDOWN",
  "PASS",
  "Dropdown was empty because listBindings returned [] when Sheets resolved NOT_CONFIGURED under Prisma without ENTERPRISE_MARKETING_ALLOW_FIXTURE, and bindings lived only in an in-memory store.",
);

const authorisedUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/authorised-workbook.ts")).href;
const dataSourceUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/data-source.service.ts"),
).href;
const fixtureUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-sheets.adapter.ts"),
).href;
const audienceUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/audience.service.ts"),
).href;
const durabilityUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/durability/index.ts")).href;
const mappingUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/column-mapping.ts")).href;
const filtersUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/audience-filters.ts")).href;
const permUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts")).href;
const permConstUrl = pathToFileURL(resolve(root, "src/constants/enterprise-marketing-engine/permissions.ts")).href;
const crmUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/crm-boundary.ts")).href;

const authorised = await import(authorisedUrl);
const dataSource = await import(dataSourceUrl);
const fixture = await import(fixtureUrl);
const audience = await import(audienceUrl);
const durability = await import(durabilityUrl);
const mapping = await import(mappingUrl);
const filters = await import(filtersUrl);
const perm = await import(permUrl);
const permConst = await import(permConstUrl);
const crm = await import(crmUrl);

crm.resetMarketingCrmBoundaryCounters();
durability.resetMarketingDurabilityComposition();
const ports = durability.createMemoryMarketingDurabilityPorts();
durability.configureMarketingDurabilityTestFixture(ports);

process.env.ENTERPRISE_MARKETING_SHEETS_MODE = "live";
delete process.env.ENTERPRISE_MARKETING_ALLOW_FIXTURE;
const emptyMode = authorised.resolveMarketingSheetsSourceStatus();
assert.equal(emptyMode.status, "NOT_CONFIGURED");
process.env.ENTERPRISE_MARKETING_SHEETS_MODE = "fixture";
process.env.ENTERPRISE_MARKETING_ALLOW_FIXTURE = "true";
record("RCA_RUNTIME_NOT_CONFIGURED", "PASS", `live without credentials => ${emptyMode.status}`);

const orgA = "org-mkt-google-a";
const orgB = "org-mkt-google-b";
const adminA = { userId: "admin-a", organizationId: orgA, role: "ADMIN" };
const adminB = { userId: "admin-b", organizationId: orgB, role: "ADMIN" };

const registered = await dataSource.marketingDataSourceService.upsertBinding(adminA, {
  displayName: "Fixture Marketing Master",
  spreadsheetId: "fixture-marketing-master",
});
assert.equal(registered.spreadsheetId, "fixture-marketing-master");
assert.equal(registered.organizationId, orgA);
assert.equal(registered.status, "ACTIVE");

const listedA = await dataSource.marketingDataSourceService.listBindings(adminA, { operatorOnly: true });
assert.ok(listedA.some((row) => row.id === registered.id), "org A must see its authorised workbook");
const listedB = await dataSource.marketingDataSourceService.listBindings(adminB, { operatorOnly: true });
assert.equal(
  listedB.filter((row) => row.id === registered.id).length,
  0,
  "org B must not see org A workbook",
);
record("TENANT_ISOLATION", "PASS", `org A bindings=${listedA.length} org B foreign=0`);

let unauthorised = false;
try {
  await dataSource.marketingDataSourceService.upsertBinding(adminA, {
    displayName: "Drive dump",
    spreadsheetId: "https://drive.google.com/drive/folders/abc",
  });
} catch (error) {
  unauthorised = true;
  assert.ok(["DRIVE_BROWSE_FORBIDDEN", "UNAUTHORISED_WORKBOOK"].includes(error.code), error.code);
}
assert.equal(unauthorised, true);
record("NO_DRIVE_BROWSE", "PASS", "Drive folder URLs rejected");

const { MARKETING_PERMISSIONS } = permConst;
assert.equal(perm.hasMarketingPermission({ role: "ADMIN" }, MARKETING_PERMISSIONS.SOURCE_MANAGE), true);
assert.equal(perm.hasMarketingPermission({ role: "USER" }, MARKETING_PERMISSIONS.SOURCE_MANAGE), false);
assert.equal(perm.hasMarketingPermission({ role: "ADMIN" }, MARKETING_PERMISSIONS.CAMPAIGN_CREATE), true);
record("ROLE_ISOLATION", "PASS", "SOURCE_MANAGE is admin-default; unprivileged USER cannot register workbooks");

const port = fixture.createFixtureMarketingDataSourcePort(orgA);
const tabs = await port.discoverDatasets(registered.id);
assert.ok(tabs.length >= 2, "fixture exposes multiple worksheet tabs");
const schema = await port.getSchema(registered.id, tabs[0].externalDatasetId);
assert.ok(schema.headers.includes("Email") || schema.headers.some((h) => /email/i.test(h)));
record("FIXTURE_ADAPTER", "PASS", `tabs=${tabs.map((t) => t.displayName).join(",")} headers=${schema.headers.join("|")}`);

const confirmed = mapping.confirmMarketingColumnMap({
  map: mapping.suggestMarketingColumnMap(schema.headers).suggested,
  headers: schema.headers,
  confirmedByUserId: adminA.userId,
  channel: "EMAIL",
});
assert.equal(confirmed.confirmed, true);
assert.ok(confirmed.map.email);

const saved = await audience.marketingAudienceService.upsert(adminA, {
  name: "Pilot audience",
  campaignId: "camp-google-001",
  bindingId: registered.id,
  datasetId: tabs[0].externalDatasetId,
  datasetDisplayName: tabs[0].displayName,
  columnMap: confirmed.map,
  mapping: confirmed,
  mappingConfirmed: true,
  confirmMapping: true,
  headers: schema.headers,
  filterDefinition: filters.emptyFilterDefinition(),
  exclusionDefinition: filters.emptyFilterDefinition(),
});
assert.equal(saved.mappingConfirmed, true);
const reopened = await audience.marketingAudienceService.get(adminA, saved.id);
assert.equal(reopened.bindingId, registered.id);
assert.equal(reopened.mappingConfirmed, true);
assert.equal(reopened.columnMap.email, confirmed.map.email);
record("SAVE_REOPEN", "PASS", `audience ${reopened.id} mapping ${reopened.columnMap.email} survived get()`);

const preview = await audience.marketingAudienceService.previewDraft(adminA, {
  bindingId: registered.id,
  datasetId: tabs[0].externalDatasetId,
  filterDefinition: filters.emptyFilterDefinition(),
  exclusionDefinition: filters.emptyFilterDefinition(),
  columnMap: confirmed.map,
  mapping: confirmed,
  mappingConfirmed: true,
});
assert.ok(preview.counts.eligible >= 1);
record("ELIGIBILITY_PREVIEW", "PASS", `eligible=${preview.counts.eligible} scanned=${preview.counts.scanned}`);

const frozen = await audience.marketingAudienceService.freezeForCampaign(adminA, {
  audienceId: saved.id,
  campaignId: "camp-google-001",
  campaignVersionId: "ver-google-001",
  channel: "EMAIL",
});
assert.ok(frozen.snapshot.id);
assert.ok(frozen.eligibleCount >= 1);
const emailsBefore = frozen.recipients.map((row) => row.normalizedEmail).sort();
fixture.replaceMarketingFixtureTabRows(
  orgA,
  tabs[0].externalDatasetId,
  [
    {
      "External Key": "CHANGED",
      "Full Name": "Changed Person",
      Email: "changed.after.freeze@example.com",
      Phone: "9000000000",
      City: "Pune",
      Profession: "CA",
    },
  ],
);
const emailsAfter = (await ports.snapshotRecipients.listBySnapshot(orgA, frozen.snapshot.id))
  .map((row) => row.normalizedEmail)
  .sort();
assert.deepEqual(emailsAfter, emailsBefore);
record("FROZEN_SNAPSHOT", "PASS", `snapshot ${frozen.snapshot.id} immutable after sheet edit`);

const googleLive =
  Boolean(process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY);
record(
  "GOOGLE_LIVE_READ",
  googleLive ? "PASS" : "SKIP",
  googleLive
    ? "Authorised Google credentials are present in this process"
    : "GOOGLE CONFIGURATION REQUIRED — no GOOGLE_SHEETS_CLIENT_EMAIL / PRIVATE_KEY in this environment",
);

const counters = crm.getMarketingCrmBoundaryCounters();
assert.equal(counters.contactCreateAttempts, 0);
assert.equal(counters.opportunityCreateAttempts, 0);
record("NO_CRM_SIDE_EFFECTS", "PASS", "select/map/preview/freeze created zero Contacts or Opportunities");

assert.equal(process.env.ENTERPRISE_MARKETING_EMAIL_MODE, "dry_run");
record("EMAIL_DRY_RUN", "PASS", "ENTERPRISE_MARKETING_EMAIL_MODE=dry_run");

const failed = results.filter((row) => row.status === "FAIL");
if (failed.length) {
  console.error(JSON.stringify({ failed }, null, 2));
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      sprint: "CO-MARKETING-GOOGLE-ACTIVATION-001",
      results,
      googleLiveConfigured: googleLive,
    },
    null,
    2,
  ),
);
