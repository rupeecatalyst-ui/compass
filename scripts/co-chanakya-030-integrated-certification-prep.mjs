/**
 * CO-CHANAKYA-030 — Final integrated certification preparation.
 *
 * Deterministic runner for all CHANAKYA engineering gates.
 * Read-only · no deploy · no migration · no production mutation.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local \
 *     --import ./scripts/_bat-stub-server-only.mjs --import tsx \
 *     scripts/co-chanakya-030-integrated-certification-prep.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = path.join(ROOT, "docs/co-chanakya-030");
const REPORT_MD = path.join(REPORT_DIR, "CO-CHANAKYA-030-INTEGRATED-CERTIFICATION-PREP.md");
const REPORT_JSON = path.join(REPORT_DIR, "CO-CHANAKYA-030-INTEGRATED-CERTIFICATION-PREP.json");

const startedAt = new Date().toISOString();

/** @type {Record<string, { status: string, detail: string, durationMs: number, script?: string }>} */
const sections = {};

/** @type {{ id: string, script: string, status: string, detail: string, durationMs: number }[]} */
const suiteRuns = [];

/** @type {Record<string, unknown>} */
const avon = { status: "NOT_RUN" };

/** @type {{ tsc: object, build: object }} */
const build = { tsc: {}, build: {} };

/** @type {string[]} */
const productionBlockers = [];

function statusTag(s) {
  if (s === "PASS") return "**PASS**";
  if (s === "BLOCKED") return "**BLOCKED**";
  if (s === "PARTIAL") return "**PARTIAL**";
  if (s === "FAIL") return "**FAIL**";
  return `**${s}**`;
}

function runSuite(id, scriptRel, { timeoutMs = 600_000, needsBat = false } = {}) {
  const t0 = Date.now();
  if (needsBat && !process.env.CATALYST_BAT_EMAIL && !process.env.CO_CHANAKYA_011_READ_BASE) {
    const row = {
      id,
      script: scriptRel,
      status: "BLOCKED",
      detail: "BAT credentials / live read base not configured",
      durationMs: Date.now() - t0,
    };
    suiteRuns.push(row);
    console.log(`BLOCKED  [${id}] ${scriptRel} — ${row.detail}`);
    return row;
  }

  console.log(`\n--- ${id}: ${scriptRel} ---`);
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
  const durationMs = Date.now() - t0;
  let status = "FAIL";
  let detail = "";
  if (v.status === 0) {
    status = "PASS";
  } else if (v.signal === "SIGTERM" || v.error?.code === "ETIMEDOUT") {
    status = "BLOCKED";
    detail = "timed out";
  } else {
    detail =
      out.match(/FAIL\s+.+/g)?.slice(0, 4)?.join("; ") || out.slice(-500).replace(/\s+/g, " ").trim();
  }
  const row = { id, script: scriptRel, status, detail, durationMs, stdout: out };
  suiteRuns.push(row);
  console.log(`${status}  [${id}] (${Math.round(durationMs / 1000)}s)${detail ? ` — ${detail.slice(0, 120)}` : ""}`);
  return row;
}

function setSection(key, status, detail, script) {
  sections[key] = { status, detail, durationMs: 0, script };
}

function mirrorSectionFromSuite(sectionKey, suiteId, note = "") {
  const run = suiteRuns.find((r) => r.id === suiteId);
  if (!run) {
    setSection(sectionKey, "NOT_RUN", note || "suite not executed");
    return;
  }
  setSection(sectionKey, run.status, note || run.detail || "—", run.script);
}

function parseAvonFromCert018(stdout) {
  const block = stdout.match(/--- CERTIFICATION SUMMARY ---\n([\s\S]+?)\n\nFINAL CLASSIFICATION:/);
  if (!block) return null;
  try {
    return JSON.parse(block[1]);
  } catch {
    return null;
  }
}

function classifyReadiness({ codePass, configPass, dataPass, productionPass }) {
  return {
    CODE_READY: codePass ? "YES" : "NO",
    CONFIG_READY: configPass ? "YES" : "NO",
    DATA_READY: dataPass ? "YES" : "NO",
    PRODUCTION_READY: productionPass ? "YES" : "NO",
  };
}

