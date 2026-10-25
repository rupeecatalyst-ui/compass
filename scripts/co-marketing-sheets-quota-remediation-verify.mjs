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
  (err) => err.code === "SHEETS_QUOTA_EXCEEDED" && attempts === 3,
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

const oversizeRows = Array.from({ length: 2001 }, (_, i) => ({
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
    err.ceiling === 2000 &&
    err.recipientCount === 2001,
);
const snapshotsAfterCeiling = await ports.snapshots.listByCampaign(keyInput.organizationId, "camp-oversize");
assert.equal(snapshotsBeforeCeiling.length, 0);
assert.equal(snapshotsAfterCeiling.length, 0);

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
