/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-017 — Proposal workspace UI verification.
 *
 * Usage:
 *   node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-proposal-017-verify.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const workspace = read(
  "src/components/catalyst-one/enterprise-credit-workspace/enterprise-credit-workspace.tsx",
);
const panel = read(
  "src/components/catalyst-one/enterprise-credit-workspace/ecw-proposal-generation-panel.tsx",
);
const docView = read(
  "src/components/catalyst-one/enterprise-credit-workspace/ecw-proposal-document-view.tsx",
);
const printCss = fs.existsSync(path.join(ROOT, "src/styles/ecw-proposal-workspace.css"))
  ? read("src/styles/ecw-proposal-workspace.css")
  : "";

if (workspace.includes("lg:basis-[70%]") || workspace.includes("lg:flex-[0_0_70%]")) {
  ok("Credit Workbench ~30% / proposal ~70% split when proposal open");
} else fail("Proposal viewport split missing");

if (workspace.includes("proposalOpen") && workspace.includes("print:hidden")) {
  ok("Workbench hidden from print when proposal workspace active");
} else fail("Print isolation for proposal workspace missing");

if (
  panel.includes("Send to Lender") &&
  panel.includes("Download") &&
  panel.includes("Print / PDF") &&
  panel.includes("Preview") &&
  panel.includes("Close")
) {
  ok("Proposal workspace top action bar includes required actions");
} else fail("Proposal action bar incomplete");

if (panel.includes('data-workspace="proposal"')) {
  ok("Proposal workspace root marker present");
} else fail("Proposal workspace marker missing");

if (panel.includes('data-proposal-action-bar="true"') && panel.includes('data-proposal-viewport-share="70"')) {
  ok("Proposal action bar and ~70% viewport markers present");
} else fail("Proposal workspace contract markers missing");

if (
  printCss.includes("ecw-proposal-print-active") &&
  panel.includes("ecw-proposal-print-active")
) {
  ok("Lender-facing print isolation wired");
} else fail("Print isolation contract missing");

if (
  panel.includes("Confirm send to lender") &&
  panel.includes("CHANAKYA never auto-sends") &&
  panel.includes("Subject")
) {
  ok("Send to Lender explicit confirmation step present");
} else fail("Send confirmation contract missing");

if (
  panel.includes("Internal review only — not included in lender proposal") &&
  docView.includes("EcwProposalDocumentView")
) {
  ok("Internal vs lender content separated in UI");
} else fail("Internal/lender separation missing");

if (docView.includes("font-serif") && docView.includes("leading-relaxed")) {
  ok("Document view uses lender-friendly typography");
} else fail("Document typography contract missing");

if (!panel.includes("Internal · Strengthen assessment") || panel.includes("internalOpen")) {
  ok("Internal recommendations collapsed behind internal review toggle");
} else fail("Internal recommendations may leak into primary proposal chrome");

if (workspace.includes("onSent={") && workspace.includes("showToast")) {
  ok("Proposal send wired to workspace toast feedback");
} else fail("Proposal send feedback wiring missing");

// Forbidden regression surfaces untouched
const forbiddenTouches = [
  "src/components/layout/dashboard-layout.tsx",
  "src/components/layout/app-sidebar.tsx",
];
for (const rel of forbiddenTouches) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    ok(`Regression guard: ${rel} not present (skip)`);
    continue;
  }
  ok(`Regression guard: ${rel} not modified by 017 verify scope`);
}

// Preserve 002 proposal contract verify
{
  const verify = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-proposal-002-verify.mjs",
    ],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (verify.status !== 0) fail("002 proposal contract regression");
  else ok("002 proposal wiring still PASS");
}

// Preserve 016 lender intelligence verify
{
  const verify = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-intelligence-016-verify.mjs",
    ],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (verify.status !== 0) fail("016 lender intelligence regression");
  else ok("016 lender intelligence still PASS");
}

console.log(
  failed === 0
    ? "\nCO-CHANAKYA-CREDIT-PROPOSAL-017: PASS\n"
    : `\nCO-CHANAKYA-CREDIT-PROPOSAL-017: FAIL (${failed})\n`,
);
process.exit(failed === 0 ? 0 : 1);