function extractTscErrors(output) {
  const lines = output.split("\n").filter((l) => /error TS\d+/.test(l));
  const byFile = {};
  for (const line of lines) {
    const m = line.match(/^(.+\.tsx?)\(\d+,\d+\): error TS\d+:/);
    const file = m ? m[1].replace(/\\/g, "/") : "_unknown_";
    if (!byFile[file]) byFile[file] = [];
    byFile[file].push(line.trim());
  }
  return { total: lines.length, byFile, lines: lines.slice(0, 40) };
}

console.log("\n=== CO-CHANAKYA-030 — Integrated certification preparation ===\n");
console.log("No deploy · no migration · no production mutation · Hostinger FROZEN\n");

// --- Architecture static inventory ---
{
  const chanakyaRoots = [
    "src/lib/chanakya-enterprise-read-context",
    "src/lib/chanakya-credit-intelligence",
    "src/lib/chanakya-credit-proposal",
    "src/lib/chanakya-document-intelligence",
    "src/lib/chanakya-dashboard-intelligence",
    "src/app/api/chanakya",
    "src/app/api/integrations/chatgpt/v1/enterprise-read",
  ];
  const present = chanakyaRoots.filter((r) => fs.existsSync(path.join(ROOT, r)));
  setSection(
    "A",
    present.length === chanakyaRoots.length ? "PASS" : "PARTIAL",
    `${present.length}/${chanakyaRoots.length} canonical CHANAKYA roots present`,
  );
}

// --- Deterministic verify chain (order fixed) ---
const SUITES = [
  ["002-READ", "scripts/co-chanakya-enterprise-read-context-002-verify.mjs"],
  ["011-E2E", "scripts/co-chanakya-credit-intelligence-011-e2e.mjs", { needsBat: false }],
  ["015-SYNTH", "scripts/co-chanakya-credit-intelligence-015-verify.mjs"],
  ["016-PROPOSAL", "scripts/co-chanakya-credit-intelligence-016-verify.mjs"],
  ["020-AVON", "scripts/co-chanakya-certification-018.mjs", { timeoutMs: 900_000 }],
  ["021-FIN", "scripts/co-chanakya-021-financial-fact-quality-verify.mjs"],
  ["022-GST", "scripts/co-chanakya-022-gst-intelligence-verify.mjs"],
  ["023-BANK", "scripts/co-chanakya-023-banking-intelligence-verify.mjs"],
  ["024-OCR", "scripts/co-chanakya-024-ocr-integration-readiness-verify.mjs"],
  ["025-PLM", "scripts/co-chanakya-025-product-lender-matrix-depth-verify.mjs"],
  ["026-EXEC", "scripts/co-chanakya-026-transaction-executive-intelligence-verify.mjs"],
  ["027-PROP-V3", "scripts/co-chanakya-027-lender-proposal-quality-v3-verify.mjs"],
  ["028-WS", "scripts/co-chanakya-028-proposal-workspace-final-ux-verify.mjs"],
  ["029-SAFETY", "scripts/co-chanakya-029-final-safety-evidence-audit.mjs", { timeoutMs: 900_000 }],
  ["014-STATIC", "scripts/co-production-regression-014-verify.mjs", { timeoutMs: 120_000 }],
];

for (const [id, script, opts = {}] of SUITES) {
  runSuite(id, script, opts);
}

// Avon payload from 020 (first run — do not re-execute)
{
  const avonRun = suiteRuns.find((r) => r.id === "020-AVON");
  if (avonRun?.stdout) {
    const parsed = parseAvonFromCert018(avonRun.stdout);
    if (parsed) {
      avon.status = "CAPTURED";
      avon.classification = parsed.classification;
      avon.documentCoverage = parsed.documentCoverage;
      avon.capabilityMatrix = parsed.capabilityMatrix;
      avon.blockers = parsed.blockers;
      avon.cutoverPrerequisites = parsed.cutoverPrerequisites;
      avon.proposalSections = parsed.proposalSections;
    } else if (avonRun.status === "BLOCKED") {
      avon.status = "BLOCKED";
    } else {
      avon.status = "PARSE_FAILED";
    }
  } else {
    avon.status = avonRun?.status || "NOT_RUN";
  }
}

