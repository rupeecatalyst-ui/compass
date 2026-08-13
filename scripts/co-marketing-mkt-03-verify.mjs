/**
 * CO-MARKETING-MKT-03 — Audience Engine verification (fixture mode).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
process.env.ENTERPRISE_MARKETING_SHEETS_MODE = "fixture";

let ok = true;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  ok = false;
}
function pass(msg) {
  console.log(`OK: ${msg}`);
}

const required = [
  "server/services/enterprise-marketing-engine/audience.service.ts",
  "server/services/enterprise-marketing-engine/audience-definition-store.ts",
  "server/services/enterprise-marketing-engine/suppression-store.ts",
  "src/lib/enterprise-marketing-engine/audience-filters.ts",
  "src/constants/enterprise-marketing-engine/audience.ts",
  "src/types/enterprise-marketing-audience.ts",
  "src/app/api/admin/marketing/audiences/route.ts",
  "src/components/catalyst-one/admin/marketing/marketing-audiences-panel.tsx",
  "src/app/(dashboard)/admin/marketing/audiences/page.tsx",
];

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

const safety = readFileSync(
  resolve(root, "src/constants/enterprise-marketing-engine/safety.ts"),
  "utf8",
);
for (const flag of [
  "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false",
  "ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false",
]) {
  if (!safety.includes(flag)) fail(flag);
  else pass(flag);
}

const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
for (const needle of ["model MarketingProspect", "model MarketingAudienceRow", "model Lead "]) {
  if (schema.includes(needle)) fail(`forbidden ${needle}`);
  else pass(`no ${needle.trim()}`);
}

const panel = readFileSync(
  resolve(root, "src/components/catalyst-one/admin/marketing/marketing-audiences-panel.tsx"),
  "utf8",
);
if (panel.includes("createContact") || panel.includes("createOpportunity")) {
  fail("UI must not create Contacts/Opportunities");
} else pass("UI has no Contact/Opportunity create");

try {
  require("tsx/cjs");
} catch {
  console.log("SKIP runtime (tsx)");
  if (!ok) process.exit(1);
  console.log("CO-MARKETING-MKT-03 verify: PASS (files only)");
  process.exit(0);
}

const audUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/audience.service.ts"),
).href;
const dsUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/data-source.service.ts"),
).href;

const audMod = await import(audUrl);
const dsMod = await import(dsUrl);
const audienceService = audMod.marketingAudienceService;
const dataSourceService = dsMod.marketingDataSourceService;

const actor = { userId: "verify", organizationId: "default" };
const bindings = dataSourceService.listBindings(actor);
if (!bindings.length) fail("no fixture binding");
else pass(`binding=${bindings[0].id}`);

const datasets = await dataSourceService.discover(actor, bindings[0].id);
const alpha = datasets.find((d) => d.displayName === "Segment Alpha") ?? datasets[0];
pass(`tab=${alpha.displayName}`);

const previewAll = await audienceService.previewDraft(actor, {
  bindingId: bindings[0].id,
  datasetId: alpha.externalDatasetId,
  filterDefinition: { version: 1, logic: "AND", rules: [] },
});

if (previewAll.counts.scanned < 1) fail("expected scanned rows");
else pass(`scanned=${previewAll.counts.scanned}`);

if (JSON.stringify(previewAll).toLowerCase().includes("asha.verma@example.com")) {
  fail("preview leaked personal email");
} else pass("preview has no personal email dump");

if (!previewAll.availableFields.includes("Profession") && !previewAll.availableFields.length) {
  fail("expected available fields");
} else pass(`fields=${previewAll.availableFields.length}`);

if (previewAll.counts.suppressed < 1) fail("expected fixture suppression hit");
else pass(`suppressed=${previewAll.counts.suppressed}`);

if (previewAll.counts.eligible < 1) fail("expected some eligible");
else pass(`eligible=${previewAll.counts.eligible}`);

const filtered = await audienceService.previewDraft(actor, {
  bindingId: bindings[0].id,
  datasetId: alpha.externalDatasetId,
  filterDefinition: {
    version: 1,
    logic: "AND",
    rules: [
      {
        id: "r1",
        field: "City",
        op: "eq",
        value: "Pune",
      },
    ],
  },
});
if (filtered.counts.excludedByFilter < 1) fail("city filter should exclude rows");
else pass(`filter excluded=${filtered.counts.excludedByFilter}`);

const saved = audienceService.upsert(actor, {
  name: "Verify – Professionals style",
  bindingId: bindings[0].id,
  datasetId: alpha.externalDatasetId,
  datasetDisplayName: alpha.displayName,
  filterDefinition: {
    version: 1,
    logic: "AND",
    rules: [{ id: "r2", field: "Profession", op: "eq", value: "Professional" }],
  },
});
pass(`saved audience=${saved.id}`);

const listed = audienceService.list(actor);
if (!listed.find((a) => a.id === saved.id)) fail("saved audience missing from list");
else pass("audience list contains definition");

// Ensure definition does not embed rows
if (JSON.stringify(saved).includes("neha.shah@example.com")) {
  fail("saved definition contains row PII");
} else pass("definition has no row PII");

if (!ok) {
  console.error("CO-MARKETING-MKT-03 verify: FAIL");
  process.exit(1);
}
console.log("CO-MARKETING-MKT-03 verify: PASS");
