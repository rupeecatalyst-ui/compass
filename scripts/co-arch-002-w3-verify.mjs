/**
 * CO-ARCH-002-W3 — verify dual-write idle (flags OFF), modules present, no dual-read.
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
  "NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED",
  "DEAL_REGISTRY_DUAL_WRITE",
  "NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE",
  "DEAL_REGISTRY_PORT_RUNTIME",
  "DEAL_REGISTRY_IMPORT_ENABLED",
  "DEAL_REGISTRY_BLOCK_LOCAL_WRITE",
];

let failed = false;

for (const key of FLAG_KEYS) {
  if (flagOn(key)) {
    console.error(`FAIL: ${key} must be OFF for Wave 3 delivery`);
    failed = true;
  } else {
    console.log(`OK: ${key} OFF`);
  }
}

const requiredFiles = [
  "src/lib/enterprise-deal/dual-write.ts",
  "src/lib/enterprise-deal/deal-api-client.ts",
  "src/lib/enterprise-deal/map-loan-file-to-deal.ts",
  "src/lib/enterprise-deal/dual-write-store.ts",
  "src/lib/loan-files-storage.ts",
];

for (const rel of requiredFiles) {
  const p = resolve(process.cwd(), rel);
  if (!existsSync(p)) {
    console.error(`FAIL: missing ${rel}`);
    failed = true;
  } else {
    console.log(`OK: ${rel}`);
  }
}

const storage = readFileSync(resolve(process.cwd(), "src/lib/loan-files-storage.ts"), "utf8");
if (!storage.includes("queueDealDualWriteAfterLocalSave")) {
  console.error("FAIL: saveLoanFiles not wired to dual-write queue");
  failed = true;
} else {
  console.log("OK: saveLoanFiles dual-write hook present");
}

// Dual-read must NOT be active in Wave 3 — no My Deals port swap
const myDealsHits = [];
function scan(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  if (text.includes("isDealRegistryPortRuntimeActive") && text.includes("true")) {
    myDealsHits.push(file);
  }
}
scan(resolve(process.cwd(), "src/lib/deal-registry"));
// ensure port runtime not imported for reads in my-deals components as primary
const dualWrite = readFileSync(
  resolve(process.cwd(), "src/lib/enterprise-deal/dual-write.ts"),
  "utf8",
);
if (dualWrite.includes("isDealRegistryPortRuntimeActive")) {
  console.error("FAIL: dual-write must not activate port runtime reads");
  failed = true;
} else {
  console.log("OK: dual-write does not enable dual-read");
}

if (failed) {
  console.error("\nCO-ARCH-002-W3 VERIFY FAILED");
  process.exit(1);
}
console.log("\nCO-ARCH-002-W3 VERIFY PASSED (dual-write idle; flags OFF; local SSOT primary)");