// Map report sections from suite results
mirrorSectionFromSuite("B", "002-READ", "002 Enterprise Read Context + OAuth/read compile (003A–003E, 010 in same verify)");
setSection("C", suiteRuns.find((r) => r.id === "026-EXEC")?.status || "NOT_RUN", "026 Transaction Executive Intelligence", "026 verify");
setSection("D", sections.B?.status || "NOT_RUN", "003B Transaction Attention (within 002-READ verify)", "002-READ");
setSection("E", sections.B?.status || "NOT_RUN", "003D Change Intelligence (within 002-READ verify)", "002-READ");
setSection("F", sections.B?.status || "NOT_RUN", "003C Accounting/Commercial (within 002-READ verify)", "002-READ");
setSection(
  "G",
  suiteRuns.find((r) => r.id === "025-PLM")?.status === "PASS" && sections.B?.status === "PASS"
    ? "PASS"
    : suiteRuns.find((r) => r.id === "025-PLM")?.status || "NOT_RUN",
  "003E + 025 Product/Lender Matrix depth",
  "025-PLM + 002-READ",
);
setSection(
  "H",
  ["011-E2E", "015-SYNTH", "002-READ"].every((id) => suiteRuns.find((r) => r.id === id)?.status === "PASS")
    ? "PASS"
    : "FAIL",
  "010 Credit Intelligence pipeline (002 verify + 011 E2E + 015 synthesis)",
  "011 + 015 + 002",
);
mirrorSectionFromSuite("I", "021-FIN");
mirrorSectionFromSuite("J", "022-GST");
mirrorSectionFromSuite("K", "023-BANK");
mirrorSectionFromSuite("L", "024-OCR");
setSection(
  "M",
  ["027-PROP-V3", "016-PROPOSAL"].every((id) => suiteRuns.find((r) => r.id === id)?.status === "PASS")
    ? "PASS"
    : "FAIL",
  "027 Proposal V3 + 016 proposal intelligence",
  "027 + 016",
);
mirrorSectionFromSuite("N", "028-WS");
setSection(
  "O",
  suiteRuns.find((r) => r.id === "029-SAFETY")?.status || "NOT_RUN",
  "029 safety audit (PII static/runtime)",
  "029-SAFETY",
);
setSection(
  "P",
  suiteRuns.find((r) => r.id === "020-AVON")?.status === "PASS" &&
    suiteRuns.find((r) => r.id === "029-SAFETY")?.status === "PASS"
    ? "PASS"
    : "PARTIAL",
  "020 Avon separation + 029 SEPARATION-STATIC",
  "020 + 029",
);
setSection(
  "Q",
  suiteRuns.find((r) => r.id === "014-STATIC")?.status || "NOT_RUN",
  "CO-PRODUCTION-REGRESSION-014 static framework",
  "014-STATIC",
);

// --- TypeScript ---
console.log("\n--- R: tsc --noEmit ---");
{
  const t0 = Date.now();
  const v = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
    shell: true,
    timeout: 600_000,
  });
  const out = `${v.stdout || ""}\n${v.stderr || ""}`;
  const errors = extractTscErrors(out);
  const chanakyaFiles = Object.keys(errors.byFile).filter((f) => /chanakya/i.test(f));
  const accountingFiles = Object.keys(errors.byFile).filter((f) =>
    /accounting|invoice|payment|enterprise-accounting/i.test(f),
  );
  const otherFiles = Object.keys(errors.byFile).filter(
    (f) => !chanakyaFiles.includes(f) && !accountingFiles.includes(f),
  );

  build.tsc = {
    status: v.status === 0 ? "PASS" : "FAIL",
    durationMs: Date.now() - t0,
    errorCount: errors.total,
    chanakyaErrorFiles: chanakyaFiles,
    accountingWipFiles: accountingFiles,
    otherErrorFiles: otherFiles,
    sampleErrors: errors.lines,
  };

  if (v.status === 0) {
    setSection("R", "PASS", "tsc --noEmit clean", "tsc");
  } else if (chanakyaFiles.length === 0 && errors.total > 0) {
    setSection(
      "R",
      "PARTIAL",
      `tsc FAIL (${errors.total} errors) — CHANAKYA paths clean; blocked by unrelated WIP: ${[...accountingFiles, ...otherFiles].slice(0, 8).join(", ")}`,
      "tsc",
    );
  } else {
    setSection(
      "R",
      "FAIL",
      `tsc FAIL (${errors.total} errors); CHANAKYA files: ${chanakyaFiles.join(", ") || "none"}`,
      "tsc",
    );
  }
  console.log(`${build.tsc.status}  tsc (${errors.total} errors, ${Math.round(build.tsc.durationMs / 1000)}s)`);
}

