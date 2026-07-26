/**
 * CO-ARCH-002-W6 — verify cutover artifacts present; ALL Deal flags remain OFF.
 * Wave 6 must NOT enable production feature flags.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

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
  "NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED",
  "DEAL_REGISTRY_DUAL_WRITE",
  "NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE",
  "DEAL_REGISTRY_SHADOW_READ",
  "NEXT_PUBLIC_DEAL_REGISTRY_SHADOW_READ",
  "DEAL_REGISTRY_PORT_RUNTIME",
  "NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME",
  "DEAL_REGISTRY_IMPORT_ENABLED",
  "DEAL_REGISTRY_BLOCK_LOCAL_WRITE",
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
    console.error(`FAIL: ${key} must be OFF for Wave 6 delivery (no production enablement)`);
    failed = true;
  } else {
    console.log(`OK: ${key} OFF`);
  }
}

const required = [
  "src/constants/enterprise-deal-registry/cutover.ts",
  "src/lib/enterprise-deal/cutover-health.ts",
  "src/lib/enterprise-deal/rollback-automation.ts",
  "src/lib/enterprise-deal/reconciliation-report.ts",
  "src/lib/enterprise-deal/performance-benchmark.ts",
  "src/components/catalyst-one/architecture/deal-cutover-health-panel.tsx",
  "docs/co-arch-002/CO-ARCH-002-WAVE-6-COMPLETION-REPORT.md",
  "docs/co-arch-002/CO-ARCH-002-WAVE-6-ROLLBACK-RUNBOOK.md",
];

for (const rel of required) {
  if (!existsSync(resolve(process.cwd(), rel))) {
    console.error(`FAIL: missing ${rel}`);
    failed = true;
  } else console.log(`OK: ${rel}`);
}

const healthView = readFileSync(
  resolve(process.cwd(), "src/components/catalyst-one/architecture/health-view.tsx"),
  "utf8",
);
if (!healthView.includes("DealCutoverHealthPanel")) {
  console.error("FAIL: Architecture Health missing DealCutoverHealthPanel");
  failed = true;
} else {
  console.log("OK: Architecture Health wires DealCutoverHealthPanel");
}

// Emit idle matrix artifact for ops (does not write .env)
const idleMatrix = FLAG_KEYS.map((k) => `${k}=false`).join("\n");
const outDir = resolve(process.cwd(), "docs/co-arch-002");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "CO-ARCH-002-WAVE-6-IDLE-FLAG-MATRIX.env.txt"), idleMatrix + "\n");
console.log("OK: wrote docs/co-arch-002/CO-ARCH-002-WAVE-6-IDLE-FLAG-MATRIX.env.txt");

if (failed) {
  console.error("\nCO-ARCH-002-W6 VERIFY FAILED");
  process.exit(1);
}
console.log("\nCO-ARCH-002-W6 VERIFY PASSED (cutover ops ready; production flags NOT enabled)");
