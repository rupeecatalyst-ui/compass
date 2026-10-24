/**
 * Focused tests: multi-workbook health diagnostics.
 * Isolated. No Google API, no production writes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const { describeMarketingWorkbookHealthContext } = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/workbook-health-diagnostics.ts")).href
);

const results = [];
function record(id, status, evidence) {
  results.push({ id, status, evidence });
  console.log(`${status}\t${id}\t${evidence}`);
}

const envId = "HL_EXISTING_SHEET_ID";
const secondId = "SECOND_AUTHORISED_SHEET_ID";

{
  const hl = describeMarketingWorkbookHealthContext({
    bindingSpreadsheetId: envId,
    environmentWorkbookId: envId,
    registryAuthorised: true,
  });
  assert.equal(hl.authorisedInOrganisationRegistry, true);
  assert.equal(hl.isEnvironmentDefaultWorkbook, true);
  record("ENV_DEFAULT_REPORTS_CORRECTLY", "PASS", "Home Loan env workbook is registry-authorised and the environment default");
}

{
  const second = describeMarketingWorkbookHealthContext({
    bindingSpreadsheetId: secondId,
    environmentWorkbookId: envId,
    registryAuthorised: true,
  });
  assert.equal(second.authorisedInOrganisationRegistry, true);
  assert.equal(second.isEnvironmentDefaultWorkbook, false);
  record(
    "SECOND_WORKBOOK_NOT_MISMATCHED",
    "PASS",
    "Authorised second workbook is registry-authorised and is not flagged as invalid for differing from env default",
  );
}

{
  const unknown = describeMarketingWorkbookHealthContext({
    bindingSpreadsheetId: "UNKNOWN_SHEET_ID",
    environmentWorkbookId: envId,
    registryAuthorised: false,
  });
  assert.equal(unknown.authorisedInOrganisationRegistry, false);
  record("UNKNOWN_FAILS_CLOSED", "PASS", "Unknown spreadsheet is not authorised in the organisation registry");
}

{
  const revoked = describeMarketingWorkbookHealthContext({
    bindingSpreadsheetId: secondId,
    environmentWorkbookId: envId,
    registryAuthorised: false,
  });
  assert.equal(revoked.authorisedInOrganisationRegistry, false);
  assert.equal(revoked.isEnvironmentDefaultWorkbook, false);
  record("REVOKED_NOT_AUTHORISED", "PASS", "Revoked workbook is not reported as registry-authorised");
}

{
  const knownIdOnly = describeMarketingWorkbookHealthContext({
    bindingSpreadsheetId: envId,
    environmentWorkbookId: envId,
    registryAuthorised: false,
  });
  assert.equal(knownIdOnly.authorisedInOrganisationRegistry, false);
  assert.equal(knownIdOnly.isEnvironmentDefaultWorkbook, true);
  record(
    "ID_KNOWLEDGE_IS_NOT_AUTHORISATION",
    "PASS",
    "Matching the environment spreadsheet ID does not infer organisation authorisation",
  );
}

const adapter = read("server/services/enterprise-marketing-engine/adapters/google-sheets.adapter.ts");
const service = read("server/services/enterprise-marketing-engine/data-source.service.ts");
const ui = read("src/components/catalyst-one/admin/marketing/marketing-data-sources-panel.tsx");
assert.ok(adapter.includes("describeMarketingWorkbookHealthContext"));
assert.doesNotMatch(adapter, /runtimeSpreadsheetMatchesConfigured/);
assert.ok(adapter.includes("registryAuthorised: true"));
assert.ok(service.includes("defaultEnvironmentWorkbookId"));
assert.ok(service.includes("ACCESS_REVOKED"));
assert.ok(ui.includes("Authorised in organisation registry"));
assert.ok(ui.includes("Environment default workbook"));
assert.doesNotMatch(ui, /Runtime spreadsheet matches configured/);
assert.ok(ui.includes("selected authorised workbook"));
assert.ok(ui.includes("Authorised workbooks"));
record("SOURCES_USE_REGISTRY_DIAGNOSTICS", "PASS", "Adapter, service, and Data Sources UI no longer treat env ID equality as the authorisation gate");

console.log(JSON.stringify({ results }, null, 2));
if (results.some((r) => r.status !== "PASS")) process.exit(1);
