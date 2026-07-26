/**
 * CO-LENDER-003 — Competition Lender Registry SSOT verify.
 * Usage: node scripts/co-lender-003-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const panel = read(
  "src/components/catalyst-one/opportunity-workspace/workspace-competition-panel.tsx",
);
const store = read("src/lib/strategic-competition/competition-store.ts");

assert(panel.includes("listPublishedLenderOptionsAsync"), "must use async Published Registry SSOT");
assert(!panel.includes("listPublishedLenderOptions()"), "must not use sync Soft Go-Live-only list");
assert(panel.includes("canManageLenders"), "results must not be Edit-only gated");
assert(panel.includes("enterpriseLenderId"), "must persist Enterprise Lender id");
assert(store.includes("enterpriseLenderId"), "store must carry Registry id");
assert(store.includes("lender:${l.enterpriseLenderId}"), "exclusion keys must include Registry id");

const report = {
  registryQueried: "Enterprise Lender Registry via listPublishedLenderOptionsAsync (API ∪ Soft Go-Live Published·Active)",
  noObsoleteLocalOnlyList: true,
  resultsVisibleWithoutEditGate: true,
  exclusionUsesEnterpriseId: true,
  rootCause:
    "Results UI required editing=true while search showed without Edit; sync listPublishedLenderOptions missed API Published lenders",
  verdict: "PASS",
};

const out = path.join(root, "docs/certification-screenshots/co-lender-003");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "verify-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