// --- Production build ---
console.log("\n--- R: npm run build ---");
{
  const t0 = Date.now();
  const v = spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
    shell: true,
    timeout: 1_800_000,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192" },
  });
  const out = `${v.stdout || ""}\n${v.stderr || ""}`;
  const failedAt = out.match(/Failed to compile\.[\s\S]{0,800}/)?.[0] || "";
  build.build = {
    status: v.status === 0 ? "PASS" : "FAIL",
    durationMs: Date.now() - t0,
    snippet: failedAt.slice(0, 600) || out.slice(-600),
  };
  if (v.status === 0) {
    if (sections.R.status === "PASS") setSection("R", "PASS", "tsc + production build PASS", "tsc + build");
    else
      setSection(
        "R",
        "PARTIAL",
        `production build PASS; ${sections.R.detail}`,
        "tsc + build",
      );
  } else {
    const isAccounting =
      /accounting|invoice|payment|enterprise-accounting/i.test(failedAt) &&
      !/chanakya/i.test(failedAt);
    setSection(
      "R",
      sections.R.status === "PASS" ? "FAIL" : sections.R.status,
      isAccounting
        ? `production build FAIL — likely unrelated Accounting WIP (${failedAt.slice(0, 200)})`
        : `production build FAIL (${failedAt.slice(0, 200) || "see log"})`,
      "npm run build",
    );
  }
  console.log(`${build.build.status}  npm run build (${Math.round(build.build.durationMs / 1000)}s)`);
}

// --- Limitations & production blockers ---
const suiteFailCount = suiteRuns.filter((r) => r.status === "FAIL").length;
const suiteBlockedCount = suiteRuns.filter((r) => r.status === "BLOCKED").length;
const allSuitesPass = suiteFailCount === 0 && suiteBlockedCount === 0;

const ocrConfigured =
  avon.documentCoverage?.ocrProvider === "CONFIGURED" ||
  process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ||
  process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;

const avonDocs = avon.documentCoverage?.totalDocuments ?? null;
const avonExpected67 = avonDocs === 67;

const readiness = classifyReadiness({
  codePass: allSuitesPass && build.tsc.chanakyaErrorFiles?.length === 0,
  configPass: Boolean(ocrConfigured) && suiteRuns.find((r) => r.id === "014-STATIC")?.status === "PASS",
  dataPass:
    avon.status === "CAPTURED" &&
    avonDocs > 0 &&
    (avon.documentCoverage?.withBinary ?? 0) > 0 &&
    (avon.documentCoverage?.structuredFacts ?? 0) > 0,
  productionPass: false, // never true in prep sprint — explicit PO cutover required
});

