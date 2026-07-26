/**
 * CO-ARCH-005 — Static verify: Deal runtime must not import Soft Go-Live I/O.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const FAIL = [];

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function assertNoImport(src, fileLabel, bad) {
  const code = stripComments(src);
  for (const pattern of bad) {
    if (code.includes(pattern)) {
      FAIL.push(`${fileLabel} still contains runtime reference: ${pattern}`);
    }
  }
}

const dealHost = join(ROOT, "src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx");
const moveToDeal = join(ROOT, "src/lib/strategic-lender-pipeline/move-to-deal.ts");
const pipelineRuntime = join(ROOT, "src/lib/enterprise-deal/deal-pipeline-runtime.ts");
const registryPort = join(ROOT, "src/lib/enterprise-deal/deal-registry-port.ts");

const hostSrc = readFileSync(dealHost, "utf8");
const moveSrc = readFileSync(moveToDeal, "utf8");
const pipeSrc = readFileSync(pipelineRuntime, "utf8");
const portSrc = readFileSync(registryPort, "utf8");

assertNoImport(hostSrc, "DealWorkspaceHost", [
  "LoanWorkspaceModal",
  "loadLoanFiles",
  "saveLoanFiles",
  "resolve-deal-file",
  "deal-projection-cache",
  "map-deal-to-loan-file",
]);
if (!stripComments(hostSrc).includes("loadDealPipelineRuntime")) {
  FAIL.push("DealWorkspaceHost missing loadDealPipelineRuntime");
}
if (!stripComments(hostSrc).includes("persistDealPipelineLenders")) {
  FAIL.push("DealWorkspaceHost missing persistDealPipelineLenders");
}

assertNoImport(moveSrc, "move-to-deal", [
  "loadLoanFiles",
  "saveLoanFiles",
  "ensureLoanWorkspace",
  "putDealProjection",
  "peekDealProjection",
  "updateDeal(",
  "persistNewDealToEnterpriseRegistry",
]);
if (!stripComments(moveSrc).includes("createDealFromOpportunity")) {
  FAIL.push("move-to-deal must create via createDealFromOpportunity");
}

assertNoImport(pipeSrc, "deal-pipeline-runtime", [
  "loadLoanFiles",
  "saveLoanFiles",
  "mapEnterpriseDealToLoanFileStub",
]);

assertNoImport(portSrc, "deal-registry-port", [
  'from "@/lib/loan-files-storage"',
  "loadLoanFiles(",
]);

console.log("CO-ARCH-005 Deal-only runtime verify");
if (FAIL.length) {
  FAIL.forEach((f) => console.error("FAIL:", f));
  process.exit(1);
}
console.log(
  "PASS — Deal Workspace / Move to Deal / Pipeline Runtime / My Deals port are Soft Go-Live free.",
);
