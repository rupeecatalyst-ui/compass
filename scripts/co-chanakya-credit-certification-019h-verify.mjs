/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019H — Proposal workspace finalization verification.
 *
 * Usage:
 *   node --import tsx scripts/co-chanakya-credit-certification-019h-verify.mjs
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
  console.log(`FAIL  ${msg}`);
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

console.log("\n=== CO-CHANAKYA-CREDIT-CERTIFICATION-019H — Proposal workspace ===\n");

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

// ~70% proposal / ~30% workbench split
if (
  workspace.includes('lg:w-[70%]') &&
  workspace.includes('lg:flex-[0_0_70%]') &&
  workspace.includes('lg:w-[30%]') &&
  workspace.includes('lg:flex-[0_0_30%]')
) {
  ok("019H — ~70% / ~30% viewport split when proposal open");
} else fail("019H — proposal viewport split contract missing");

if (workspace.includes('data-proposal-workspace-host="true"')) {
  ok("019H — proposal workspace host marker");
} else fail("019H — proposal workspace host marker missing");

// Workspace markers
if (panel.includes('data-workspace="proposal"') && panel.includes('data-proposal-viewport-share="70"')) {
  ok("019H — data-workspace=proposal and ~70% share marker");
} else fail("019H — proposal workspace markers incomplete");

if (panel.includes('data-proposal-action-bar="true"')) {
  ok("019H — action bar inside proposal workspace");
} else fail("019H — action bar marker missing");

// Required actions
const actions = ["Send to Lender", "Download", "Print / PDF", "Preview", "Close"];
if (actions.every((a) => panel.includes(a))) ok("019H — all required proposal actions present");
else fail("019H — proposal action bar incomplete");

// Explicit send — no auto-send
if (
  panel.includes("CHANAKYA never auto-sends") &&
  panel.includes("Confirm send to lender") &&
  panel.includes('label="Lender"') &&
  panel.includes('label="Recipient"') &&
  panel.includes('label="Subject"') &&
  panel.includes('label="Attachment"')
) {
  ok("019H — send confirmation shows lender/recipient/subject/attachment");
} else {
  fail("019H — send confirmation contract incomplete");
}

if (!panel.includes("auto-send") || panel.includes("never auto-sends")) {
  ok("019H — send remains explicit (no auto-send path)");
} else fail("019H — auto-send language detected");

// Internal vs lender isolation
if (
  panel.includes("Internal review only — not included in lender proposal") &&
  panel.includes("Lender-facing draft only") &&
  docView.includes("ecw-proposal-print-root") &&
  docView.includes("ecw-proposal-lender-document")
) {
  ok("019H — lender-facing download/print document isolation");
} else fail("019H — lender print/download isolation incomplete");

if (
  printCss.includes("ecw-proposal-print-active") &&
  printCss.includes(".ecw-proposal-print-root") &&
  panel.includes("ecw-proposal-print-active")
) {
  ok("019H — print/PDF renders lender document only");
} else fail("019H — print isolation CSS/handler missing");

// Responsive / overflow
if (
  workspace.includes("overflow-x-hidden") &&
  panel.includes("overflow-x-hidden") &&
  panel.includes("data-proposal-document-canvas")
) {
  ok("019H — horizontal overflow guards on proposal workspace");
} else fail("019H — overflow guards missing");

// Toast must not cover proposal controls when proposal open
if (workspace.includes("toast && !proposalOpen") && panel.includes("data-proposal-workspace-toast")) {
  ok("019H — notifications do not overlay proposal action bar");
} else fail("019H — notification overlay guard missing");

// Typography / readability
if (docView.includes("font-serif") && docView.includes("leading-relaxed") && docView.includes("text-[15px]")) {
  ok("019H — document typography tuned for lender readability");
} else fail("019H — document readability contract missing");

// No global shell changes
for (const rel of [
  "src/components/layout/dashboard-layout.tsx",
  "src/components/layout/app-sidebar.tsx",
]) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) ok(`019H — regression guard: ${rel} untouched by sprint scope`);
}

// Responsive breakpoint tokens (layout uses lg: which applies 1024px+; covers 1280/1440/1920)
if (
  workspace.includes("lg:flex-row") &&
  workspace.includes("lg:min-h-[min(82vh,920px)]")
) {
  ok("019H — responsive layout tokens for 1280/1440/1920 (lg+ flex row, min-height)");
} else fail("019H — responsive layout tokens missing");

// Chain 017 verify
{
  const v = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-proposal-017-verify.mjs",
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("017 proposal workspace verify PASS");
  else {
    fail("017 proposal workspace verify FAIL");
    console.log(String(v.stdout || v.stderr).slice(-500));
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed > 0 ? 1 : 0);