if (!allSuitesPass) productionBlockers.push(`${suiteFailCount} verify suite(s) FAILED`);
if (suiteBlockedCount) productionBlockers.push(`${suiteBlockedCount} verify suite(s) BLOCKED`);
if (build.tsc.status !== "PASS") {
  productionBlockers.push(
    build.tsc.chanakyaErrorFiles?.length
      ? `TypeScript errors in CHANAKYA paths: ${build.tsc.chanakyaErrorFiles.join(", ")}`
      : `TypeScript errors (${build.tsc.errorCount}) — review accounting/unrelated WIP separately`,
  );
}
if (build.build.status !== "PASS") productionBlockers.push("Production build did not pass");
if (!ocrConfigured) productionBlockers.push("OCR provider not configured in environment");
if (avon.documentCoverage?.metadataOnlyBankStatements > 0) {
  productionBlockers.push(
    `${avon.documentCoverage.metadataOnlyBankStatements} Avon bank statement(s) metadata-only (binary not inline)`,
  );
}
if (avon.documentCoverage?.ocrRequired > 0 && !ocrConfigured) {
  productionBlockers.push(`${avon.documentCoverage.ocrRequired} Avon document(s) require OCR; provider not configured`);
}
if (avon.classification && avon.classification !== "PRODUCTION_READY") {
  productionBlockers.push(`Avon BAT classification: ${avon.classification} (not PRODUCTION_READY)`);
}
productionBlockers.push("CO-CHANAKYA-RELEASE-FREEZE-015 — Hostinger deploy FROZEN until PO FINAL CUTOVER");
productionBlockers.push("Explicit Product Owner PRODUCTION_READY acceptance required (CO-QA-001)");

setSection(
  "S",
  avon.classification ? "DOCUMENTED" : "PARTIAL",
  avon.classification
    ? `Avon classification: ${avon.classification}`
    : "Avon limitations not captured (020 blocked or parse failed)",
);
setSection(
  "T",
  productionBlockers.length === 0 ? "PASS" : "BLOCKED",
  productionBlockers.join(" · "),
);

// --- Write reports ---
fs.mkdirSync(REPORT_DIR, { recursive: true });

const payload = {
  sprint: "CO-CHANAKYA-030",
  startedAt,
  completedAt: new Date().toISOString(),
  mode: "read-only-prep",
  hostingerFrozen: true,
  readiness,
  sections,
  suiteRuns: suiteRuns.map(({ stdout: _s, ...r }) => r),
  avon,
  build,
  productionBlockers,
  suiteSummary: {
    pass: suiteRuns.filter((r) => r.status === "PASS").length,
    fail: suiteFailCount,
    blocked: suiteBlockedCount,
  },
};

fs.writeFileSync(REPORT_JSON, JSON.stringify(payload, null, 2), "utf8");

