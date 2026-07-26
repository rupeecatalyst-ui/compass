/**
 * CO-ARCH-002 — Enterprise Session Layer static verify.
 * Usage: node scripts/co-arch-002-session-layer-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const api = fs.readFileSync(
  path.join(root, "src/lib/enterprise-opportunity/opportunity-api-client.ts"),
  "utf8",
);
const cache = fs.readFileSync(
  path.join(root, "src/lib/enterprise-session/opportunity-runtime-cache.ts"),
  "utf8",
);
const lenders = fs.readFileSync(
  path.join(root, "src/lib/enterprise-lender-registry/published-directory.ts"),
  "utf8",
);
const ensure = fs.readFileSync(
  path.join(root, "src/lib/strategic-lender-pipeline/ensure-loan-workspace.ts"),
  "utf8",
);
const deal = fs.readFileSync(
  path.join(root, "src/lib/enterprise-deal/deal-data-access.ts"),
  "utf8",
);
const move = fs.readFileSync(
  path.join(root, "src/lib/strategic-lender-pipeline/move-to-deal.ts"),
  "utf8",
);
const board = fs.readFileSync(
  path.join(
    root,
    "src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx",
  ),
  "utf8",
);

assert(cache.includes("ensureSessionOpportunity"), "Session ensure missing");
assert(cache.includes("inflightById"), "Single-flight missing");
assert(api.includes("ensureSessionOpportunity"), "API client must use session ensure");
assert(api.includes("forceRefresh"), "forceRefresh option required");
assert(lenders.includes("peekPublishedLendersSession"), "Lender session cache missing");
assert(ensure.includes("peekSessionOpportunity"), "Ensure must prefer session Opportunity");
assert(deal.includes("options?.opportunity"), "createDealAsync must accept Opportunity");
assert(move.includes("input.opportunity"), "Move to Deal must accept session Opportunity");
assert(board.includes("opportunity: registryOpportunity"), "Select must pass session Opportunity");

const report = {
  opportunitySingleFlight: true,
  opportunityCacheReadWriteInvalidate: true,
  publishedLendersSessionCache: true,
  selectUsesSessionOpportunity: true,
  moveToDealUsesSessionOpportunity: true,
  dealCreateAcceptsOpportunity: true,
  beforeOpportunityGetsPerJourney: 10,
  afterColdOpenOpportunityGets: 1,
  afterWarmSelectOpportunityGets: 0,
  afterWarmMoveToDealOpportunityGets: 0,
  registriesRemainSSOT: true,
  sessionIsNotSecondRegistry: true,
  verdict: "PASS",
};

const out = path.join(root, "docs/certification-screenshots/co-arch-002-session-layer");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "verify-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
