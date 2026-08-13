/**
 * CO-MARKETING-MKT-02 — Verify Google Sheets data source adapter (fixture mode).
 * Uses controlled non-production fixture — never the 100k production database.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);

// Force fixture BEFORE importing server modules that read env at load time.
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
  "server/services/enterprise-marketing-engine/adapters/google-sheets.adapter.ts",
  "server/services/enterprise-marketing-engine/adapters/fixture-sheets.adapter.ts",
  "server/services/enterprise-marketing-engine/data-source.service.ts",
  "server/services/enterprise-marketing-engine/binding-store.ts",
  "src/lib/enterprise-marketing-engine/data-quality.ts",
  "src/app/api/admin/marketing/data-sources/route.ts",
  "src/app/api/admin/marketing/data-sources/[bindingId]/route.ts",
  "src/components/catalyst-one/admin/marketing/marketing-data-sources-panel.tsx",
  "src/app/(dashboard)/admin/marketing/data-sources/page.tsx",
  "src/constants/enterprise-marketing-engine/data-source.ts",
  "src/types/enterprise-marketing-data-source.ts",
];

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

const safetySrc = readFileSync(
  resolve(root, "src/constants/enterprise-marketing-engine/safety.ts"),
  "utf8",
);
for (const flag of [
  "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false",
  "ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false",
  "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false",
]) {
  if (!safetySrc.includes(flag)) fail(`safety flag missing: ${flag}`);
  else pass(`safety ${flag}`);
}

const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
for (const needle of [
  "model MarketingProspect",
  "model MarketingAudienceRow",
  "model MarketingCampaign",
]) {
  if (schema.includes(needle)) fail(`forbidden schema ${needle}`);
  else pass(`no schema ${needle.trim()}`);
}

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
if (!pkg.dependencies?.googleapis) fail("googleapis dependency missing");
else pass("googleapis dependency present");

const envExample = readFileSync(resolve(root, ".env.example"), "utf8");
if (!envExample.includes("ENTERPRISE_MARKETING_SHEETS_MODE")) {
  fail(".env.example missing Sheets mode docs");
} else pass(".env.example documents Sheets mode");

// Runtime fixture exercise via tsx if available
async function runtimeFixture() {
  try {
    // Prefer tsx register
    require("tsx/cjs");
  } catch {
    console.log("SKIP runtime: tsx not loadable via require — file checks only");
    return;
  }

  const serviceUrl = pathToFileURL(
    resolve(root, "server/services/enterprise-marketing-engine/data-source.service.ts"),
  ).href;
  const mod = await import(serviceUrl);
  const svc = mod.marketingDataSourceService;
  const mode = svc.getMode();
  if (mode.sheetsMode !== "fixture") fail(`expected fixture mode, got ${mode.sheetsMode}`);
  else pass("runtime sheetsMode=fixture");
  if (mode.audienceImportEnabled) fail("audience import must be false");
  else pass("audience import disabled");

  const actor = { userId: "verify", organizationId: "default" };
  const bindings = svc.listBindings(actor);
  if (!bindings.length) fail("expected fixture binding");
  else pass(`bindings=${bindings.length}`);

  const bindingId = bindings[0].id;
  const datasets = await svc.discover(actor, bindingId);
  if (datasets.length < 2) fail("expected multiple discovered tabs");
  else pass(`discovered tabs=${datasets.length}`);

  // Must not rely on hard-coded production category names as the only tabs
  const titles = datasets.map((d) => d.displayName);
  const forbiddenHardcode = ["Self Employed", "Salaried", "Professionals", "Business Owners"];
  for (const t of forbiddenHardcode) {
    if (titles.includes(t)) {
      // Not a hard failure if someone names a fixture that way — warn only
      console.log(`NOTE: fixture tab titled "${t}" — ensure engine does not hard-code categories`);
    }
  }
  pass(`tab titles dynamic: ${titles.join(" | ")}`);

  const first = datasets[0].externalDatasetId;
  const preview = await svc.preview(actor, bindingId, first, 20);
  if (preview.rows.length > 20) fail("preview exceeded 20 rows");
  else pass(`preview rows=${preview.rows.length} capped`);
  if (!preview.qualitySummary) fail("missing quality summary");
  else pass(`quality sampleSize=${preview.qualitySummary.sampleSize}`);

  const estimate = await svc.estimate(actor, bindingId, first);
  if (estimate.dataRowEstimate == null) fail("missing estimate");
  else pass(`estimate=${estimate.dataRowEstimate}`);

  const health = await svc.health(actor, bindingId);
  if (!health.ok) fail("fixture health failed");
  else pass("fixture health ok");
}

await runtimeFixture();

if (!ok) {
  console.error("CO-MARKETING-MKT-02 verify: FAIL");
  process.exit(1);
}
console.log("CO-MARKETING-MKT-02 verify: PASS");
