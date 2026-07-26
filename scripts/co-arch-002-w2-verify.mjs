/**
 * CO-ARCH-002-W2 — verify Deal API engine idle (flags OFF; routes present; no UI wiring).
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

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

function collectRouteFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) collectRouteFiles(p, acc);
    else if (name === "route.ts") acc.push(p);
  }
  return acc;
}

const FLAG_KEYS = [
  "DEAL_REGISTRY_API_ENABLED",
  "DEAL_REGISTRY_DUAL_WRITE",
  "DEAL_REGISTRY_PORT_RUNTIME",
  "DEAL_REGISTRY_IMPORT_ENABLED",
  "DEAL_REGISTRY_BLOCK_LOCAL_WRITE",
];

const REQUIRED_ROUTE_FRAGMENTS = [
  join("enterprise-deals", "route.ts"),
  join("enterprise-deals", "[dealId]", "route.ts"),
  join("enterprise-deals", "[dealId]", "archive", "route.ts"),
  join("enterprise-deals", "[dealId]", "restore", "route.ts"),
  join("enterprise-deals", "[dealId]", "transitions", "route.ts"),
  join("enterprise-deals", "[dealId]", "timeline", "route.ts"),
  join("enterprise-deals", "[dealId]", "snapshots", "route.ts"),
  join("enterprise-deals", "[dealId]", "health", "route.ts"),
  join("enterprise-deals", "[dealId]", "counterparties", "route.ts"),
  join("enterprise-deals", "[dealId]", "documents", "route.ts"),
  join("enterprise-deals", "[dealId]", "tasks", "route.ts"),
  join("enterprise-deals", "[dealId]", "activities", "route.ts"),
];

let failed = false;

for (const key of FLAG_KEYS) {
  if (flagOn(key)) {
    console.error(`FAIL: ${key} must be OFF for Wave 2 delivery (got enabled)`);
    failed = true;
  } else {
    console.log(`OK: ${key} OFF`);
  }
}

const apiRoot = resolve(process.cwd(), "src/app/api/enterprise-deals");
const routes = collectRouteFiles(apiRoot);
console.log(`OK: found ${routes.length} Deal API route.ts files`);

for (const frag of REQUIRED_ROUTE_FRAGMENTS) {
  const full = resolve(process.cwd(), "src/app/api", frag);
  if (existsSync(full)) console.log(`OK: route ${frag}`);
  else {
    console.error(`FAIL: missing route ${frag}`);
    failed = true;
  }
}

// No UI consumer of Deal API client (Wave 2 forbids UI wiring)
const uiRoots = [
  resolve(process.cwd(), "src/components"),
  resolve(process.cwd(), "src/app/(dashboard)"),
];
const forbiddenPatterns = [
  "/api/enterprise-deals",
  "enterpriseDealService",
  "isDealRegistryApiEnabled",
  "isDealRegistryPortRuntimeActive",
];

function scanDir(dir, hits) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) scanDir(p, hits);
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) {
      const text = readFileSync(p, "utf8");
      for (const pat of forbiddenPatterns) {
        if (text.includes(pat) && !p.includes("enterprise-deals")) {
          hits.push({ file: p, pat });
        }
      }
    }
  }
}

const hits = [];
for (const root of uiRoots) scanDir(root, hits);
if (hits.length === 0) {
  console.log("OK: no UI/dashboard consumers of Deal API");
} else {
  for (const h of hits) {
    console.error(`FAIL: UI wiring detected ${h.pat} in ${h.file}`);
  }
  failed = true;
}

if (failed) {
  console.error("\nCO-ARCH-002-W2 VERIFY FAILED");
  process.exit(1);
}
console.log("\nCO-ARCH-002-W2 VERIFY PASSED (API engine idle; flags OFF; no UI)");
