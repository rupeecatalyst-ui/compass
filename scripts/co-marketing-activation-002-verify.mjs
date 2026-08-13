/**
 * CO-MARKETING-ACTIVATION-002 — activation bridge verification (engineering gate).
 * Does not enable live bulk send.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const assert = (c, m) => {
  if (!c) failures.push(m);
};

const campaignsRoute = fs.readFileSync(
  path.join(root, "src/app/api/admin/marketing/campaigns/route.ts"),
  "utf8",
);
assert(campaignsRoute.includes("run_test_batch"), "campaigns API missing run_test_batch");
assert(campaignsRoute.includes("configure_execution"), "campaigns API missing configure_execution");
assert(campaignsRoute.includes("run_next_batch"), "campaigns API missing run_next_batch");

const panel = fs.readFileSync(
  path.join(root, "src/components/catalyst-one/admin/marketing/marketing-campaigns-panel.tsx"),
  "utf8",
);
assert(panel.includes("runControlledTest"), "campaigns UI missing controlled test");
assert(panel.includes("SIMULATED"), "campaigns UI must label SIMULATED");
assert(!panel.includes("Test Send (disabled)"), "disabled Test Send stub must be replaced");

const home = fs.readFileSync(
  path.join(root, "src/components/catalyst-one/admin/marketing/marketing-command-center.tsx"),
  "utf8",
);
assert(home.includes("MARKETING TEST MODE"), "command center must show TEST MODE");
assert(!home.includes("<dd className=\"font-medium\">Disabled</dd>\n                </div>\n                <div>\n                  <dt className=\"text-xs uppercase text-muted-foreground\">Handoff</dt>\n                  <dd className=\"font-medium\">Disabled</dd>"), "command center must not hardcode Handoff Disabled");

const settingsPage = fs.readFileSync(
  path.join(root, "src/app/(dashboard)/admin/marketing/settings/page.tsx"),
  "utf8",
);
assert(settingsPage.includes("MarketingSettingsPanel"), "settings must not be placeholder");

const delivPage = fs.readFileSync(
  path.join(root, "src/app/(dashboard)/admin/marketing/deliverability/page.tsx"),
  "utf8",
);
assert(delivPage.includes("MarketingDeliverabilityPanel"), "deliverability must not be placeholder");

const responses = fs.readFileSync(
  path.join(root, "src/components/catalyst-one/admin/marketing/marketing-responses-panel.tsx"),
  "utf8",
);
assert(responses.includes('action: "ingest"'), "responses ingest UI missing");

const safety = fs.readFileSync(
  path.join(root, "src/constants/enterprise-marketing-engine/safety.ts"),
  "utf8",
);
assert(safety.includes("ENTERPRISE_MARKETING_EXECUTION_ENABLED = false"), "live execution must stay false");
assert(safety.includes("ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false"), "provider connect must stay false");
assert(safety.includes("CO-MARKETING-ACTIVATION-002"), "activation sprint marker missing");

const exec = fs.readFileSync(
  path.join(root, "server/services/enterprise-marketing-engine/execution.service.ts"),
  "utf8",
);
assert(exec.includes("runControlledTestBatch"), "execution service missing controlled test");

const manual = fs.readFileSync(
  path.join(root, "content/enterprise-user-manual/marketing/overview.md"),
  "utf8",
);
assert(manual.includes("MARKETING TEST MODE"), "user manual marketing overview outdated");
assert(
  fs.existsSync(path.join(root, "src/constants/routes.ts")) &&
    fs.readFileSync(path.join(root, "src/constants/routes.ts"), "utf8").includes("ADMIN_USER_MANUAL"),
  "central User Manual route required",
);

if (failures.length) {
  console.error("CO-MARKETING-ACTIVATION-002 VERIFY FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("CO-MARKETING-ACTIVATION-002 VERIFY PASS");
console.log(" live execution: false");
console.log(" provider connect: false");
console.log(" controlled test API/UI: present");
