/**
 * Google Sheets quota remediation: cache, coalescing, quota fail-closed, freeze reuse.
 * Local mocks only. No production Google, send, or deploy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.MARKETING_SHEETS_QUOTA_FAST_RETRY = "true";

function ts(rel) {
  return pathToFileURL(resolve(root, rel)).href;
}

const consentMod = await import(ts("src/lib/enterprise-marketing-engine/consent-policy.ts"));
const cacheMod = await import(ts("server/services/enterprise-marketing-engine/adapters/google-sheets-read-cache.ts"));
const quotaMod = await import(ts("server/services/enterprise-marketing-engine/adapters/google-sheets-quota.ts"));
const workingMod = await import(ts("src/lib/enterprise-marketing-engine/audience-working-set.ts"));
const scanMod = await import(ts("src/lib/enterprise-marketing-engine/eligibility-scan.ts"));
const freezeMod = await import(ts("src/lib/enterprise-marketing-engine/freeze-audience.ts"));
const durabilityMod = await import(ts("src/lib/enterprise-marketing-engine/durability/index.ts"));
const adapterMod = await import(ts("server/services/enterprise-marketing-engine/adapters/google-sheets.adapter.ts"));
const bindingMod = await import(ts("server/services/enterprise-marketing-engine/binding-store.ts"));

const builder = readFileSync(
  join(root, "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx"),
  "utf8",
);
assert.match(builder, /data-mkt-sheets-quota-retry/);
assert.match(builder, /SHEETS_QUOTA_EXCEEDED/);
assert.match(builder, /refreshSource/);
assert.equal(consentMod.marketingMissingConsentIsGranted(), false);
const panel = readFileSync(
  join(root, "src/components/catalyst-one/admin/marketing/marketing-audiences-panel.tsx"),
  "utf8",
);
const review = readFileSync(
  join(root, "src/lib/enterprise-marketing-engine/readiness-review.ts"),
  "utf8",
);
assert.match(builder, /marketingAudienceEligibleLabel/);
assert.match(panel, /marketingAudienceEligibleLabel/);
assert.match(review, /isIncompleteOverLimitAudienceScan/);
assert.match(review, /Eligible audience/);
assert.equal(
  scanMod.marketingAudienceEligibleLabel({
    scanComplete: false,
    audienceLimitStatus: "over_limit",
    eligible: null,
  }),
  "Exceeds the 15,000 limit. The final eligible count was not calculated.",
);
assert.doesNotMatch(scanMod.MARKETING_INCOMPLETE_AUDIENCE_COUNT_LABEL, /2001|2,001/);

cacheMod.resetGoogleSheetsReadCache();
workingMod.resetAudienceWorkingSets();

let googleCalls = 0;
async function counted(key, n = 1) {
  return cacheMod.coalesceGoogleSheetsRead({
    key,
    read: async () => {
      googleCalls += n;
      return { ok: true, key };
    },
  });
}

const first = await counted("sheet-a");
const second = await counted("sheet-a");
assert.equal(first.ok, true);
assert.equal(second.ok, true);
assert.equal(googleCalls, 1);
assert.equal(cacheMod.getGoogleSheetsReadCacheStats().hits, 1);

googleCalls = 0;
cacheMod.resetGoogleSheetsReadCache();
const concurrent = await Promise.all([counted("sheet-b"), counted("sheet-b"), counted("sheet-b")]);
assert.equal(concurrent.length, 3);
assert.equal(googleCalls, 1);
assert.ok(cacheMod.getGoogleSheetsReadCacheStats().inflightJoined >= 1);

const quotaErr = Object.assign(new Error("Quota exceeded for quota metric 'Read requests'"), {
  code: 429,
});
assert.equal(quotaMod.isGoogleSheetsQuotaError(quotaErr), true);
cacheMod.markSuccessfulSheetsSync("2026-10-25T06:00:00.000Z");
const mapped = quotaMod.createSheetsQuotaExceededError(quotaErr);
assert.equal(mapped.code, "SHEETS_QUOTA_EXCEEDED");
assert.match(mapped.message, /Last successful Google sync/);
assert.equal(mapped.statusCode, 429);

let attempts = 0;
await assert.rejects(
  () =>
    quotaMod.withSheetsQuota(async () => {
      attempts += 1;
      throw quotaErr;
    }),
  (err) => err.code === "SHEETS_QUOTA_EXCEEDED" && attempts === 4,
);

const previewScan = {
  purpose: "preview",
  scanCapped: false,
  scanMaxRows: 2000,
  availableFields: ["Email"],
  counts: {
    totalRows: 50,
    scannedRows: 50,
    validEmails: 50,
    invalidEmails: 0,
    duplicates: 0,
    suppressed: 0,
    excludedByFilter: 0,
    previouslyContacted: 0,
    eligible: 50,
  },
  eligibleRecipients: [],
  sampleRecipients: [],
  sampleDiagnostics: [],
  notice: "preview",
};
assert.equal(workingMod.isCompleteFreezeWorkingSet(previewScan), false);
assert.equal(
  workingMod.rememberCompleteAudienceWorkingSet(
    {
      organizationId: "org",
      bindingId: "bind",
      datasetId: "tab",
      columnMap: { email: "Email" },
      inclusion: { version: 1, logic: "AND", rules: [] },
      exclusion: { version: 1, logic: "AND", rules: [] },
      eligibilityRules: {
        requireIdentity: true,
        requireValidEmailIfPresent: true,
        excludeDuplicatesInScan: true,
      },
    },
    previewScan,
  ),
  false,
);

const rows = Array.from({ length: 12 }, (_, i) => ({
  Email: `user${i + 1}@example.com`,
  Name: `User ${i + 1}`,
}));
let streamCalls = 0;
function countingPort() {
  return {
    providerType: "GOOGLE_SHEETS",
    async getSchema() {
      return {
        headers: ["Email", "Name"],
        schemaFingerprint: "fp",
        detectedEmailColumn: "Email",
        detectedPhoneColumn: null,
        detectedExternalKeyColumn: null,
      };
    },
    async estimateAudience() {
      return {
        approximateRowCount: rows.length + 1,
        dataRowEstimate: rows.length,
        method: "fixture",
        note: "mock",
      };
    },
    async streamRows() {
      streamCalls += 1;
      return { rows, sourceRowNumbers: rows.map((_, i) => i + 2), headers: ["Email", "Name"] };
    },
  };
}

const keyInput = {
  organizationId: "org-1",
  bindingId: "bind-1",
  datasetId: "1",
  columnMap: { email: "Email", name: "Name" },
  inclusion: { version: 1, logic: "AND", rules: [] },
  exclusion: { version: 1, logic: "AND", rules: [] },
  eligibilityRules: {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
  },
};

streamCalls = 0;
const preview = await scanMod.scanMarketingAudienceEligibility({
  port: countingPort(),
  bindingId: keyInput.bindingId,
  datasetId: keyInput.datasetId,
  columnMap: keyInput.columnMap,
  mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
  inclusion: keyInput.inclusion,
  exclusion: keyInput.exclusion,
  eligibilityRules: keyInput.eligibilityRules,
  purpose: "preview",
});
assert.equal(preview.purpose, "preview");
assert.equal(preview.scanMaxRows, 2000);
assert.equal(workingMod.isCompleteFreezeWorkingSet(preview), false);
const previewStreams = streamCalls;

streamCalls = 0;
const approval = await scanMod.scanMarketingAudienceEligibility({
  port: countingPort(),
  bindingId: keyInput.bindingId,
  datasetId: keyInput.datasetId,
  columnMap: keyInput.columnMap,
  mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
  inclusion: keyInput.inclusion,
  exclusion: keyInput.exclusion,
  eligibilityRules: keyInput.eligibilityRules,
  purpose: "approval",
});
assert.equal(workingMod.isCompleteFreezeWorkingSet(approval), true);
assert.equal(workingMod.rememberCompleteAudienceWorkingSet(keyInput, approval), true);
const approvalStreams = streamCalls;
assert.ok(approvalStreams >= 1);

const ports = durabilityMod.createMemoryMarketingDurabilityPorts();
durabilityMod.configureMarketingDurabilityTestFixture(ports);
streamCalls = 0;
const frozen = await freezeMod.freezeApprovedAudienceSnapshot({
  ports,
  port: countingPort(),
  organizationId: keyInput.organizationId,
  campaignId: "camp-1",
  campaignVersionId: "ver-1",
  sourceBindingId: keyInput.bindingId,
  sourceWorkbookId: "wb-1",
  sourceTabId: keyInput.datasetId,
  sourceTabName: "HL",
  mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
  headers: ["Email", "Name"],
  inclusion: keyInput.inclusion,
  exclusion: keyInput.exclusion,
  eligibilityRules: keyInput.eligibilityRules,
  completeScan: workingMod.resolveCompleteAudienceWorkingSet(keyInput)?.scan ?? null,
});
assert.equal(frozen.eligibleCount, 12);
assert.equal(frozen.recipients.length, 12);
assert.equal(streamCalls, 0, "complete matching working set must not reread the sheet");

streamCalls = 0;
await freezeMod.freezeApprovedAudienceSnapshot({
  ports,
  port: countingPort(),
  organizationId: keyInput.organizationId,
  campaignId: "camp-2",
  campaignVersionId: "ver-2",
  sourceBindingId: keyInput.bindingId,
  sourceWorkbookId: "wb-1",
  sourceTabId: keyInput.datasetId,
  sourceTabName: "HL",
  mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
  headers: ["Email", "Name"],
  inclusion: { version: 1, logic: "AND", rules: [{ id: "r1", field: "Name", op: "eq", value: "missing" }] },
  exclusion: keyInput.exclusion,
  eligibilityRules: keyInput.eligibilityRules,
  completeScan: preview,
});
assert.ok(streamCalls >= 1, "preview/mismatched working set must live-scan");

const org = "org-sheets";
const bindingId = "mkt-src-sheets-test";
durabilityMod.resetMarketingDurabilityComposition();
bindingMod.hydrateRuntimeBinding({
  id: bindingId,
  organizationId: org,
  providerType: "GOOGLE_SHEETS",
  displayName: "Test workbook",
  spreadsheetId: "spreadsheet-test",
  driveFileId: "spreadsheet-test",
  authRef: "env:GOOGLE_SHEETS_SERVICE_ACCOUNT",
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

let apiGets = 0;
let apiBatch = 0;
let apiValuesGet = 0;
const header = ["Email", "Name"];
const dataRows = Array.from({ length: 120 }, (_, i) => [`n${i + 1}@example.com`, `N${i + 1}`]);
adapterMod.setGoogleSheetsApiClientForTests({
  spreadsheets: {
    get: async () => {
      apiGets += 1;
      return {
        data: {
          sheets: [
            {
              properties: {
                sheetId: 99,
                title: "Home Loan",
                gridProperties: { rowCount: dataRows.length + 1 },
              },
            },
          ],
        },
      };
    },
    values: {
      get: async ({ range }) => {
        apiValuesGet += 1;
        if (String(range).includes("A1:")) return { data: { values: [header] } };
        const match = String(range).match(/A(\d+):ZZ(\d+)/);
        const start = match ? Number(match[1]) : 2;
        const end = match ? Number(match[2]) : start;
        const slice = dataRows.slice(start - 2, end - 1);
        return { data: { values: slice } };
      },
      batchGet: async ({ ranges }) => {
        apiBatch += 1;
        const valueRanges = [];
        for (const range of ranges) {
          if (String(range).includes("A1:")) valueRanges.push({ values: [header] });
          else {
            const match = String(range).match(/A(\d+):ZZ(\d+)/);
            const start = match ? Number(match[1]) : 2;
            const end = match ? Number(match[2]) : start;
            valueRanges.push({ values: dataRows.slice(start - 2, end - 1) });
          }
        }
        return { data: { valueRanges } };
      },
    },
  },
});
cacheMod.resetGoogleSheetsReadCache();
const port = adapterMod.createGoogleSheetsMarketingDataSourcePort(org);
await port.getSchema(bindingId, "99");
await port.getSchema(bindingId, "99");
await port.estimateAudience(bindingId, "99");
await port.streamRows({ bindingId, datasetId: "99", limit: 100 });
await port.streamRows({ bindingId, datasetId: "99", limit: 100 });
const afterRepeat = { apiGets, apiBatch, apiValuesGet, total: apiGets + apiBatch + apiValuesGet };

await port.streamRows({ bindingId, datasetId: "99", cursor: "100", limit: 100 });
const afterSecondPage = { apiGets, apiBatch, apiValuesGet, total: apiGets + apiBatch + apiValuesGet };

await Promise.all([
  port.getSchema(bindingId, "99"),
  port.getSchema(bindingId, "99"),
  port.estimateAudience(bindingId, "99"),
]);
const afterConcurrent = { apiGets, apiBatch, apiValuesGet, total: apiGets + apiBatch + apiValuesGet };

assert.equal(afterRepeat.apiGets, 1, "tab metadata must be cached");
assert.ok(afterRepeat.total <= 3, `repeated schema/stream should stay low, got ${afterRepeat.total}`);
assert.ok(afterSecondPage.total <= afterRepeat.total + 1, "page 2 should not re-fetch metadata");
assert.equal(afterConcurrent.total, afterSecondPage.total, "concurrent schema/estimate must coalesce");

const oversizeRows = Array.from({ length: 15001 }, (_, i) => ({
  Email: `over${i + 1}@example.com`,
  Name: `Over ${i + 1}`,
}));
const oversizePort = {
  providerType: "GOOGLE_SHEETS",
  async getSchema() {
    return {
      headers: ["Email", "Name"],
      schemaFingerprint: "fp-over",
      detectedEmailColumn: "Email",
      detectedPhoneColumn: null,
      detectedExternalKeyColumn: null,
    };
  },
  async streamRows() {
    return {
      rows: oversizeRows,
      sourceRowNumbers: oversizeRows.map((_, i) => i + 2),
      headers: ["Email", "Name"],
    };
  },
};
const snapshotsBeforeCeiling = await ports.snapshots.listByCampaign(keyInput.organizationId, "camp-oversize");
await assert.rejects(
  () =>
    freezeMod.freezeApprovedAudienceSnapshot({
      ports,
      port: oversizePort,
      organizationId: keyInput.organizationId,
      campaignId: "camp-oversize",
      campaignVersionId: "ver-oversize",
      sourceBindingId: keyInput.bindingId,
      sourceWorkbookId: "wb-1",
      sourceTabId: "tab-oversize",
      sourceTabName: "Oversize",
      mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
      headers: ["Email", "Name"],
      inclusion: keyInput.inclusion,
      exclusion: keyInput.exclusion,
      eligibilityRules: keyInput.eligibilityRules,
    }),
  (err) =>
    err.code === "marketing.phase1.audience_limit_exceeded" &&
    err.statusCode === 403 &&
    err.ceiling === 15000 &&
    err.recipientCount === 15001,
);
const snapshotsAfterCeiling = await ports.snapshots.listByCampaign(keyInput.organizationId, "camp-oversize");
assert.equal(snapshotsBeforeCeiling.length, 0);
assert.equal(snapshotsAfterCeiling.length, 0);
const completeOversize = await scanMod.scanMarketingAudienceEligibility({
  port: oversizePort,
  bindingId: keyInput.bindingId,
  datasetId: "tab-oversize",
  columnMap: keyInput.columnMap,
  mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
  inclusion: keyInput.inclusion,
  exclusion: keyInput.exclusion,
  eligibilityRules: keyInput.eligibilityRules,
  purpose: "approval",
});
assert.equal(completeOversize.scanComplete, true);
assert.equal(completeOversize.audienceLimitStatus, "over_limit");
assert.equal(completeOversize.counts.eligible, 15001);
assert.equal(completeOversize.counts.scannedRows, 15001);

const exactRows = Array.from({ length: 2000 }, (_, i) => ({
  Email: `exact${i + 1}@example.com`,
  Name: `Exact ${i + 1}`,
}));
const exactPort = {
  providerType: "GOOGLE_SHEETS",
  async getSchema() {
    return {
      headers: ["Email", "Name"],
      schemaFingerprint: "fp-exact",
      detectedEmailColumn: "Email",
      detectedPhoneColumn: null,
      detectedExternalKeyColumn: null,
    };
  },
  async streamRows({ cursor, limit }) {
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    const page = exactRows.slice(start, start + limit);
    const next = start + page.length;
    return {
      rows: page,
      sourceRowNumbers: page.map((_, i) => start + i + 2),
      headers: ["Email", "Name"],
      nextCursor: next < exactRows.length ? String(next) : undefined,
    };
  },
};
const exactFrozen = await freezeMod.freezeApprovedAudienceSnapshot({
  ports,
  port: exactPort,
  organizationId: keyInput.organizationId,
  campaignId: "camp-exact",
  campaignVersionId: "ver-exact",
  audienceDefinitionId: "aud-exact",
  sourceBindingId: keyInput.bindingId,
  sourceWorkbookId: "wb-1",
  sourceTabId: "exact",
  sourceTabName: "Exact",
  mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
  headers: ["Email", "Name"],
  inclusion: keyInput.inclusion,
  exclusion: keyInput.exclusion,
  eligibilityRules: keyInput.eligibilityRules,
});
assert.equal(exactFrozen.eligibleCount, 2000);
assert.equal((await ports.snapshots.listByCampaign(keyInput.organizationId, "camp-exact")).length, 1);

const wideRows = Array.from({ length: 16000 }, (_, i) => ({
  Email: `wide${i + 1}@example.com`,
  Name: `Wide ${i + 1}`,
}));
let wideCalls = 0;
const widePort = {
  providerType: "GOOGLE_SHEETS",
  async getSchema() {
    return {
      headers: ["Email", "Name"],
      schemaFingerprint: "fp-wide",
      detectedEmailColumn: "Email",
      detectedPhoneColumn: null,
      detectedExternalKeyColumn: null,
    };
  },
  async estimateAudience() {
    return { approximateRowCount: 6001, dataRowEstimate: 6000, method: "fixture", note: "mock" };
  },
  async streamRows({ cursor, limit }) {
    wideCalls += 1;
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    const page = wideRows.slice(start, start + limit);
    const next = start + page.length;
    return {
      rows: page,
      sourceRowNumbers: page.map((_, i) => start + i + 2),
      headers: ["Email", "Name"],
      nextCursor: next < wideRows.length ? String(next) : undefined,
    };
  },
};
const wideScan = await scanMod.scanMarketingAudienceEligibility({
  port: widePort,
  bindingId: keyInput.bindingId,
  datasetId: "wide",
  columnMap: keyInput.columnMap,
  mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
  inclusion: keyInput.inclusion,
  exclusion: keyInput.exclusion,
  eligibilityRules: keyInput.eligibilityRules,
  purpose: "approval",
});
assert.equal(wideScan.counts.eligible, 15001);
assert.equal(wideScan.counts.scannedRows, 15001);
assert.equal(wideScan.scanComplete, false);
assert.equal(wideScan.audienceLimitStatus, "over_limit");
assert.equal(wideScan.eligibleRecipients.length, 0);
const audienceConstants = await import(ts("src/constants/enterprise-marketing-engine/audience.ts"));
const dataSourceConstants = await import(ts("src/constants/enterprise-marketing-engine/data-source.ts"));
const expectedWideCalls = Math.ceil(15001 / audienceConstants.MARKETING_AUDIENCE_SCAN_PAGE_SIZE);
assert.equal(wideCalls, expectedWideCalls);
assert.ok(wideCalls < 40, "a 15,001-row approval must stay inside the per-minute Sheets read budget");
assert.ok(
  Math.ceil(70000 / dataSourceConstants.MARKETING_SHEETS_PAGE_MAX_ROWS) <=
    dataSourceConstants.MARKETING_SHEETS_READS_PER_MINUTE,
  "a full master page size must stay inside the per-minute Sheets read budget",
);
await assert.rejects(
  () =>
    freezeMod.freezeApprovedAudienceSnapshot({
      ports,
      port: widePort,
      organizationId: keyInput.organizationId,
      campaignId: "camp-wide",
      campaignVersionId: "ver-wide",
      sourceBindingId: keyInput.bindingId,
      sourceWorkbookId: "wb-1",
      sourceTabId: "wide",
      sourceTabName: "Wide",
      mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
      headers: ["Email", "Name"],
      inclusion: keyInput.inclusion,
      exclusion: keyInput.exclusion,
      eligibilityRules: keyInput.eligibilityRules,
      completeScan: wideScan,
    }),
  (err) => err.code === "INCOMPLETE_AUDIENCE_SCAN" && err.statusCode === 409 && err.recipientCount == null,
);
assert.equal((await ports.snapshots.listByCampaign(keyInput.organizationId, "camp-wide")).length, 0);

let quotaPages = 0;
const quotaPort = {
  providerType: "GOOGLE_SHEETS",
  async getSchema() {
    return {
      headers: ["Email", "Name"],
      schemaFingerprint: "fp-quota",
      detectedEmailColumn: "Email",
      detectedPhoneColumn: null,
      detectedExternalKeyColumn: null,
    };
  },
  async streamRows() {
    quotaPages += 1;
    if (quotaPages > 1) {
      throw Object.assign(new Error("quota"), { code: "SHEETS_QUOTA_EXCEEDED", statusCode: 429 });
    }
    return {
      rows: wideRows.slice(0, 500),
      sourceRowNumbers: wideRows.slice(0, 500).map((_, i) => i + 2),
      headers: ["Email", "Name"],
      nextCursor: "500",
    };
  },
};
const beforeQuota = await ports.snapshots.listByCampaign(keyInput.organizationId, "camp-quota");
await assert.rejects(
  () =>
    freezeMod.freezeApprovedAudienceSnapshot({
      ports,
      port: quotaPort,
      organizationId: keyInput.organizationId,
      campaignId: "camp-quota",
      campaignVersionId: "ver-quota",
      sourceBindingId: keyInput.bindingId,
      sourceWorkbookId: "wb-1",
      sourceTabId: "quota",
      sourceTabName: "Quota",
      mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
      headers: ["Email", "Name"],
      inclusion: keyInput.inclusion,
      exclusion: keyInput.exclusion,
      eligibilityRules: keyInput.eligibilityRules,
    }),
  (err) => err.code === "SHEETS_QUOTA_EXCEEDED",
);
assert.equal((await ports.snapshots.listByCampaign(keyInput.organizationId, "camp-quota")).length, beforeQuota.length);

const mixedRows = [
  { Email: "one@example.com", Name: "One" },
  { Email: "one@example.com", Name: "One again" },
  { Email: "held@example.com", Name: "Held" },
  { Email: "two@example.com", Name: "Two" },
];
const mixedPort = {
  providerType: "GOOGLE_SHEETS",
  async getSchema() {
    return {
      headers: ["Email", "Name"],
      schemaFingerprint: "fp-mixed",
      detectedEmailColumn: "Email",
      detectedPhoneColumn: null,
      detectedExternalKeyColumn: null,
    };
  },
  async streamRows() {
    return {
      rows: mixedRows,
      sourceRowNumbers: [2, 3, 4, 5],
      headers: ["Email", "Name"],
    };
  },
};
const mixedFrozen = await freezeMod.freezeApprovedAudienceSnapshot({
  ports,
  port: mixedPort,
  organizationId: keyInput.organizationId,
  campaignId: "camp-mixed",
  campaignVersionId: "ver-mixed",
  audienceDefinitionId: "aud-mixed",
  sourceBindingId: keyInput.bindingId,
  sourceWorkbookId: "wb-1",
  sourceTabId: "mixed",
  sourceTabName: "Mixed",
  mapping: { confirmed: true, map: keyInput.columnMap, confirmedAt: new Date().toISOString(), confirmedByUserId: "u1" },
  headers: ["Email", "Name"],
  inclusion: keyInput.inclusion,
  exclusion: keyInput.exclusion,
  eligibilityRules: keyInput.eligibilityRules,
  lookups: {
    isSuppressed: (input) => input.normalizedEmail === "held@example.com",
    isPreviouslyContacted: () => false,
  },
});
assert.equal(mixedFrozen.snapshot.duplicateCount, 1);
assert.equal(mixedFrozen.snapshot.suppressedCount, 1);
assert.equal(mixedFrozen.eligibleCount, 2);
assert.equal(mixedFrozen.snapshot.campaignId, "camp-mixed");
assert.equal(mixedFrozen.snapshot.campaignVersionId, "ver-mixed");
assert.equal(mixedFrozen.snapshot.audienceDefinitionId, "aud-mixed");
assert.deepEqual(
  mixedFrozen.recipients.map((row) => row.normalizedEmail),
  ["one@example.com", "two@example.com"],
);

adapterMod.setGoogleSheetsApiClientForTests(null);
durabilityMod.resetMarketingDurabilityComposition();
workingMod.resetAudienceWorkingSets();
cacheMod.resetGoogleSheetsReadCache();

console.log(
  JSON.stringify(
    {
      proof: "PASS",
      googleCallsBeforeApproxPerPreview2000: 67,
      googleCallsAfterCachedSchemaStream: afterRepeat.total,
      secondPageIncremental: afterSecondPage.total - afterRepeat.total,
      concurrentDeduped: afterConcurrent.total === afterSecondPage.total,
      previewNotCompleteForFreeze: true,
      freezeReuseStreamCalls: 0,
      previewStreams,
      approvalStreams,
      quotaAttemptsBeforeFail: attempts,
    },
    null,
    2,
  ),
);
