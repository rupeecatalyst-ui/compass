/**
 * CO-ARCH-002-W5 — verify DAL present, consumer flags OFF, modules wired through DAL.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(name) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function flagOn(name) {
  const raw = process.env[name];
  return raw === "true" || raw === "1";
}

const FLAG_KEYS = [
  "DEAL_REGISTRY_API_ENABLED",
  "DEAL_REGISTRY_DUAL_WRITE",
  "DEAL_REGISTRY_SHADOW_READ",
  "DEAL_REGISTRY_PORT_RUNTIME",
  "DEAL_REGISTRY_CONSUMER_OPPORTUNITY",
  "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_OPPORTUNITY",
  "DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE",
  "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE",
  "DEAL_REGISTRY_CONSUMER_CUSTOMER_360",
  "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_CUSTOMER_360",
  "DEAL_REGISTRY_CONSUMER_DOCUMENTS",
  "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_DOCUMENTS",
  "DEAL_REGISTRY_CONSUMER_TASKS",
  "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_TASKS",
  "DEAL_REGISTRY_CONSUMER_ACTIVITIES",
  "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_ACTIVITIES",
];

let failed = false;

for (const key of FLAG_KEYS) {
  if (flagOn(key)) {
    console.error(`FAIL: ${key} must be OFF for Wave 5 delivery`);
    failed = true;
  } else {
    console.log(`OK: ${key} OFF`);
  }
}

const required = [
  "src/lib/enterprise-deal/deal-data-access.ts",
  "src/lib/enterprise-deal/map-deal-to-loan-file.ts",
];

for (const rel of required) {
  if (!existsSync(resolve(process.cwd(), rel))) {
    console.error(`FAIL: missing ${rel}`);
    failed = true;
  } else console.log(`OK: ${rel}`);
}

const wires = [
  [
    "src/components/catalyst-one/opportunity-workspace/opportunity-workspace-context.tsx",
    "loadDealsSync",
  ],
  [
    "src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx",
    "updateDeal",
  ],
  ["src/hooks/use-loan-files-workspace.ts", "loadDealsSync"],
  ["src/hooks/use-loan-files-workspace.ts", "updateDealTasks"],
  ["src/components/catalyst-one/shared/loan-workspace-modal.tsx", "updateDeal"],
  ["src/components/catalyst-one/customers/customer-360-modal.tsx", "saveDeals"],
  ["src/hooks/use-customers-workspace.ts", "loadDealsSync"],
  ["src/lib/customer-utils.ts", "loadDealsSync"],
  ["src/lib/document-registry/store.ts", "updateDeal"],
  ["src/lib/lead-opportunity-journey/load-context.ts", "loadDealsSync"],
  ["src/lib/enterprise-deal/deal-data-access.ts", "updateDealTimeline"],
  ["src/lib/enterprise-deal/deal-data-access.ts", 'module: DealConsumerModule = "activities"'],
];

for (const [rel, token] of wires) {
  const text = readFileSync(resolve(process.cwd(), rel), "utf8");
  if (!text.includes(token)) {
    console.error(`FAIL: ${rel} missing ${token}`);
    failed = true;
  } else {
    console.log(`OK: ${rel} → ${token}`);
  }
}

// Modules must not import deal-api-client directly
const consumerFiles = [
  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx",
  "src/components/catalyst-one/customers/customer-360-modal.tsx",
  "src/hooks/use-loan-files-workspace.ts",
];
for (const rel of consumerFiles) {
  const text = readFileSync(resolve(process.cwd(), rel), "utf8");
  if (text.includes("deal-api-client")) {
    console.error(`FAIL: ${rel} must not import deal-api-client (use DAL)`);
    failed = true;
  }
}
console.log("OK: consumers do not import deal-api-client");

if (failed) {
  console.error("\nCO-ARCH-002-W5 VERIFY FAILED");
  process.exit(1);
}
console.log("\nCO-ARCH-002-W5 VERIFY PASSED (DAL wired; consumer flags OFF; legacy via DAL)");
