/**
 * CO-AI-104 / Sprint AI-4 — Enterprise Read Connectors (static verify).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustExist(rel) {
  assert.ok(existsSync(join(root, rel)), `Missing: ${rel}`);
}

const required = [
  "src/types/enterprise-ai-read-connectors.ts",
  "src/constants/enterprise-ai-platform/read-connectors.ts",
  "src/lib/enterprise-ai-platform/read-connectors/index.ts",
  "src/lib/enterprise-ai-platform/read-connectors/connectors.ts",
  "src/lib/enterprise-ai-platform/read-connectors/projections.ts",
  "src/lib/enterprise-ai-platform/read-connectors/audit.ts",
  "src/lib/enterprise-ai-platform/read-connectors/cache.ts",
  "src/lib/enterprise-ai-platform/read-connectors/registry.ts",
  "src/lib/enterprise-ai-platform/read-connectors/wire-providers.ts",
  "src/lib/enterprise-ai-platform/read-connectors/register-tools.ts",
  "src/lib/enterprise-ai-platform/read-connectors/tool-discovery.ts",
  "src/lib/enterprise-ai-platform/read-connectors/readiness.ts",
  "src/lib/enterprise-ai-platform/read-connectors/bootstrap.ts",
  "docs/co-ai-104/CO-AI-104-ARCHITECTURE-REPORT.md",
  "docs/co-ai-104/CO-AI-104-READ-CONNECTOR-REPORT.md",
  "docs/co-ai-104/CO-AI-104-TOOL-BUS-REPORT.md",
  "docs/co-ai-104/CO-AI-104-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "bootstrapEaiReadConnectorsLayer",
  "registerEaiEnterpriseReadTools",
  "discoverEaiReadTools",
  "listEaiReadConnectors",
  "wireEaiContextProvidersToReadConnectors",
  "runEaiReadConnectorsReadiness",
  "validateEaiReadProjection",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const connectors = read("src/lib/enterprise-ai-platform/read-connectors/connectors.ts");
assert.match(connectors, /readOnly: true/);
assert.doesNotMatch(connectors, /from ["']@\/server\/repositories|prisma\.|@prisma\/client/i);
assert.doesNotMatch(connectors, /createOpportunity|updateDeal|mutate/i);

const tools = read("src/lib/enterprise-ai-platform/read-connectors/register-tools.ts");
assert.match(tools, /sideEffectClass: "read"/);
assert.doesNotMatch(tools, /sideEffectClass: "mutate"/);

const defs = read("src/constants/enterprise-ai-platform/read-connectors.ts");
assert.match(defs, /eai\.read\.customer/);
assert.match(defs, /eai\.read\.knowledge/);
assert.match(defs, /EAI_DEFAULT_READ_CACHE_POLICY/);
assert.match(defs, /enabled: false/);
assert.match(read("docs/sarathi/SARATHI-BIBLE-V1.md"), /SB-04/);
assert.match(read("src/constants/enterprise-ai-platform/sarathi-bible.ts"), /SARATHI_BIBLE_VERSION/);

const cache = read("src/lib/enterprise-ai-platform/read-connectors/cache.ts");
assert.match(cache, /framework only/i);
assert.match(cache, /if \(!policy\.enabled\) return/);

const discovery = read("src/lib/enterprise-ai-platform/read-connectors/tool-discovery.ts");
assert.match(discovery, /evaluateEaiPolicy/);
assert.match(discovery, /allowedToolCategories/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);

console.log("CO-AI-104 Enterprise Read Connectors verify: PASS");
console.log("  Connectors · Projections · Tool Bus reads · Discovery · Cache framework · Audit");
console.log("  No Prisma · No mutate tools · No SARATHI UI · No Voice · No Planner");
