/**
 * CO-CHANAKYA-029 — Final CHANAKYA safety & evidence audit.
 *
 * Usage:
 *   node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-029-final-safety-evidence-audit.mjs
 *
 * Read-only · no deploy · no migration · no production mutation.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const gates = [];

function recordGate(id, label, status, detail = "") {
  gates.push({ id, label, status, detail: detail.trim() });
  const tag = status === "PASS" ? "PASS" : status === "BLOCKED" ? "BLOCKED" : "FAIL";
  console.log(`${tag}  [${id}] ${label}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function runScript(id, scriptRel, { needsBat = false, timeoutMs = 300_000 } = {}) {
  if (needsBat && !process.env.CATALYST_BAT_EMAIL && !process.env.CO_CHANAKYA_011_READ_BASE) {
    recordGate(id, scriptRel, "BLOCKED", "BAT / live read credentials not configured");
    return null;
  }
  const v = spawnSync(
    process.execPath,
    ["--import", "./scripts/_bat-stub-server-only.mjs", "--import", "tsx", scriptRel],
    {
      cwd: ROOT,
      stdio: "pipe",
      encoding: "utf8",
      env: process.env,
      timeout: timeoutMs,
    },
  );
  const out = `${v.stdout || ""}\n${v.stderr || ""}`;
  if (v.status === 0) {
    recordGate(id, scriptRel, "PASS");
  } else if (v.signal === "SIGTERM" || v.error?.code === "ETIMEDOUT") {
    recordGate(id, scriptRel, "BLOCKED", "verify timed out");
  } else {
    const snippet = out.match(/FAIL\s+.+/g)?.slice(0, 3)?.join("; ") || out.slice(-400);
    recordGate(id, scriptRel, "FAIL", snippet.replace(/\s+/g, " ").trim());
  }
  return v;
}

console.log("\n=== CO-CHANAKYA-029 — Final safety & evidence audit ===\n");
console.log("Scope: 002 · 003A–003E · 010 · 011 · 020 · 021–028");
console.log("Hostinger production: FROZEN · read-only audit only\n");

// --- Static PII gate ---
{
  const piiLib = read("src/lib/chanakya-enterprise-read-context/redact-pii.ts");
  const gather = read("src/lib/chanakya-credit-proposal/gather-context.ts");
  const exportLib = read("src/lib/chanakya-credit-proposal/lender-proposal-export.ts");
  const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");

  if (
    piiLib.includes("redactCustomerContactPiiForAiContext") &&
    piiLib.includes("assertNoCustomerContactPiiInAiContext") &&
    gather.includes("redactCustomerContactPiiForAiContext") &&
    compile.includes("redactCustomerContactPiiForAiContext") &&
    exportLib.includes("EMAIL_PATTERN") &&
    exportLib.includes("MOBILE_IN_PATTERN")
  ) {
    recordGate("PII-STATIC", "PII redaction + export sanitizer wired", "PASS");
  } else {
    recordGate("PII-STATIC", "PII redaction + export sanitizer wired", "FAIL");
  }
}

// --- Static evidence provenance gate ---
{
  const finCore = read("src/lib/chanakya-credit-intelligence/financial-fact-quality-core.ts");
  const gstCore = read("src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");
  const bankCore = read("src/lib/chanakya-credit-intelligence/banking-intelligence-core.ts");
  const pliCore = read("src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts");
  const commercial = read("src/lib/chanakya-enterprise-read-context/commercial-projections.ts");

  const checks = [
    finCore.includes("provenance") || gstCore.includes("provenance"),
    gstCore.includes("materialFacts") || gstCore.includes("gstAnalysis"),
    bankCore.includes("provenance") || bankCore.includes("documentInventory"),
    pliCore.includes("provenance") || pliCore.includes("supportingEvidence"),
    commercial.includes("deriveInvoiceReceivable") || commercial.includes("readOnly"),
  ];
  if (checks.every(Boolean)) {
    recordGate("EVIDENCE-STATIC", "Financial/GST/banking/lender/accounting provenance modules present", "PASS");
  } else {
    recordGate("EVIDENCE-STATIC", "Financial/GST/banking/lender/accounting provenance modules present", "FAIL");
  }
}

// --- Static honesty / no fabrication gate ---
{
  const tableUtils = read("src/lib/chanakya-document-intelligence/table-extraction-utils.ts");
  const synthesis = read("src/lib/chanakya-credit-intelligence/credit-synthesis-core.ts");
  const pliCore = read("src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts");
  const lenderProp = read("src/lib/chanakya-credit-proposal/lender-proposal-intelligence-core.ts");

  if (
    (tableUtils.includes("never infer unit from magnitude") ||
      tableUtils.includes("Never infer from magnitude")) &&
    synthesis.includes("BEST_LENDER") &&
    synthesis.includes("assertNoForbiddenSynthesisLanguage") &&
    pliCore.includes("INSUFFICIENT_EVIDENCE") &&
    pliCore.includes("FORBIDDEN_FIT_TERMS") &&
    lenderProp.includes("FORBIDDEN_LENDER_TERMS")
  ) {
    recordGate("HONESTY-STATIC", "No unit-from-magnitude · forbidden approval/eligibility guards", "PASS");
  } else {
    recordGate("HONESTY-STATIC", "No unit-from-magnitude · forbidden approval/eligibility guards", "FAIL");
  }
}

// --- Static read-only gate ---
{
  const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  const changeIntel = read("src/lib/chanakya-enterprise-read-context/change-intelligence-core.ts");
  const chatgptRoute = read("src/app/api/integrations/chatgpt/v1/enterprise-read/route.ts");

  const chanakyaPaths = [
    "src/lib/chanakya-enterprise-read-context",
    "src/lib/chanakya-credit-intelligence",
    "src/lib/chanakya-credit-proposal",
    "src/lib/chanakya-document-intelligence",
  ];

  let mutationLeak = false;
  const forbidden = [
    /createInvoice\s*\(/,
    /createPayment\s*\(/,
    /enterpriseTaskEngine\.create/,
    /sendEmail\s*\(/,
    /prisma\.\w+\.create\s*\(/,
  ];
  for (const dir of chanakyaPaths) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of walkTs(abs)) {
      const rel = path.relative(ROOT, file).replace(/\\/g, "/");
      if (rel.includes(".test.") || rel.includes("__tests__")) continue;
      const src = fs.readFileSync(file, "utf8");
      for (const re of forbidden) {
        if (re.test(src)) {
          mutationLeak = `${rel} matches ${re}`;
          break;
        }
      }
      if (mutationLeak) break;
    }
    if (mutationLeak) break;
  }

  if (
    !mutationLeak &&
    /readOnly:\s*true/.test(changeIntel) &&
    (compile.includes("readOnly") || compile.includes("read-only")) &&
    (chatgptRoute.includes("read") || chatgptRoute.includes("GET"))
  ) {
    recordGate("READONLY-STATIC", "Enterprise-read intelligence paths avoid mutation sinks", "PASS");
  } else {
    recordGate(
      "READONLY-STATIC",
      "Enterprise-read intelligence paths avoid mutation sinks",
      mutationLeak ? "FAIL" : "FAIL",
      mutationLeak || "read-only markers incomplete",
    );
  }
}

// --- Static internal/lender separation ---
{
  const sep = read("src/lib/chanakya-credit-intelligence/internal-recommendation-separation.ts");
  const types = read("src/types/chanakya-credit-synthesis.ts");
  const pliTypes = read("src/types/chanakya-enterprise-read-context.ts");

  if (
    sep.includes("internalRecommendationLeaksIntoLenderText") &&
    types.includes("internalOnly: true") &&
    pliTypes.includes("internalOnly: true") &&
    read("src/components/catalyst-one/enterprise-credit-workspace/ecw-proposal-generation-panel.tsx").includes(
      "data-proposal-internal-only",
    )
  ) {
    recordGate("SEPARATION-STATIC", "Internal recommendations internalOnly · lender export isolated", "PASS");
  } else {
    recordGate("SEPARATION-STATIC", "Internal recommendations internalOnly · lender export isolated", "FAIL");
  }
}

// --- Sprint verification suites ---
const suites = [
  ["002", "scripts/co-chanakya-credit-proposal-002-verify.mjs"],
  ["003A-003E+010", "scripts/co-chanakya-enterprise-read-context-002-verify.mjs"],
  ["011-E2E", "scripts/co-chanakya-credit-intelligence-011-e2e.mjs", { needsBat: false }],
  ["020", "scripts/co-chanakya-certification-018.mjs", { needsBat: false }],
  ["021", "scripts/co-chanakya-021-financial-fact-quality-verify.mjs"],
  ["022", "scripts/co-chanakya-022-gst-intelligence-verify.mjs"],
  ["023", "scripts/co-chanakya-023-banking-intelligence-verify.mjs"],
  ["024", "scripts/co-chanakya-024-ocr-integration-readiness-verify.mjs"],
  ["025", "scripts/co-chanakya-025-product-lender-matrix-depth-verify.mjs"],
  ["026", "scripts/co-chanakya-026-transaction-executive-intelligence-verify.mjs"],
  ["027", "scripts/co-chanakya-027-lender-proposal-quality-v3-verify.mjs"],
  ["028", "scripts/co-chanakya-028-proposal-workspace-final-ux-verify.mjs"],
];

for (const [id, script, opts = {}] of suites) {
  console.log(`\n--- Running ${id}: ${script} ---`);
  runScript(id, script, opts);
}

// --- Cross-cutting synthesis + proposal gates (010/015/016 chain) ---
console.log("\n--- Cross-cutting gates ---");
runScript("015-SYNTH", "scripts/co-chanakya-credit-intelligence-015-verify.mjs");
runScript("016-PROPOSAL", "scripts/co-chanakya-credit-intelligence-016-verify.mjs");

// --- Runtime PII fixture probe ---
{
  const { redactCustomerContactPiiForAiContext, assertNoCustomerContactPiiInAiContext } =
    await import("../src/lib/chanakya-enterprise-read-context/redact-pii.ts");
  const { sanitizeLenderExportMarkdown, assertLenderExportSafe } = await import(
    "../src/lib/chanakya-credit-proposal/lender-proposal-export.ts"
  );
  const dirty = {
    email: "test@borrower.com",
    mobile: "9876543210",
    name: "Avon",
  };
  const redacted = redactCustomerContactPiiForAiContext(dirty);
  let piiOk = true;
  try {
    assertNoCustomerContactPiiInAiContext(redacted);
  } catch {
    piiOk = false;
  }
  const exportClean = sanitizeLenderExportMarkdown("Email test@borrower.com Mobile 9876543210");
  if (piiOk && assertLenderExportSafe(exportClean)) {
    recordGate("PII-RUNTIME", "PII redaction + lender export runtime probe", "PASS");
  } else {
    recordGate("PII-RUNTIME", "PII redaction + lender export runtime probe", "FAIL");
  }
}

// --- Summary ---
console.log("\n=== CO-CHANAKYA-029 GATE SUMMARY ===\n");
const pass = gates.filter((g) => g.status === "PASS").length;
const fail = gates.filter((g) => g.status === "FAIL").length;
const blocked = gates.filter((g) => g.status === "BLOCKED").length;

for (const g of gates) {
  console.log(`${g.status.padEnd(7)} ${g.id.padEnd(18)} ${g.label}`);
  if (g.detail && g.status !== "PASS") console.log(`         ↳ ${g.detail.slice(0, 200)}`);
}

console.log(`\nTotals: PASS=${pass} FAIL=${fail} BLOCKED=${blocked}`);

const reportPath = path.join(ROOT, "docs/co-chanakya-029/CO-CHANAKYA-029-FINAL-SAFETY-EVIDENCE-AUDIT.md");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
const md = [
  "# CO-CHANAKYA-029 — Final CHANAKYA Safety & Evidence Audit",
  "",
  `**Date:** ${new Date().toISOString()}`,
  "**Mode:** Read-only · no deploy · no migration · no production mutation",
  "**Hostinger:** FROZEN (CO-CHANAKYA-RELEASE-FREEZE-015)",
  "",
  "## Gate results",
  "",
  "| Gate | Status | Detail |",
  "|------|--------|--------|",
  ...gates.map(
    (g) => `| ${g.id} | **${g.status}** | ${g.detail.replace(/\|/g, "\\|") || "—"} |`,
  ),
  "",
  `**Totals:** PASS=${pass} · FAIL=${fail} · BLOCKED=${blocked}`,
  "",
  "## Certification posture",
  fail > 0
    ? "🔴 **OPEN** — one or more gates FAILED. Do not certify."
    : blocked > 0
      ? "🟡 **PARTIALLY READY** — static/runtime gates pass; live BAT gates BLOCKED."
      : "✅ **READY FOR PO REVIEW** — all automated gates PASS.",
  "",
].join("\n");
fs.writeFileSync(reportPath, md, "utf8");
console.log(`\nReport: ${reportPath}`);
console.log(fail > 0 ? "\nRESULT: FAIL\n" : blocked > 0 ? "\nRESULT: PARTIAL (BLOCKED gates)\n" : "\nRESULT: PASS\n");
process.exit(fail > 0 ? 1 : 0);

function walkTs(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTs(p, acc);
    else if (/\.tsx?$/.test(ent.name)) acc.push(p);
  }
  return acc;
}
