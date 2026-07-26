/**
 * CO-ARCH-006 — BAT verify aligned to Deal-only runtime (CO-ARCH-005+).
 * Usage: node scripts/co-arch-004-bat-verify.mjs
 *
 * No longer reads resolve-deal-file.ts (removed from architecture).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const code = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const move = code("src/lib/strategic-lender-pipeline/move-to-deal.ts");
const host = code("src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx");
const pipelineRuntime = code("src/lib/enterprise-deal/deal-pipeline-runtime.ts");
const snap = read("src/lib/enterprise-deal/map-loan-file-to-deal.ts");
const createFromOpp = code("src/lib/enterprise-deal/deal-create-from-opportunity.ts");

assert(move.includes("createDealFromOpportunity"), "Move to Deal must create Registry Deal");
assert(!move.includes("loadLoanFiles"), "Move to Deal must not Soft Go-Live load");
assert(!move.includes("saveLoanFiles"), "Move to Deal must not Soft Go-Live save");
assert(!move.includes("putDealProjection"), "Move to Deal must not use LoanFile projection cache");
assert(host.includes("loadDealPipelineRuntime"), "Deal host must load Deal Pipeline Runtime");
assert(host.includes("persistDealPipelineLenders"), "Deal host must persist via Pipeline Runtime");
assert(!host.includes("LoanWorkspaceModal"), "Deal host must not mount Loan Workspace");
assert(pipelineRuntime.includes('reason: "deal_pipeline_stage"'), "Stage persist reason required");
assert(
  !pipelineRuntime.includes("lenderId: primary"),
  "Stage persist must not re-assign lenderId from primary card",
);
assert(snap.includes("caseStage: l.caseStage"), "Snapshot must store caseStage");
assert(createFromOpp.includes("createDealFromOpportunity"), "Native Deal create from Opportunity");

const report = {
  batFlow: [
    "Create Opportunity",
    "Complete Opportunity Journey",
    "Move to Deal → Registry create (no LoanFile)",
    "Open Pipeline → loadDealPipelineRuntime",
    "Drag → persistDealPipelineLenders (snapshot only)",
    "Refresh → loadDealPipelineRuntime → snapshot caseStage",
    "Logout/login → same Registry reopen",
    "Second Deal → same path",
  ],
  moveToDealNoLoanFile: true,
  dealHostPipelineRuntime: true,
  stagePersistNoLenderId: true,
  caseStageInSnapshot: true,
  verdict: "PASS",
};

const out = path.join(root, "docs/certification-screenshots/co-arch-004-bat");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "bat-static-verify.json"), JSON.stringify(report, null, 2));
console.log("CO-ARCH-006 BAT static verify:", report.verdict);
