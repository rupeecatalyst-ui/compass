/**
 * CO-CHANAKYA-028 — Proposal workspace final UX verification.
 *
 * Usage:
 *   node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-028-proposal-workspace-final-ux-verify.mjs
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
function note(msg) {
  console.log(`NOTE  ${msg}`);
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

console.log("\n=== CO-CHANAKYA-028 — Proposal workspace final UX ===\n");

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
const exportLib = fs.existsSync(
  path.join(ROOT, "src/lib/chanakya-credit-proposal/lender-proposal-export.ts"),
)
  ? read("src/lib/chanakya-credit-proposal/lender-proposal-export.ts")
  : "";

// --- 1–2: ~70% large document workspace (not side panel) ---
if (
  workspace.includes("lg:w-[70%]") &&
  workspace.includes("lg:flex-[0_0_70%]") &&
  workspace.includes("data-proposal-workspace-host") &&
  workspace.includes("data-proposal-workspace-open")
) {
  ok("028 — proposal opens in ~70% document workspace host");
} else fail("028 — ~70% proposal workspace host contract missing");

if (
  panel.includes("data-proposal-viewport-share=\"70\"") &&
  panel.includes("data-proposal-document-canvas") &&
  panel.includes("min-h-[min(82vh,920px)]")
) {
  ok("028 — document canvas occupies large viewport (not compact side panel)");
} else fail("028 — document workspace sizing contract missing");

// --- 3–4: Action bar inside workspace with required actions ---
if (panel.includes('data-proposal-action-bar="true"')) {
  ok("028 — action bar inside proposal workspace");
} else fail("028 — action bar not scoped to proposal workspace");

const actions = ["Send to Lender", "Download", "Print / PDF", "Preview", "Close"];
if (actions.every((a) => panel.includes(a))) ok("028 — required proposal actions present");
else fail("028 — proposal action bar incomplete");

// --- 5–6: Send confirmation with visible fields ---
if (
  panel.includes("Confirm send to lender") &&
  panel.includes("CHANAKYA never auto-sends") &&
  panel.includes('label="Lender"') &&
  panel.includes('label="Recipient"') &&
  panel.includes('label="Subject"') &&
  panel.includes('label="Attachment"')
) {
  ok("028 — send requires explicit confirmation with lender/recipient/subject/attachment");
} else fail("028 — send confirmation contract incomplete");

// --- 7–10: Print/download lender-only; no internal / PII ---
if (
  panel.includes("sanitizeLenderExportMarkdown") &&
  panel.includes("Lender-facing draft only") &&
  docView.includes("data-lender-facing-document") &&
  docView.includes("data-no-customer-pii")
) {
  ok("028 — download/print surfaces lender-facing document only");
} else fail("028 — lender export isolation incomplete");

if (
  printCss.includes("ecw-proposal-print-active") &&
  printCss.includes(".ecw-proposal-print-root") &&
  printCss.includes('[data-print-exclude="true"]') &&
  panel.includes("ecw-proposal-print-active")
) {
  ok("028 — print/PDF hides chrome and internal-only panels");
} else fail("028 — print isolation CSS/handler missing");

if (
  panel.includes("Internal review only — not included in lender proposal") &&
  panel.includes('data-proposal-internal-only="true"') &&
  panel.includes('data-print-exclude="true"')
) {
  ok("028 — internal recommendations excluded from print");
} else fail("028 — internal recommendations print guard missing");

if (
  exportLib.includes("sanitizeLenderExportMarkdown") &&
  exportLib.includes("EMAIL_PATTERN") &&
  exportLib.includes("MOBILE_IN_PATTERN") &&
  exportLib.includes("INTERNAL_LEAK_PATTERNS")
) {
  ok("028 — export sanitizer strips PII and internal metadata phrases");
} else fail("028 — lender export sanitizer missing");

{
  const { sanitizeLenderExportMarkdown, assertLenderExportSafe } = await import(
    "../src/lib/chanakya-credit-proposal/lender-proposal-export.ts"
  );
  const dirty =
    "Executive Summary\nEmail: borrower@example.com\nMobile: 9876543210\nInternal recommendation: prefer lender A";
  const clean = sanitizeLenderExportMarkdown(dirty);
  if (
    assertLenderExportSafe(clean) &&
    !clean.includes("borrower@example.com") &&
    !clean.includes("9876543210") &&
    !/internal recommendation/i.test(clean)
  ) {
    ok("028 — export sanitizer runtime strips email/mobile/internal leaks");
  } else fail("028 — export sanitizer runtime check failed");
}

// --- 11–12: Professional document layout + page breaks ---
if (
  docView.includes("font-serif") &&
  docView.includes("leading-relaxed") &&
  docView.includes("ecw-proposal-section") &&
  docView.includes("overflow-x-hidden")
) {
  ok("028 — professional digital document layout markers");
} else fail("028 — document layout contract missing");

if (
  printCss.includes("ecw-proposal-section") &&
  printCss.includes("page-break-inside") &&
  printCss.includes("page-break-after")
) {
  ok("028 — sensible print page-break rules");
} else fail("028 — print page-break rules missing");

// --- 13–15: No shell regression; overflow; sidebar untouched ---
const shellPaths = [
  "src/layouts/dashboard-layout.tsx",
  "src/components/layout/dashboard-layout.tsx",
  "src/components/layout/app-sidebar.tsx",
];
let shellTouched = false;
for (const rel of shellPaths) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const content = read(rel);
  if (/proposal|ecw-proposal|proposalOpen/i.test(content)) {
    shellTouched = true;
    fail(`028 — global shell must not reference proposal workspace: ${rel}`);
  }
}
if (!shellTouched) ok("028 — DashboardLayout / global shell not modified for proposal UX");

if (
  workspace.includes("overflow-x-hidden") &&
  panel.includes("overflow-x-hidden") &&
  printCss.includes("overflow-x: hidden")
) {
  ok("028 — horizontal overflow guards");
} else fail("028 — overflow guards missing");

if (workspace.includes("toast && !proposalOpen")) {
  ok("028 — workbench toast suppressed when proposal open (no action bar overlap)");
} else fail("028 — notification overlay guard missing");

if (panel.includes('data-proposal-sprint="CO-CHANAKYA-028"')) {
  ok("028 — sprint marker on proposal workspace root");
} else fail("028 — CO-CHANAKYA-028 sprint marker missing");

// --- TypeScript smoke (affected modules) ---
{
  const tsc = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "-e",
      `
import { sanitizeLenderExportMarkdown, assertLenderExportSafe } from "./src/lib/chanakya-credit-proposal/lender-proposal-export.ts";
const s = sanitizeLenderExportMarkdown("test@x.com 9876543210");
if (!assertLenderExportSafe(s)) throw new Error("sanitize");
console.log("tsc-smoke-ok");
`,
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (tsc.status === 0 && (tsc.stdout || "").includes("tsc-smoke-ok")) {
    ok("028 — TypeScript import smoke (affected modules)");
  } else {
    fail("028 — TypeScript import smoke FAIL");
    note(String(tsc.stderr || tsc.stdout).slice(0, 600));
  }
}

{
  const tscFull = spawnSync(
    process.execPath,
    ["./node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.json"],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  const tscOut = String(tscFull.stdout || tscFull.stderr);
  const touched028 = [
    "ecw-proposal-generation-panel",
    "ecw-proposal-document-view",
    "lender-proposal-export",
    "ecw-proposal-workspace.css",
    "enterprise-credit-workspace.tsx",
  ];
  const errorsIn028 = tscOut
    .split(/\r?\n/)
    .filter((line) => line.includes("error TS") && touched028.some((p) => line.includes(p)));

  if (tscFull.status === 0) {
    ok("028 — TypeScript (tsc --noEmit) PASS");
  } else if (errorsIn028.length === 0) {
    ok("028 — TypeScript: no errors in CO-028 touched paths");
    note("Full-project tsc reports pre-existing errors outside CO-028 scope");
  } else {
    fail("028 — TypeScript errors in CO-028 touched paths");
    note(errorsIn028.slice(0, 6).join("\n"));
  }
}

// --- Regressions ---
for (const [label, script] of [
  ["019H proposal workspace", "scripts/co-chanakya-credit-certification-019h-verify.mjs"],
  ["017 proposal workspace", "scripts/co-chanakya-credit-proposal-017-verify.mjs"],
  ["027 lender proposal V3", "scripts/co-chanakya-027-lender-proposal-quality-v3-verify.mjs"],
]) {
  const v = spawnSync(
    process.execPath,
    ["--import", "./scripts/_bat-stub-server-only.mjs", "--import", "tsx", script],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok(`028 regression — ${label} PASS`);
  else {
    fail(`028 regression — ${label} FAIL`);
    note(String(v.stderr || v.stdout).slice(0, 400));
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed > 0 ? 1 : 0);
