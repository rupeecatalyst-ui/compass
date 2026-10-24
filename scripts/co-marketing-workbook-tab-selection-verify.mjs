/**
 * Focused tests: marketing workbook switch must not retain the previous tab.
 * Isolated. No Prisma, no Google writes, no production data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const helper = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/workbook-tab-selection.ts")).href
);

const {
  resolveMarketingWorkbookTabSelection,
  isMarketingWorkbookTabDiscoveryCurrent,
  marketingTabBelongsToDiscoveredWorkbook,
} = helper;

const results = [];
function record(id, status, evidence) {
  results.push({ id, status, evidence });
  console.log(`${status}\t${id}\t${evidence}`);
}

const tabsA = [
  { externalDatasetId: "tab-a", displayName: "Tab A" },
  { externalDatasetId: "0", displayName: "Sheet1" },
];
const tabsB = [
  { externalDatasetId: "tab-b", displayName: "Tab B" },
  { externalDatasetId: "0", displayName: "Sheet1" },
];

{
  const switched = resolveMarketingWorkbookTabSelection({
    selectedBindingId: "wb-b",
    discoveryBindingId: "wb-b",
    tabs: tabsB,
    currentDatasetId: "tab-a",
    bindingChanged: true,
  });
  assert.equal(switched.apply, true);
  assert.equal(switched.datasetId, "");
  assert.equal(marketingTabBelongsToDiscoveredWorkbook("tab-a", tabsB), false);
  record("A_TO_B_DOES_NOT_RETAIN_TAB_A", "PASS", "Workbook A/Tab A → B clears datasetId; Tab A is not in B");
}

{
  const coincident = resolveMarketingWorkbookTabSelection({
    selectedBindingId: "wb-b",
    discoveryBindingId: "wb-b",
    tabs: tabsB,
    currentDatasetId: "0",
    bindingChanged: true,
  });
  assert.equal(coincident.datasetId, "");
  record(
    "A_TO_B_DOES_NOT_KEEP_COINCIDENT_GID",
    "PASS",
    "Switching workbooks does not keep gid 0 from A even when B also has gid 0",
  );
}

{
  const staleB = resolveMarketingWorkbookTabSelection({
    selectedBindingId: "wb-a",
    discoveryBindingId: "wb-b",
    tabs: tabsB,
    currentDatasetId: "",
    bindingChanged: false,
  });
  assert.equal(staleB.apply, false);
  assert.equal(isMarketingWorkbookTabDiscoveryCurrent({ selectedBindingId: "wb-a", discoveryBindingId: "wb-b" }), false);
  record("STALE_B_IGNORED_ON_A", "PASS", "Rapid A→B→A: B discovery is not applied while A is selected");
}

{
  const inaccessible = resolveMarketingWorkbookTabSelection({
    selectedBindingId: "wb-b",
    discoveryBindingId: "wb-b",
    tabs: [],
    currentDatasetId: "tab-b",
    bindingChanged: true,
  });
  assert.equal(inaccessible.apply, true);
  assert.equal(inaccessible.datasetId, "");
  assert.equal(marketingTabBelongsToDiscoveredWorkbook("tab-b", []), false);
  record("INVALID_B_FAILS_CLOSED", "PASS", "Empty/inaccessible B tabs clear selection; tab is not valid for actions");
}

{
  const refresh = resolveMarketingWorkbookTabSelection({
    selectedBindingId: "wb-a",
    discoveryBindingId: "wb-a",
    tabs: tabsA,
    currentDatasetId: "tab-a",
    bindingChanged: false,
  });
  assert.equal(refresh.datasetId, "tab-a");
  record("REFRESH_A_PRESERVES_VALID_TAB", "PASS", "Same-workbook refresh keeps Tab A when it is still present");
}

{
  const firstLoad = resolveMarketingWorkbookTabSelection({
    selectedBindingId: "mkt-src-env-hl",
    discoveryBindingId: "mkt-src-env-hl",
    tabs: tabsA,
    currentDatasetId: "",
    bindingChanged: false,
  });
  assert.equal(firstLoad.datasetId, "tab-a");
  record("HL_FIRST_LOAD_SELECTS_FIRST_TAB", "PASS", "Single-workbook Home Loan first load still auto-selects the first tab");
}

{
  const persisted = resolveMarketingWorkbookTabSelection({
    selectedBindingId: "wb-a",
    discoveryBindingId: "wb-a",
    tabs: tabsA,
    currentDatasetId: "",
    bindingChanged: true,
    preferredDatasetId: "tab-a",
  });
  assert.equal(persisted.datasetId, "tab-a");
  const missingPersisted = resolveMarketingWorkbookTabSelection({
    selectedBindingId: "wb-b",
    discoveryBindingId: "wb-b",
    tabs: tabsB,
    currentDatasetId: "tab-a",
    bindingChanged: true,
    preferredDatasetId: "tab-a",
  });
  assert.equal(missingPersisted.datasetId, "");
  record(
    "PERSISTED_AUDIENCE_PREFERRED_TAB",
    "PASS",
    "Saved audience tab is restored only when it belongs to the loaded workbook; never auto-rewritten",
  );
}

const sourcesUi = read("src/components/catalyst-one/admin/marketing/marketing-data-sources-panel.tsx");
const audiencesUi = read("src/components/catalyst-one/admin/marketing/marketing-audiences-panel.tsx");
assert.ok(sourcesUi.includes("resolveMarketingWorkbookTabSelection"));
assert.ok(sourcesUi.includes("marketingTabBelongsToDiscoveredWorkbook"));
assert.ok(audiencesUi.includes("resolveMarketingWorkbookTabSelection"));
assert.ok(audiencesUi.includes("marketingTabBelongsToDiscoveredWorkbook"));
assert.ok(sourcesUi.includes("discoveryBindingId"));
assert.ok(audiencesUi.includes("discoveryBindingId"));
assert.doesNotMatch(sourcesUi, /if \(list\[0\] && !datasetId\)/);
assert.doesNotMatch(audiencesUi, /if \(body\.data\.datasets\[0\] && !datasetId\)/);
record("PANELS_USE_SCOPED_TAB_HELPER", "PASS", "Data Sources and Audiences apply discovery only for the selected binding");

console.log(JSON.stringify({ results }, null, 2));
const failed = results.filter((r) => r.status !== "PASS");
if (failed.length) process.exit(1);
