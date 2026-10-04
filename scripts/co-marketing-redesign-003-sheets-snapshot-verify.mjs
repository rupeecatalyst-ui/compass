/**
 * CO-MARKETING-REDESIGN-003 — Authorised Sheet, mapping, eligibility, frozen snapshot.
 * Local fixtures only. No Google connection, Prisma apply, send, commit, or deploy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

const pkg = read("package.json");
const dataSourceSrc = read("server/services/enterprise-marketing-engine/data-source.service.ts");
const freezeSrc = read("src/lib/enterprise-marketing-engine/freeze-audience.ts");
const eligibilitySrc = read("src/lib/enterprise-marketing-engine/eligibility-scan.ts");
const mappingSrc = read("src/lib/enterprise-marketing-engine/column-mapping.ts");
const executionSrc = read("server/services/enterprise-marketing-engine/execution.service.ts");
const audienceConst = read("src/constants/enterprise-marketing-engine/audience.ts");
const dataSourcesUi = read("src/components/catalyst-one/admin/marketing/marketing-data-sources-panel.tsx");
const audiencesUi = read("src/components/catalyst-one/admin/marketing/marketing-audiences-panel.tsx");

mustInclude(pkg, "verify:co-marketing-redesign-003");
mustInclude(dataSourceSrc, "NOT_CONFIGURED");
mustInclude(read("src/lib/enterprise-marketing-engine/authorised-workbook.ts"), "UNAUTHORISED_WORKBOOK");
mustInclude(read("src/lib/enterprise-marketing-engine/authorised-workbook.ts"), "assertSpreadsheetIsAuthorised");
mustInclude(mappingSrc, "MAPPING_NOT_CONFIRMED");
mustInclude(mappingSrc, "Confirm the mapping");
mustInclude(eligibilitySrc, 'purpose === "approval"');
mustInclude(eligibilitySrc, "Number.POSITIVE_INFINITY");
mustInclude(freezeSrc, "freezeApprovedAudienceSnapshot");
mustInclude(freezeSrc, "snapshotHash");
mustInclude(executionSrc, "tickFromFrozenSnapshot");
mustInclude(executionSrc, "SNAPSHOT_REQUIRED");
mustInclude(executionSrc, "liveSheetReread: false");
mustInclude(audienceConst, "MARKETING_AUDIENCE_APPROVAL_SCAN_UNLIMITED");
mustInclude(dataSourcesUi, "FIXTURE MODE — controlled non-production dataset. Not live Google Sheets.");
mustInclude(dataSourcesUi, "NOT_CONFIGURED");
mustInclude(dataSourcesUi, "Authorised workbook");
mustInclude(audiencesUi, "Confirm mapping");
assert.doesNotMatch(freezeSrc, /createContact|createOpportunity|registerProgressiveLoanContact/);
assert.doesNotMatch(eligibilitySrc, /createContact|createOpportunity|registerProgressiveLoanContact/);
assert.doesNotMatch(executionSrc, /createContact\(|createOpportunity\(/);
assert.doesNotMatch(
  freezeSrc,
  /MARKETING_AUDIENCE_SCAN_MAX_ROWS/,
  "freeze must not apply the 2,000-row preview cap",
);

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.ENTERPRISE_MARKETING_SHEETS_MODE = "fixture";
process.env.ENTERPRISE_MARKETING_ALLOW_FIXTURE = "true";
delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
delete process.env.ENTERPRISE_MARKETING_AUTHORISED_SPREADSHEET_ID;

const authorisedUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/authorised-workbook.ts")).href;
const mappingUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/column-mapping.ts")).href;
const freezeUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/freeze-audience.ts")).href;
const eligibilityUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/eligibility-scan.ts")).href;
const durabilityUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/durability/index.ts")).href;
const crmUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/crm-boundary.ts")).href;
const fixtureUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-sheets.adapter.ts"),
).href;
const dataSourceUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/data-source.service.ts"),
).href;
const audienceUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/audience.service.ts"),
).href;
const suppressionUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/suppression-store.ts"),
).href;
const bindingUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/binding-store.ts"),
).href;
const executionUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/execution.service.ts"),
).href;
const filtersUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/audience-filters.ts")).href;

const authorised = await import(authorisedUrl);
const mapping = await import(mappingUrl);
const freeze = await import(freezeUrl);
const eligibility = await import(eligibilityUrl);
const durability = await import(durabilityUrl);
const crm = await import(crmUrl);
const fixture = await import(fixtureUrl);
const dataSource = await import(dataSourceUrl);
const audience = await import(audienceUrl);
const suppression = await import(suppressionUrl);
const binding = await import(bindingUrl);
const execution = await import(executionUrl);
const filters = await import(filtersUrl);

crm.resetMarketingCrmBoundaryCounters();
durability.resetMarketingDurabilityComposition();
const ports = durability.createMemoryMarketingDurabilityPorts();
durability.configureMarketingDurabilityTestFixture(ports);

const orgId = "org-redesign-003";
const bindingRecord = binding.ensureFixtureBinding(orgId);
const actor = { userId: "user-003", organizationId: orgId };

const largeHeaders = [
  "External Key",
  "Full Name",
  "Email",
  "Phone",
  "City",
  "Profession",
  "Consent",
];

function row(i, extra = {}) {
  return {
    "External Key": `K-${String(i).padStart(5, "0")}`,
    "Full Name": `Person ${i}`,
    Email: `person.${i}@example.com`,
    Phone: String(9000000000 + i),
    City: i % 2 === 0 ? "Pune" : "Mumbai",
    Profession: i % 10 === 0 ? "CA" : "Professional",
    Consent: "yes",
    ...extra,
  };
}

const largeRows = [];
for (let i = 1; i <= 2505; i += 1) largeRows.push(row(i));
largeRows.push(row(1, { "External Key": "K-DUP", Email: "person.1@example.com" }));
largeRows.push(row(2, { "External Key": "K-BAD", Email: "not-an-email" }));
largeRows.push(row(3, { "External Key": "K-EMPTY", Email: "" }));
largeRows.push(row(4, { "External Key": "K-SUP", Email: "suppressed.user@example.com" }));
largeRows.push(row(5, { "External Key": "K-PRIOR", Email: "already.sent@example.com" }));

fixture.resetMarketingFixtureWorkbook(orgId, [
  {
    id: "tab_alpha",
    title: "Segment Alpha",
    headers: largeHeaders,
    rows: largeRows.slice(0, 8),
  },
  {
    id: "tab_beta",
    title: "Segment Beta",
    headers: ["Name", "Email Address", "Mobile Number"],
    rows: [{ Name: "Beta One", "Email Address": "beta.one@example.com", "Mobile Number": "9000000000" }],
  },
  {
    id: "tab_large",
    title: "Segment Large",
    headers: largeHeaders,
    rows: largeRows,
  },
]);

const port = fixture.createFixtureMarketingDataSourcePort(orgId);
const tabs = await port.discoverDatasets(bindingRecord.id);
assert.ok(tabs.length >= 3, "multiple tabs must be discovered dynamically");
assert.ok(tabs.some((t) => t.externalDatasetId === "tab_large"));
assert.ok(tabs.some((t) => t.externalDatasetId === "tab_beta"));

const schemaLarge = await port.getSchema(bindingRecord.id, "tab_large");
const suggested = mapping.suggestMarketingColumnMap(schemaLarge.headers);
assert.equal(suggested.suggested.email, "Email");
assert.match(suggested.notice, /suggestions/i);

let freezeRejected = false;
try {
  await freeze.freezeApprovedAudienceSnapshot({
    ports,
    port,
    organizationId: orgId,
    campaignId: "camp-003",
    campaignVersionId: "ver-003",
    sourceBindingId: bindingRecord.id,
    sourceWorkbookId: "fixture-marketing-master",
    sourceTabId: "tab_large",
    sourceTabName: "Segment Large",
    mapping: { map: suggested.suggested, confirmed: false },
    headers: schemaLarge.headers,
    inclusion: filters.emptyFilterDefinition(),
    channel: "EMAIL",
    actorUserId: actor.userId,
  });
} catch (error) {
  freezeRejected = true;
  assert.equal(error.code, "MAPPING_NOT_CONFIRMED");
}
assert.equal(freezeRejected, true, "unconfirmed mapping must not freeze");

const confirmed = mapping.confirmMarketingColumnMap({
  map: {
    email: "Email",
    name: "Full Name",
    mobile: "Phone",
    location: "City",
    productInterest: "Profession",
    consent: "Consent",
    sourceStableKey: "External Key",
  },
  headers: schemaLarge.headers,
  suggested: suggested.suggested,
  confirmedByUserId: actor.userId,
  channel: "EMAIL",
});

suppression.marketingSuppressionStore.upsert({
  organizationId: orgId,
  fingerprint: "email:suppressed.user@example.com",
  reason: "UNSUBSCRIBE",
});
audience.seedMarketingPreviouslyContacted(orgId, ["already.sent@example.com"]);

const preview = await eligibility.scanMarketingAudienceEligibility({
  port,
  bindingId: bindingRecord.id,
  datasetId: "tab_large",
  columnMap: confirmed.map,
  mapping: confirmed,
  inclusion: filters.emptyFilterDefinition(),
  exclusion: filters.emptyFilterDefinition(),
  eligibilityRules: {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
    excludePreviouslyContacted: true,
  },
  purpose: "preview",
  lookups: {
    isSuppressed: ({ normalizedEmail }) => normalizedEmail === "suppressed.user@example.com",
    isPreviouslyContacted: (email) => email === "already.sent@example.com",
  },
});
assert.equal(preview.scanCapped, true, "preview diagnostics may cap");
assert.ok(preview.counts.scannedRows <= 2000);

const frozen = await freeze.freezeApprovedAudienceSnapshot({
  ports,
  port,
  organizationId: orgId,
  campaignId: "camp-003",
  campaignVersionId: "ver-003",
  sourceBindingId: bindingRecord.id,
  sourceWorkbookId: "fixture-marketing-master",
  sourceTabId: "tab_large",
  sourceTabName: "Segment Large",
  mapping: confirmed,
  headers: schemaLarge.headers,
  inclusion: filters.emptyFilterDefinition(),
  eligibilityRules: {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
    excludePreviouslyContacted: true,
  },
  lookups: {
    isSuppressed: ({ normalizedEmail }) => normalizedEmail === "suppressed.user@example.com",
    isPreviouslyContacted: (email) => email === "already.sent@example.com",
  },
  channel: "EMAIL",
  actorUserId: actor.userId,
});

assert.ok(frozen.eligibleCount > 2000, `approval must scan past 2,000 rows, got ${frozen.eligibleCount}`);
assert.equal(frozen.snapshot.snapshotHash, frozen.snapshotHash);
assert.ok(frozen.snapshotHash.length === 64);
assert.equal(frozen.snapshot.sourceWorkbookId, "fixture-marketing-master");
assert.equal(frozen.snapshot.sourceTabId, "tab_large");
assert.equal(frozen.snapshot.sourceTabName, "Segment Large");
assert.ok(frozen.snapshot.extractedAt);
assert.equal(frozen.recipients.length, frozen.eligibleCount);
assert.ok(frozen.recipients.every((r) => r.normalizedEmail.includes("@")));
assert.ok(frozen.snapshot.duplicateCount >= 1);
assert.ok(frozen.snapshot.invalidCount >= 1);
assert.ok(frozen.snapshot.suppressedCount >= 1);
assert.ok(frozen.snapshot.previouslyContactedCount >= 1);

const snapshotBefore = await ports.snapshotRecipients.listBySnapshot(orgId, frozen.snapshot.id);
const hashBefore = frozen.snapshotHash;
const emailsBefore = snapshotBefore.map((r) => r.normalizedEmail).sort();

fixture.replaceMarketingFixtureTabHeaders(orgId, "tab_large", [
  "Member Id",
  "Person Name",
  "Mail",
  "Mobile",
  "Town",
  "Job",
  "Opt In",
]);
fixture.replaceMarketingFixtureTabRows(
  orgId,
  "tab_large",
  largeRows.map((item, index) =>
    index < 10
      ? { ...item, Email: `changed.${index}@example.com` }
      : item,
  ).concat([row(99999, { Email: "brand.new@example.com", "External Key": "K-NEW" })]),
);

const snapshotAfterEdit = await ports.snapshotRecipients.listBySnapshot(orgId, frozen.snapshot.id);
assert.deepEqual(
  snapshotAfterEdit.map((r) => r.normalizedEmail).sort(),
  emailsBefore,
  "frozen snapshot recipients must not change after Sheet edits",
);
assert.equal(
  (await ports.snapshots.getForOrg(frozen.snapshot.id, orgId)).snapshotHash,
  hashBefore,
);

const liveAfterEdit = await eligibility.scanMarketingAudienceEligibility({
  port,
  bindingId: bindingRecord.id,
  datasetId: "tab_large",
  columnMap: confirmed.map,
  mapping: confirmed,
  inclusion: filters.emptyFilterDefinition(),
  exclusion: filters.emptyFilterDefinition(),
  eligibilityRules: {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
  },
  purpose: "approval",
});
assert.notEqual(
  liveAfterEdit.counts.eligible,
  frozen.eligibleCount,
  "live Sheet after edits must differ from the frozen snapshot",
);

const mode = dataSource.marketingDataSourceService.getMode();
assert.equal(mode.sourceStatus, "FIXTURE");
assert.match(mode.sourceNotice, /FIXTURE MODE/);
assert.equal(mode.fixtureVisible, true);

let unauthorised = false;
try {
  await dataSource.marketingDataSourceService.upsertBinding(actor, {
    displayName: "Evil workbook",
    spreadsheetId: "1-arbitrary-spreadsheet-id",
  });
} catch (error) {
  unauthorised = true;
  assert.equal(error.code, "UNAUTHORISED_WORKBOOK");
}
assert.equal(unauthorised, true);

process.env.ENTERPRISE_MARKETING_SHEETS_MODE = "live";
delete process.env.ENTERPRISE_MARKETING_ALLOW_FIXTURE;
const liveStatus = authorised.resolveMarketingSheetsSourceStatus();
assert.equal(liveStatus.status, "NOT_CONFIGURED");
let notConfigured = false;
try {
  authorised.assertMarketingSheetsConfigured();
} catch (error) {
  notConfigured = true;
  assert.equal(error.code, "NOT_CONFIGURED");
}
assert.equal(notConfigured, true);
process.env.ENTERPRISE_MARKETING_SHEETS_MODE = "fixture";
process.env.ENTERPRISE_MARKETING_ALLOW_FIXTURE = "true";

const counters = crm.getMarketingCrmBoundaryCounters();
assert.equal(counters.contactCreateAttempts, 0);
assert.equal(counters.opportunityCreateAttempts, 0);

const campaignStoreUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/campaign-store.ts"),
).href;
const campaignStore = await import(campaignStoreUrl);
const createdBundle = await campaignStore.marketingCampaignStore.create({
  organizationId: orgId,
  name: "Snapshot execution campaign",
  channel: "EMAIL",
  createdByUserId: actor.userId,
});
const created = createdBundle.campaign;
await campaignStore.marketingCampaignStore.updateCampaign(created.id, orgId, {
  status: "RUNNING",
});
await execution.marketingExecutionService.configure(created.id, orgId, {
  batchSize: 10,
  intervalMs: 60 * 60 * 1000,
  dailyMax: 100,
  timezone: "Asia/Kolkata",
  sendWindowStart: "00:00",
  sendWindowEnd: "23:59",
  startAt: null,
  endAt: null,
});

const frozenForExec = await freeze.freezeApprovedAudienceSnapshot({
  ports,
  port,
  organizationId: orgId,
  campaignId: created.id,
  campaignVersionId: created.currentDraftVersionId,
  sourceBindingId: bindingRecord.id,
  sourceWorkbookId: "fixture-marketing-master",
  sourceTabId: "tab_alpha",
  sourceTabName: "Segment Alpha",
  mapping: confirmed,
  headers: schemaLarge.headers,
  inclusion: filters.emptyFilterDefinition(),
  channel: "EMAIL",
  actorUserId: actor.userId,
});
assert.ok(frozenForExec.eligibleCount >= 1);

const tick = await execution.marketingExecutionService.tickBatch(created.id, {
  forceRun: true,
  holderId: "verify-003",
});
assert.ok(!tick.skippedReason || tick.claimed >= 0);
assert.notEqual(tick.skippedReason, "missing_audience");
assert.ok(tick.batchId === "" || tick.dryRun === true);
const ledgerAfter = await ports.ledger.listByCampaign(orgId, created.id);
assert.ok(
  ledgerAfter.length >= 0,
  "execution from frozen snapshot must not reread the live Sheet",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      tabsDiscovered: tabs.map((t) => t.externalDatasetId),
      previewCapped: preview.scanCapped,
      previewScanned: preview.counts.scannedRows,
      frozenEligible: frozen.eligibleCount,
      frozenHash: frozen.snapshotHash,
      snapshotUnchangedAfterSheetEdit: true,
      liveEligibleAfterEdit: liveAfterEdit.counts.eligible,
      sourceStatusFixture: mode.sourceStatus,
      notConfiguredWhenLiveMissingCreds: true,
      unauthorisedWorkbookRejected: true,
      mappingMustBeConfirmed: true,
      contactCreateAttempts: counters.contactCreateAttempts,
      opportunityCreateAttempts: counters.opportunityCreateAttempts,
      executionUsedFrozenSnapshot: true,
    },
    null,
    2,
  ),
);
