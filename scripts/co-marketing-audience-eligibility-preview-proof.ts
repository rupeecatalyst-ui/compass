/**
 * Campaign Builder audience eligibility preview proof.
 * In-memory workbook only. Does not open Google, Prisma, production, or send mail.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
} from "../src/constants/enterprise-marketing-engine/safety";
import { defaultMarketingConsentPolicy, lacksRequiredMarketingConsent } from "../src/lib/enterprise-marketing-engine/consent-policy";
import { scanMarketingAudienceEligibility } from "../src/lib/enterprise-marketing-engine/eligibility-scan";
import type { MarketingDataSourcePort } from "../src/lib/enterprise-marketing-engine/ports/data-source.port";
import type { MarketingFilterDefinition } from "../src/types/enterprise-marketing-audience";
import type { MarketingColumnMap } from "../src/types/enterprise-marketing-durability";

const root = dirname(fileURLToPath(import.meta.url));
const builder = readFileSync(
  join(root, "../src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx"),
  "utf8",
);
const route = readFileSync(join(root, "../src/app/api/admin/marketing/audiences/route.ts"), "utf8");
const scanSource = readFileSync(join(root, "../src/lib/enterprise-marketing-engine/eligibility-scan.ts"), "utf8");

const headers = ["Email", "Name", "Mobile", "Location", "Product Interest", "Consent", "Customer ID"];
const rows = [
  { Email: "valid.one@example.com", Name: "Valid One", Mobile: "9000000001", Location: "Pune", "Product Interest": "Home Loan", Consent: "Yes", "Customer ID": "C1" },
  { Email: "not-an-email", Name: "Invalid Email", Mobile: "9000000002", Location: "Mumbai", "Product Interest": "Home Loan", Consent: "Yes", "Customer ID": "C2" },
  { Email: "", Name: "Missing Email", Mobile: "9000000003", Location: "Delhi", "Product Interest": "Home Loan", Consent: "Yes", "Customer ID": "C3" },
  { Email: "valid.one@example.com", Name: "Duplicate Email", Mobile: "9000000004", Location: "Pune", "Product Interest": "Home Loan", Consent: "Yes", "Customer ID": "C4" },
  { Email: "other.customer@example.com", Name: "Duplicate Customer", Mobile: "9000000005", Location: "Jaipur", "Product Interest": "Home Loan", Consent: "Yes", "Customer ID": "C1" },
  { Email: "consent.no@example.com", Name: "Consent No", Mobile: "9000000006", Location: "Chennai", "Product Interest": "Home Loan", Consent: "No", "Customer ID": "C6" },
  { Email: "suppressed.one@example.com", Name: "Suppressed", Mobile: "9000000007", Location: "Kochi", "Product Interest": "Home Loan", Consent: "Yes", "Customer ID": "C7" },
];

const columnMap: MarketingColumnMap = {
  email: "Email",
  name: "Name",
  mobile: "Mobile",
  location: "Location",
};
const emptyFilters: MarketingFilterDefinition = { version: 1, logic: "AND", rules: [] };

function portFor(
  inputRows: Array<Record<string, string>>,
  fail?: Error,
): MarketingDataSourcePort {
  return {
    providerType: "GOOGLE_SHEETS",
    async getSchema() {
      return {
        headers,
        schemaFingerprint: "proof",
        detectedEmailColumn: "Email",
        detectedPhoneColumn: "Mobile",
        detectedExternalKeyColumn: null,
      };
    },
    async estimateAudience() {
      return {
        approximateRowCount: inputRows.length + 1,
        dataRowEstimate: inputRows.length,
        method: "fixture",
        note: "in-memory proof",
      };
    },
    async streamRows() {
      if (fail) throw fail;
      return {
        rows: inputRows,
        sourceRowNumbers: inputRows.map((_, index) => index + 2),
      };
    },
  };
}

const scanInput = {
  port: portFor(rows),
  bindingId: "proof-binding",
  datasetId: "sheet1",
  columnMap,
  mapping: { confirmed: true as const },
  inclusion: emptyFilters,
  exclusion: emptyFilters,
  eligibilityRules: {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
  },
  purpose: "preview" as const,
  lookups: {
    isSuppressed: (input: { normalizedEmail: string }) => input.normalizedEmail === "suppressed.one@example.com",
    isPreviouslyContacted: () => false,
  },
};

async function main() {
const first = await scanMarketingAudienceEligibility(scanInput);
const second = await scanMarketingAudienceEligibility(scanInput);
assert.deepEqual(first.counts, second.counts);

const byRow = new Map(first.sampleDiagnostics.map((row) => [row.sourceRowNumber, row.disposition]));
assert.equal(first.counts.scannedRows, 7);
assert.equal(byRow.get(2), "eligible");
assert.equal(byRow.get(3), "invalid");
assert.equal(byRow.get(4), "invalid");
assert.equal(byRow.get(5), "duplicate");
assert.equal(byRow.get(6), "eligible");
assert.equal(byRow.get(7), "eligible");
assert.equal(byRow.get(8), "suppressed");
assert.equal(first.counts.eligible, 3);
assert.equal(first.counts.invalidEmails, 2);
assert.equal(first.counts.duplicates, 1);
assert.equal(first.counts.suppressed, 1);
assert.equal(first.counts.excludedByFilter, 0);
assert.equal(Math.max(0, first.counts.scannedRows - first.counts.eligible), 4);

const policy = defaultMarketingConsentPolicy("proof");
assert.equal(policy.requireExplicitConsent, false);
assert.equal(lacksRequiredMarketingConsent("No", policy), false);
assert.equal(lacksRequiredMarketingConsent("Yes", policy), false);

const excluded = await scanMarketingAudienceEligibility({
  ...scanInput,
  exclusion: {
    version: 1,
    logic: "AND",
    rules: [{ id: "ex-1", field: "Location", op: "eq", value: "Chennai" }],
  },
});
assert.equal(excluded.counts.excludedByFilter, 1);
assert.equal(excluded.counts.eligible, 2);

await assert.rejects(
  () =>
    scanMarketingAudienceEligibility({
      ...scanInput,
      port: portFor(rows, Object.assign(new Error("Google Sheets read failed"), { code: "SHEETS_API_ERROR" })),
    }),
  /Google Sheets read failed/,
);

const previewFn = builder.slice(
  builder.indexOf("async function runPreviewEligibility"),
  builder.indexOf("async function freezeAudienceSnapshot"),
);
assert.equal(previewFn.includes("audienceId:"), false);
assert.equal(previewFn.includes("action: \"freeze\""), false);
assert.equal(previewFn.includes("action: \"send\""), false);
assert.match(previewFn, /data-mkt-eligibility-error|setPreviewError/);
assert.match(builder, /data-mkt-eligibility-result=\{preview \? "ready" : "unavailable"\}/);
assert.match(builder, /data-mkt-eligibility-error="true"/);
assert.match(builder, /disabled=\{busy \|\| !eligibilityPreviewReady \|\| !mappingConfirmed \|\| !columnMap\.email\}/);
assert.match(builder, /Run a successful eligibility preview before freezing a snapshot/);
assert.equal(scanSource.includes("sendCampaign"), false);
assert.equal(scanSource.includes("execution.service"), false);
assert.equal(route.includes("execution.service"), false);
assert.equal(ENTERPRISE_MARKETING_EXECUTION_ENABLED, false);
assert.equal(ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED, false);

for (const step of ["step === 1", "step === 2", "step === 3", "step === 4", "step === 5", "step === 6"]) {
  assert.equal(builder.includes(step), true, step);
}
assert.equal(builder.includes("Column mapping"), true);
assert.equal(builder.includes("Filters"), true);
assert.equal(builder.includes("Exclusions"), true);

console.log(JSON.stringify({
  proof: "PASS",
  scanned: first.counts.scannedRows,
  sourceRows: first.counts.totalRows,
  eligible: first.counts.eligible,
  ineligible: first.counts.scannedRows - first.counts.eligible,
  invalidOrMissingEmail: first.counts.invalidEmails,
  duplicates: first.counts.duplicates,
  suppressed: first.counts.suppressed,
  filterExclusions: first.counts.excludedByFilter,
  exclusionScanExcluded: excluded.counts.excludedByFilter,
  repeatedPreviewStable: true,
  workbookFailureVisibleToCaller: true,
  executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  requireExplicitConsent: policy.requireExplicitConsent,
  consentNoBlockedByDefaultPolicy: false,
  duplicateCustomerIdStillEligible: byRow.get(6) === "eligible",
}, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "proof failed");
  process.exit(1);
});