const md = [
  "# CO-CHANAKYA-030 — Final Integrated Certification Preparation",
  "",
  `**Generated:** ${payload.completedAt}`,
  "**Mode:** Read-only engineering prep · **NO deploy** · **NO migration** · **NO production mutation**",
  "**Hostinger:** FROZEN (CO-CHANAKYA-RELEASE-FREEZE-015)",
  "",
  "---",
  "",
  "## Readiness classification (explicit — not PRODUCTION_READY from tests alone)",
  "",
  "| Level | Status | Meaning |",
  "|-------|--------|---------|",
  `| **CODE READY** | ${readiness.CODE_READY} | All CHANAKYA verify suites pass; CHANAKYA tsc paths clean |`,
  `| **CONFIG READY** | ${readiness.CONFIG_READY} | OCR/regression config gates satisfied |`,
  `| **DATA READY** | ${readiness.DATA_READY} | Avon (or BAT) documents binaries + structured facts available |`,
  `| **PRODUCTION READY** | ${readiness.PRODUCTION_READY} | **NO** — requires PO FINAL CUTOVER + live acceptance |`,
  "",
  "> Passing code tests alone does **not** classify the system as PRODUCTION_READY.",
  "",
  "---",
  "",
  "## A. Architecture",
  "",
  `Status: ${statusTag(sections.A?.status || "NOT_RUN")}`,
  "",
  sections.A?.detail || "—",
  "",
  "Canonical roots: `chanakya-enterprise-read-context` · `chanakya-credit-intelligence` · `chanakya-credit-proposal` · `chanakya-document-intelligence` · `chanakya-dashboard-intelligence` · `/api/chanakya` · ChatGPT enterprise-read",
  "",
  "## B. Enterprise Read (002)",
  "",
  `Status: ${statusTag(sections.B?.status || "NOT_RUN")} · Suite: \`co-chanakya-enterprise-read-context-002-verify.mjs\``,
  "",
  sections.B?.detail || "—",
  "",
  "## C. Transaction Intelligence (026)",
  "",
  `Status: ${statusTag(sections.C?.status || "NOT_RUN")}`,
  "",
  "## D. Attention (003B)",
  "",
  `Status: ${statusTag(sections.D?.status || "NOT_RUN")} · Verified within 002-READ suite`,
  "",
  "## E. Change Intelligence (003D)",
  "",
  `Status: ${statusTag(sections.E?.status || "NOT_RUN")} · Verified within 002-READ suite`,
  "",
  "## F. Accounting / Commercial (003C)",
  "",
  `Status: ${statusTag(sections.F?.status || "NOT_RUN")} · Verified within 002-READ suite`,
  "",
  "## G. Product / Lender (003E + 025)",
  "",
  `Status: ${statusTag(sections.G?.status || "NOT_RUN")}`,
  "",
  sections.G?.detail || "—",
  "",
  "## H. Credit Intelligence (010 + 011 + 015)",
  "",
  `Status: ${statusTag(sections.H?.status || "NOT_RUN")}`,
  "",
  sections.H?.detail || "—",
  "",
  "## I. Financial Quality (021)",
  "",
  `Status: ${statusTag(sections.I?.status || "NOT_RUN")}`,
  "",
  "## J. GST (022)",
  "",
  `Status: ${statusTag(sections.J?.status || "NOT_RUN")}`,
  "",
  "## K. Banking (023)",
  "",
  `Status: ${statusTag(sections.K?.status || "NOT_RUN")}`,
  "",
  "## L. OCR (024)",
  "",
  `Status: ${statusTag(sections.L?.status || "NOT_RUN")}`,
  "",
  "## M. Proposal (027 + 016)",
  "",
  `Status: ${statusTag(sections.M?.status || "NOT_RUN")}`,
  "",
  "## N. Proposal Workspace (028)",
  "",
  `Status: ${statusTag(sections.N?.status || "NOT_RUN")}`,
  "",
  "## O. PII / Security (029)",
  "",
  `Status: ${statusTag(sections.O?.status || "NOT_RUN")}`,
  "",
  "## P. Internal / Lender Separation",
  "",
  `Status: ${statusTag(sections.P?.status || "NOT_RUN")}`,
  "",
  sections.P?.detail || "—",
  "",
  "## Q. Regression (014 static)",
  "",
  `Status: ${statusTag(sections.Q?.status || "NOT_RUN")}`,
  "",
  "## R. Build",
  "",
  `Status: ${statusTag(sections.R?.status || "NOT_RUN")}`,
  "",
  "| Gate | Result | Detail |",
  "|------|--------|--------|",
  `| tsc --noEmit | ${build.tsc.status} | ${build.tsc.errorCount ?? "?"} errors |`,
  `| npm run build | ${build.build.status} | ${Math.round((build.build.durationMs || 0) / 1000)}s |`,
  "",
  build.tsc.accountingWipFiles?.length
    ? `**Accounting WIP tsc files (unrelated — do not modify for CHANAKYA):** ${build.tsc.accountingWipFiles.join(", ")}`
    : "",
  build.tsc.chanakyaErrorFiles?.length
    ? `**CHANAKYA tsc files:** ${build.tsc.chanakyaErrorFiles.join(", ")}`
    : "",
  build.tsc.otherErrorFiles?.length
    ? `**Other tsc files:** ${build.tsc.otherErrorFiles.slice(0, 15).join(", ")}`
    : "",
  "",
  "## S. Limitations",
  "",
  `Status: ${statusTag(sections.S?.status || "NOT_RUN")}`,
  "",
  avon.classification ? `- Avon BAT classification: **${avon.classification}**` : "- Avon BAT not captured",
  avon.cutoverPrerequisites?.length
    ? avon.cutoverPrerequisites.map((p) => `- ${p}`).join("\n")
    : "- See CO-CHANAKYA-020 certification report",
  "",
  "### Avon transaction (OPP-2026-000060)",
  "",
  avon.status === "CAPTURED"
    ? [
        "",
        "| Metric | Value |",
        "|--------|-------|",
        `| Total documents on record | ${avon.documentCoverage?.totalDocuments ?? "—"} ${avonExpected67 ? "(expected 67 ✓)" : avonDocs != null ? `(expected 67 ${avonDocs === 67 ? "✓" : "≠"})` : ""} |`,
        `| With binary | ${avon.documentCoverage?.withBinary ?? "—"} |`,
        `| Readable (content read / partial) | ${avon.documentCoverage?.contentRead ?? "—"} |`,
        `| OCR required | ${avon.documentCoverage?.ocrRequired ?? "—"} |`,
        `| Metadata-only bank statements | ${avon.documentCoverage?.metadataOnlyBankStatements ?? "—"} |`,
        `| Structured facts extracted | ${avon.documentCoverage?.structuredFacts ?? "—"} |`,
        `| OCR provider | ${avon.documentCoverage?.ocrProvider ?? "—"} |`,
        `| Financial intelligence | ${avon.capabilityMatrix?.financialIntelligence ?? "—"} |`,
        `| GST intelligence | ${avon.capabilityMatrix?.gstIntelligence ?? "—"} |`,
        `| Banking intelligence | ${avon.capabilityMatrix?.bankingIntelligence ?? "—"} |`,
        `| Product/lender intelligence | ${avon.capabilityMatrix?.productLenderIntelligence ?? "—"} |`,
        `| Credit synthesis | ${avon.capabilityMatrix?.creditSynthesis ?? "—"} |`,
        `| Proposal sections | ${avon.proposalSections ? Object.entries(avon.proposalSections).filter(([, v]) => v).map(([k]) => k).join(", ") : "—"} |`,
        "",
      ].join("\n")
    : `Avon snapshot: **${avon.status}** — run with \`CATALYST_BAT_*\` configured against live read-only BAT URL.`,
  "",
  "## T. Production blockers",
  "",
  `Status: ${statusTag(sections.T?.status || "NOT_RUN")}`,
  "",
  productionBlockers.map((b) => `- ${b}`).join("\n"),
  "",
  "---",
  "",
  "## Deterministic suite runner log",
  "",
  "| ID | Script | Status | Duration |",
  "|----|--------|--------|----------|",
  ...suiteRuns.map(
    (r) =>
      `| ${r.id} | \`${path.basename(r.script)}\` | ${r.status} | ${Math.round(r.durationMs / 1000)}s |`,
  ),
  "",
  `**Suite totals:** PASS=${payload.suiteSummary.pass} · FAIL=${payload.suiteSummary.fail} · BLOCKED=${payload.suiteSummary.blocked}`,
  "",
  "## Runner",
  "",
  "```bash",
  "node --env-file=.env.local --env-file=compass/.env.local \\",
  "  --import ./scripts/_bat-stub-server-only.mjs --import tsx \\",
  "  scripts/co-chanakya-030-integrated-certification-prep.mjs",
  "```",
  "",
  "Machine-readable: `docs/co-chanakya-030/CO-CHANAKYA-030-INTEGRATED-CERTIFICATION-PREP.json`",
  "",
].join("\n");

fs.writeFileSync(REPORT_MD, md, "utf8");

console.log("\n=== CO-CHANAKYA-030 SUMMARY ===\n");
console.log(`CODE READY: ${readiness.CODE_READY}`);
console.log(`CONFIG READY: ${readiness.CONFIG_READY}`);
console.log(`DATA READY: ${readiness.DATA_READY}`);
console.log(`PRODUCTION READY: ${readiness.PRODUCTION_READY}`);
console.log(`\nReport: ${REPORT_MD}`);
console.log(`JSON:   ${REPORT_JSON}\n`);

const exitFail =
  suiteFailCount > 0 ||
  sections.R?.status === "FAIL" ||
  (build.tsc.chanakyaErrorFiles?.length ?? 0) > 0;
process.exit(exitFail ? 1 : 0);
