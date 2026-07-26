/**
 * CO-ARCH-002-W4 — verify dual-read idle (flags OFF), shadow + port modules present.
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
  "DEAL_REGISTRY_SHADOW_READ",
  "NEXT_PUBLIC_DEAL_REGISTRY_SHADOW_READ",
  "DEAL_REGISTRY_PORT_RUNTIME",
  "NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME",
  "DEAL_REGISTRY_IMPORT_ENABLED",
  "DEAL_REGISTRY_BLOCK_LOCAL_WRITE",
];

let failed = false;

for (const key of FLAG_KEYS) {
  if (flagOn(key)) {
    console.error(`FAIL: ${key} must be OFF for Wave 4 delivery`);
    failed = true;
  } else {
    console.log(`OK: ${key} OFF`);
  }
}

const required = [
  "src/lib/enterprise-deal/shadow-read.ts",
  "src/lib/enterprise-deal/deal-registry-port.ts",
  "src/lib/enterprise-deal/map-deal-to-registry-row.ts",
  "src/components/catalyst-one/my-deals/my-deals-workspace.tsx",
];

for (const rel of required) {
  if (!existsSync(resolve(process.cwd(), rel))) {
    console.error(`FAIL: missing ${rel}`);
    failed = true;
  } else {
    console.log(`OK: ${rel}`);
  }
}

const workspace = readFileSync(
  resolve(process.cwd(), "src/components/catalyst-one/my-deals/my-deals-workspace.tsx"),
  "utf8",
);
if (!workspace.includes("queueMyDealsShadowRead")) {
  console.error("FAIL: My Deals missing shadow-read hook");
  failed = true;
} else {
  console.log("OK: My Deals shadow-read hook");
}
if (!workspace.includes("isDealRegistryPortRuntimeActive")) {
  console.error("FAIL: My Deals missing port-runtime gate");
  failed = true;
} else {
  console.log("OK: My Deals port-runtime gate");
}
if (!workspace.includes("portRows ?? localRows")) {
  console.error("FAIL: My Deals must default to localRows when port OFF");
  failed = true;
} else {
  console.log("OK: My Deals defaults to localRows (UX unchanged when flags OFF)");
}

const shadow = readFileSync(
  resolve(process.cwd(), "src/lib/enterprise-deal/shadow-read.ts"),
  "utf8",
);
if (!shadow.includes("SHADOW_READ_MATERIAL_MISMATCH_RATE")) {
  console.error("FAIL: material mismatch threshold missing");
  failed = true;
} else {
  console.log("OK: material mismatch threshold present");
}

if (failed) {
  console.error("\nCO-ARCH-002-W4 VERIFY FAILED");
  process.exit(1);
}
console.log("\nCO-ARCH-002-W4 VERIFY PASSED (shadow+port idle; flags OFF; local SSOT primary)");
