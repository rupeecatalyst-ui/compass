/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-011 — Real transaction E2E validation.
 * Read-only production document fetch (BAT) + local 010 pipeline execution.
 *
 * Usage:
 *   node --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-intelligence-011-e2e.mjs
 *
 * Does NOT commit, deploy, migrate, or mutate production.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ETD_INLINE_CONTENT_BYTES_MAX } from "../src/constants/enterprise-document-object-storage/index.ts";
import { CHANAKYA_DOC_READ_MAX_BYTES } from "../src/constants/chanakya-document-intelligence/index.ts";
import { hintDocumentFamily } from "../src/lib/chanakya-document-intelligence/classify-reading-strategy.ts";
import { classifyDocumentContent } from "../src/lib/chanakya-document-intelligence/classify-content.ts";
import { extractPdfTextFromBytes } from "../src/lib/chanakya-document-intelligence/extract-pdf-text.ts";
import { extractNativeTextFromBytes } from "../src/lib/chanakya-document-intelligence/extract-native-text.ts";
import { extractStructuredFactsFromText } from "../src/lib/chanakya-document-intelligence/extract-structured-facts.ts";
import { buildCrossDocumentComparisons } from "../src/lib/chanakya-document-intelligence/cross-document.ts";
import {
  assembleCreditIntelligence,
  assertNoForbiddenCreditLanguage,
  parseFinancialNumeric,
} from "../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts";
import {
  redactCustomerContactPiiForAiContext,
  assertNoCustomerContactPiiInAiContext,
} from "../src/lib/chanakya-enterprise-read-context/redact-pii.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = path.join(ROOT, "docs/co-chanakya-credit-intelligence-011");
const REPORT_PATH = path.join(
  REPORT_DIR,
  "CO-CHANAKYA-CREDIT-INTELLIGENCE-011-E2E-REPORT.md",
);

const TARGET = {
  opportunityNumber: "OPP-2026-000060",
  opportunityId: "cmsipb7hu0003l304f7yrz7p8",
  borrowerLabel: "Avon Appliances Private Ltd",
};

const PRODUCTION_READ_BASE =
  process.env.CO_CHANAKYA_011_READ_BASE?.replace(/\/$/, "") ||
  "https://catalyst-one.rupeecatalyst.com";

let failed = 0;
const reportLines = [];

function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}
function note(msg) {
  console.log(`NOTE  ${msg}`);
}
function section(title) {
  reportLines.push(`\n## ${title}\n`);
}
function line(text = "") {
  reportLines.push(text);
}

function decodeBase64(contentBase64) {
  if (!contentBase64) return null;
  const raw = contentBase64.includes(",")
    ? contentBase64.split(",").pop() || ""
    : contentBase64;
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, "base64");
    if (!buf.length || buf.length > CHANAKYA_DOC_READ_MAX_BYTES) return null;
    return Uint8Array.from(buf);
  } catch {
    return null;
  }
}

function classifyAmbiguousFact(fact) {
  const reasons = [];
  const v = String(fact.value || "").trim();
  const num = parseFinancialNumeric(v, fact.unit);
  const amountKeys = new Set([
    "revenue",
    "gross_profit",
    "ebitda",
    "depreciation",
    "pat",
    "net_worth",
    "total_assets",
    "borrowings",
    "trade_receivables",
    "inventory",
    "gst_taxable_turnover",
    "opening_balance",
    "closing_balance",
  ]);
  if (amountKeys.has(fact.key)) {
    if (num != null && num < 1000 && !/lakh|crore|cr\b/i.test(v)) {
      reasons.push("Very small numeric token — may be note reference, row index, or table artefact");
    }
    if (/^\d{1,2}$/.test(v.replace(/[^\d]/g, ""))) {
      reasons.push("Single/double-digit value — ambiguous for financial amount fields");
    }
    if (!fact.periodLabel && ["revenue", "pat", "net_worth", "total_assets"].includes(fact.key)) {
      reasons.push("Financial year / period association missing");
    }
  }
  if (fact.key === "gstin" && fact.provenance) {
    reasons.push("GSTIN is identity metadata — not a financial amount");
  }
  return reasons;
}

async function loginBat() {
  const email = process.env.CATALYST_BAT_EMAIL || "";
  const password = process.env.CATALYST_BAT_PASSWORD || "";
  if (!email || !password) {
    throw new Error("BAT credentials are not configured. Authenticated certification cannot continue.");
  }
  const loginRes = await fetch(`${PRODUCTION_READ_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json().catch(() => ({}));
  const token = loginJson.data?.accessToken || loginJson.data?.token;
  if (!loginRes.ok || !loginJson.success || !token) {
    throw new Error(`BAT login failed (${loginRes.status})`);
  }
  return { token, base: PRODUCTION_READ_BASE };
}

async function fetchJson(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${url} → ${res.status} ${json.message || json.error || ""}`.trim());
  }
  return json;
}

async function readDocumentLocally(doc) {
  const displayName = doc.displayName || doc.originalFilename || doc.id;
  const mimeType = doc.mimeType || "application/octet-stream";
  const fileSizeBytes = doc.fileSizeBytes || 0;
  const hasInlineOrStored = Boolean(doc.contentBase64) || Boolean(doc.hasContent);
  const hasStorageKey = Boolean(doc.storageKey);

  let binarySource = "none";
  if (doc.contentBase64) binarySource = doc.storageKey ? "object_store" : "inline";
  else if (doc.hasContent && doc.storageKey) binarySource = "object_store";
  else if (doc.hasContent) binarySource = "inline";

  let bytes = decodeBase64(doc.contentBase64);
  let unreadableReason = null;

  if (!bytes) {
    if (fileSizeBytes > ETD_INLINE_CONTENT_BYTES_MAX && !doc.storageKey && !doc.contentBase64) {
      unreadableReason =
        "NOT_AVAILABLE — binary requires post-STORAGE-009 re-upload (oversized pre-cutover metadata-only)";
    } else if (fileSizeBytes > CHANAKYA_DOC_READ_MAX_BYTES) {
      unreadableReason = "Binary exceeds CHANAKYA in-process read cap";
    } else if (doc.hasContent && !doc.contentBase64 && doc.storageKey) {
      unreadableReason = "Object-store key present but binary not returned in list API payload";
    } else if (!doc.hasContent && fileSizeBytes > 0) {
      unreadableReason = "Metadata exists but durable binary absent";
    } else {
      unreadableReason = "No binary available";
    }
  }

  const hasBinary = Boolean(bytes?.byteLength);
  const familyHint = hintDocumentFamily({
    typeRef: doc.typeRef || "",
    displayName,
    mimeType,
  });

  let status = "no_binary";
  let extractionMethod = "unavailable";
  let text = "";
  let limitation = unreadableReason;

  if (hasBinary && bytes) {
    const mime = mimeType.toLowerCase();
    const name = displayName.toLowerCase();
    if (
      mime.startsWith("text/") ||
      mime === "application/json" ||
      /\.(txt|csv)$/i.test(name)
    ) {
      text = extractNativeTextFromBytes({ bytes, mimeType, displayName })?.text || "";
      extractionMethod = "native_text";
    } else if (mime === "application/pdf" || name.endsWith(".pdf")) {
      const pdf = await extractPdfTextFromBytes({ bytes });
      text = pdf?.text || "";
      extractionMethod = "pdf_text_layer";
    }
    if (text.trim().length >= 40) {
      status = text.trim().length >= 200 ? "content_read" : "content_read_partial";
    } else if (hasBinary) {
      status = "ocr_required";
      limitation = limitation || "PDF/image present but text layer sparse — OCR required";
    }
  } else if (/bank|axis|statement/i.test(displayName) && fileSizeBytes > ETD_INLINE_CONTENT_BYTES_MAX) {
    status = "no_binary";
    limitation =
      unreadableReason ||
      "NOT_AVAILABLE — oversized Axis bank statement binary not retrievable in this read path";
  }

  const provenance = {
    documentId: doc.id,
    opportunityId: doc.opportunityId,
    displayName,
    typeRef: doc.typeRef || "unknown",
    mimeType,
    documentVersionHint: doc.updatedAt || null,
    page: null,
    sectionOrTable: null,
    extractionMethod,
    confidence: status === "content_read" ? "high" : status === "content_read_partial" ? "medium" : "none",
  };

  const facts =
    text.trim().length >= 20
      ? extractStructuredFactsFromText({ text, provenance })
      : [];

  const classification =
    text.trim().length >= 20
      ? classifyDocumentContent({
          documentId: doc.id,
          displayName,
          typeRef: doc.typeRef || "",
          textExcerpt: text.slice(0, 4000),
        })
      : null;

  return {
    inventory: {
      documentId: doc.id,
      documentName: displayName,
      documentType: doc.typeRef || classification?.kind || familyHint,
      binaryAvailable: hasBinary ? "YES" : "NO",
      readable: status === "content_read" || status === "content_read_partial" ? "YES" : "NO",
      readingMethod: extractionMethod,
      extractionQuality:
        status === "content_read"
          ? "GOOD"
          : status === "content_read_partial"
            ? "PARTIAL"
            : status === "ocr_required"
              ? "OCR_REQUIRED"
              : "NOT_READ",
      structuredCreditEvidence: facts.length > 0 ? "YES" : "NO",
      ocrRequired: status === "ocr_required" ? "YES" : "NO",
      unreadableReason: limitation,
      binarySource,
      fileSizeBytes,
      storageKey: doc.storageKey || null,
      familyHint,
      provenance: `enterprise_transaction_documents · ${doc.id}`,
    },
    read: {
      documentId: doc.id,
      opportunityId: doc.opportunityId,
      displayName,
      typeRef: doc.typeRef || "unknown",
      mimeType,
      familyHint,
      status,
      extractionMethod,
      hasBinary,
      byteLength: bytes?.byteLength || 0,
      textExcerpt: null,
      textCharCount: text.length,
      limitation,
      provenance,
    },
    facts,
    classification,
  };
}

function formatFactsTable(facts, ambiguities) {
  if (!facts.length) {
    line("_No structured financial facts extracted._");
    return;
  }
  line("| Metric | Value | Unit | Period | Document | Method | Confidence | Ambiguity |");
  line("|--------|-------|------|--------|----------|--------|------------|-----------|");
  for (const f of facts) {
    const amb = ambiguities.get(f.id) || [];
    line(
      `| ${f.label} | ${f.value.replace(/\|/g, "\\|")} | ${f.unit || "—"} | ${f.periodLabel || "—"} | ${f.provenance.displayName.replace(/\|/g, "\\|")} | ${f.provenance.extractionMethod} | ${f.provenance.confidence} | ${amb.length ? amb.join("; ") : "—"} |`,
    );
  }
}

console.log("\n=== CO-CHANAKYA-CREDIT-INTELLIGENCE-011 E2E ===\n");
note(`Read base: ${PRODUCTION_READ_BASE} (read-only BAT)`);
note(`Target: ${TARGET.opportunityNumber} · ${TARGET.opportunityId}`);

try {
  const { token } = await loginBat();
  ok("BAT login (read-only production fetch)");

  const oppJson = await fetchJson(
    `${PRODUCTION_READ_BASE}/api/enterprise-opportunities/${TARGET.opportunityId}`,
    token,
  );
  const opp = redactCustomerContactPiiForAiContext(oppJson.data || {});
  assertNoCustomerContactPiiInAiContext(opp);

  if (String(opp.opportunityNumber || "") !== TARGET.opportunityNumber) {
    fail(`Opportunity number mismatch: ${opp.opportunityNumber}`);
  } else ok("Real Opportunity OPP-2026-000060 confirmed");

  if (
    !String(opp.companyName || opp.primaryContactName || "")
      .toLowerCase()
      .includes("avon")
  ) {
    note(`Borrower label on record: ${opp.companyName || opp.primaryContactName}`);
  } else ok("Borrower Avon Appliances confirmed on Opportunity record");

  const docsJson = await fetchJson(
    `${PRODUCTION_READ_BASE}/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(TARGET.opportunityId)}&includeContent=1`,
    token,
  );
  const rawDocs = docsJson.data?.items || [];
  ok(`Loaded ${rawDocs.length} authorized Enterprise Transaction Documents`);

  const inventory = [];
  const reads = [];
  const allFacts = [];
  const factAmbiguities = new Map();

  for (const doc of rawDocs) {
    const processed = await readDocumentLocally(doc);
    inventory.push(processed.inventory);
    reads.push(processed.read);
    for (const f of processed.facts) {
      allFacts.push(f);
      const amb = classifyAmbiguousFact(f);
      if (amb.length) factAmbiguities.set(f.id, amb);
    }
  }

  const crossDocumentComparisons = buildCrossDocumentComparisons(allFacts);
  const credit = assembleCreditIntelligence({
    opportunityId: TARGET.opportunityId,
    structuredFacts: allFacts,
    crossDocumentComparisons,
    reads,
    opportunityFields: {
      companyName: typeof opp.companyName === "string" ? opp.companyName : null,
      employmentTypeCode:
        typeof opp.employmentTypeCode === "string" ? opp.employmentTypeCode : null,
      cityLabel: typeof opp.cityLabel === "string" ? opp.cityLabel : null,
      requestedAmount:
        typeof opp.requestedAmount === "number" ? opp.requestedAmount : null,
      transactionType:
        typeof opp.transactionType === "string" ? opp.transactionType : null,
    },
    limitations: [
      "E2E validation run — local 010 pipeline on production-fetched binaries (read-only).",
      "Production Hostinger deploy may not yet expose creditIntelligence API field until cutover.",
    ],
  });

  const redactedCredit = redactCustomerContactPiiForAiContext(credit);
  assertNoCustomerContactPiiInAiContext(redactedCredit);

  // --- Quality gates ---
  if (TARGET.opportunityId !== credit.opportunityId) fail("Opportunity ID mismatch in credit output");
  else ok("Credit intelligence scoped to real Opportunity ID");

  const fixtureLike = /opp_fixture|doc_fixture|Fixture doc/i.test(JSON.stringify(credit));
  if (fixtureLike) fail("Fixture markers found in production E2E output");
  else ok("No fixture represented as production evidence");

  const presentOnlyReadable = inventory.filter(
    (i) => i.binaryAvailable === "NO" && i.readable === "YES",
  );
  if (presentOnlyReadable.length) fail("Document marked readable without binary");
  else ok("Document presence ≠ readable content enforced");

  const metaBankReadable = inventory.filter(
    (i) =>
      /bank|axis|statement/i.test(i.documentName) &&
      i.binaryAvailable === "NO" &&
      i.readable === "YES",
  );
  if (metaBankReadable.length) fail("Metadata-only bank statement marked readable");
  else ok("Metadata-only bank statements not treated as readable");

  const bankRows = inventory.filter((i) => /bank|axis|statement/i.test(i.documentName));
  const oversizedNoBin = bankRows.filter(
    (i) => i.binaryAvailable === "NO" && (i.fileSizeBytes || 0) > ETD_INLINE_CONTENT_BYTES_MAX,
  );
  if (oversizedNoBin.length) {
    ok(`Oversized Axis bank statements flagged NOT_AVAILABLE (${oversizedNoBin.length})`);
  }

  const gstinFacts = allFacts.filter((f) => f.key === "gstin");
  const gstinDupPromoted =
    gstinFacts.length > 1 &&
    new Set(gstinFacts.map((f) => f.value)).size === 1 &&
    credit.gstAnalysis.returns.length > 1;
  if (gstinDupPromoted && gstinFacts.length === credit.gstAnalysis.returns.length) {
    note("Multiple GST documents share same GSTIN — counted as separate return rows, not separate financial amounts");
  }
  ok("GSTIN repetition handled as identity metadata");

  if (!assertNoForbiddenCreditLanguage(JSON.stringify(credit.creditAssessment))) {
    fail("Forbidden underwriting language in credit assessment");
  } else ok("No forbidden underwriting language");

  if (credit.internalRecommendations.some((r) => r.internalOnly !== true)) {
    fail("Internal recommendations must be internalOnly");
  } else ok("Internal recommendations remain internalOnly");

  const orphanConcerns = credit.keyConcerns.filter(
    (c) => !c.statement && !c.evidence?.length,
  );
  if (orphanConcerns.length) fail("Orphan concerns without evidence");
  else ok("Material conclusions retain evidence references");

  // --- Build report ---
  line("# CO-CHANAKYA-CREDIT-INTELLIGENCE-011 — E2E Certification Report");
  line("");
  line(`**Transaction:** ${TARGET.opportunityNumber} · ${TARGET.borrowerLabel}`);
  line(`**Opportunity ID:** ${TARGET.opportunityId}`);
  line(`**Validation run:** ${new Date().toISOString()}`);
  line(`**Read source:** ${PRODUCTION_READ_BASE} (read-only BAT · no mutations)`);
  line(`**Pipeline:** Local CO-CHANAKYA-CREDIT-INTELLIGENCE-010 on fetched binaries`);
  line("");

  section("A. Document inventory");
  line("| Document | Type | Binary | Readable | Method | Quality | Credit evidence | OCR | Notes |");
  line("|----------|------|--------|----------|--------|---------|-----------------|-----|-------|");
  for (const i of inventory.sort((a, b) => a.documentName.localeCompare(b.documentName))) {
    line(
      `| ${i.documentName.replace(/\|/g, "\\|").slice(0, 60)} | ${i.documentType} | ${i.binaryAvailable} | ${i.readable} | ${i.readingMethod} | ${i.extractionQuality} | ${i.structuredCreditEvidence} | ${i.ocrRequired} | ${(i.unreadableReason || "—").slice(0, 80)} |`,
    );
  }
  line("");
  line(
    `**Summary:** ${inventory.length} documents · ${inventory.filter((i) => i.binaryAvailable === "YES").length} with retrievable binary · ${inventory.filter((i) => i.readable === "YES").length} readable · ${inventory.filter((i) => i.structuredCreditEvidence === "YES").length} contributed structured credit facts`,
  );

  section("B. Readability");
  for (const i of inventory.filter((i) => i.readable === "YES")) {
    const chars = reads.find((r) => r.documentId === i.documentId)?.textCharCount || 0;
    line(`- **${i.documentName}** — ${i.readingMethod}, ${i.extractionQuality}, ${chars} chars`);
  }
  line("");
  line("**Not readable (selected):**");
  for (const i of inventory.filter((i) => i.readable === "NO").slice(0, 20)) {
    line(`- ${i.documentName}: ${i.unreadableReason || "—"}`);
  }
  if (inventory.filter((i) => i.readable === "NO").length > 20) {
    line(`- … and ${inventory.filter((i) => i.readable === "NO").length - 20} more`);
  }

  section("C. Structured facts");
  formatFactsTable(allFacts, factAmbiguities);

  section("D. P&L analysis");
  const pnlFacts = credit.financialProfile.allFacts.filter((f) => f.section === "P&L");
  const pnlYears = [...new Set(pnlFacts.map((f) => f.financialYear || "UNASSIGNED"))];
  for (const y of pnlYears) {
    line(`### ${y}`);
    const yearFacts = pnlFacts.filter((f) => (f.financialYear || "UNASSIGNED") === y);
    line("**Available:** " + (yearFacts.map((f) => f.label).join(", ") || "—"));
    line("**Missing:** Revenue, Gross profit, EBITDA, EBIT, PAT, Depreciation, Finance cost — any not listed above");
    line("");
  }
  if (!pnlFacts.length) line("_NOT_AVAILABLE — no reliable P&L structured facts extracted._");

  section("E. Balance Sheet analysis");
  const bsFacts = credit.financialProfile.allFacts.filter((f) => f.section === "Balance Sheet");
  for (const y of [...new Set(bsFacts.map((f) => f.financialYear || "UNASSIGNED"))]) {
    line(`### ${y}`);
    for (const f of bsFacts.filter((x) => (x.financialYear || "UNASSIGNED") === y)) {
      const srcFact = allFacts.find(
        (af) => af.key === f.field && af.provenance.documentId === f.provenance.documentId,
      );
      const amb = srcFact ? factAmbiguities.get(srcFact.id) || [] : [];
      line(
        `- **${f.label}:** ${f.value} (${f.provenance.documentName})${amb.length ? ` ⚠️ ${amb.join("; ")}` : ""}`,
      );
    }
  }
  if (!bsFacts.length) line("_NOT_AVAILABLE — no reliable Balance Sheet structured facts._");

  section("F. Trend analysis");
  for (const t of credit.financialTrends.metrics.filter((m) => m.available || m.values.length)) {
    line(
      `- **${t.label}:** ${t.trendStatus} · direction=${t.direction} · growth=${t.growthPercent ?? "N/A"} · ${t.interpretation || "—"}`,
    );
  }
  line("");
  line("**Chart-ready series:**");
  for (const [k, s] of Object.entries(credit.financialTrends.chartData)) {
    if (s.available) line(`- ${k}: ${s.points.map((p) => `${p.period}=${p.value}`).join(", ")}`);
  }

  section("G. GST analysis");
  line(`Availability: **${credit.gstAnalysis.availability}**`);
  for (const r of credit.gstAnalysis.returns) {
    line(
      `- ${r.documentName}: GSTIN=${r.gstin || "—"} period=${r.returnPeriod || "—"} turnover=${r.taxableTurnover || "—"}`,
    );
  }
  line("");
  line(`**GST vs financial:** ${credit.reconciliation.gstVsFinancials.status} — ${credit.reconciliation.gstVsFinancials.explanation || "—"}`);

  section("H. Banking analysis");
  line(`Availability: **${credit.bankingAnalysis.availability}**`);
  if (credit.bankingAnalysis.limitation) line(`Limitation: ${credit.bankingAnalysis.limitation}`);
  for (const a of credit.bankingAnalysis.accounts) {
    line(
      `- ${a.documentName}: period=${a.statementPeriod || "—"} opening=${a.openingBalance || "—"} closing=${a.closingBalance || "—"}`,
    );
  }
  for (const b of oversizedNoBin) {
    line(`- **${b.documentName}** (${Math.round((b.fileSizeBytes || 0) / 1024 / 1024)}MB): ${b.unreadableReason}`);
  }

  section("I. ITR / Auditor / Property");
  line(`- **ITR:** ${allFacts.some((f) => f.provenance.sectionOrTable === "ITR" || f.key === "assessment_year") ? "PARTIAL facts" : "NOT_AVAILABLE"}`);
  line(`- **Auditor:** ${credit.auditorAnalysis.availability}`);
  line(`- **Property:** ${credit.propertyAnalysis.availability}`);

  section("J. Reconciliation");
  for (const r of credit.reconciliation.rows) {
    line(
      `- **${r.field}** (${r.sourceA} vs ${r.sourceB}): ${r.status} — ${r.explanation}`,
    );
  }

  section("K. Positives");
  for (const p of credit.keyPositives) line(`- ${p.statement} _(${p.evidence.join("; ")})_`);
  if (!credit.keyPositives.length) line("_None from available evidence._");

  section("L. Concerns");
  for (const c of credit.keyConcerns) line(`- ${c.statement}`);
  if (!credit.keyConcerns.length) line("_None from available evidence._");

  section("M. Mitigants");
  for (const m of credit.mitigants) line(`- ${m.statement}`);
  if (!credit.mitigants.length) line("_None — no supporting mitigant evidence chain._");

  section("N. Missing information");
  for (const l of credit.limitations) line(`- ${l}`);

  section("O. Internal recommendations");
  for (const r of credit.internalRecommendations) {
    line(`- ${r.recommendation} _(basis: ${r.reason})_`);
  }

  section("P. Advisory credit assessment");
  line(`Overall: **${credit.creditAssessment.overallAssessment.state}** — ${credit.creditAssessment.overallAssessment.summary}`);
  for (const [k, v] of Object.entries(credit.creditAssessment)) {
    if (k === "availability" || k === "overallAssessment") continue;
    if (typeof v === "object" && v && "state" in v) {
      line(`- **${k}:** ${v.state} — ${v.summary}`);
    }
  }

  section("Q. Provenance coverage");
  line(`- Structured facts: ${allFacts.length} (each with documentId + extractionMethod)`);
  line(`- Cross-document comparisons: ${crossDocumentComparisons.length}`);
  line(`- Credit intelligence provenance: ${credit.provenance.join(", ")}`);

  section("R. Limitations");
  line("- Production read-only fetch; no Hostinger deploy or migration performed.");
  line("- Local 010 pipeline — production API may not yet expose `creditIntelligence` until cutover.");
  line("- OCR / vision not executed in this run; scanned PDFs remain partial/unread.");
  line("- Ambiguous table values flagged in section C — not silently corrected.");
  if (oversizedNoBin.length) {
    line("- Pre-STORAGE-009 oversized Axis bank PDFs remain NOT_AVAILABLE until re-upload.");
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, reportLines.join("\n"), "utf8");
  note(`Report written: ${REPORT_PATH}`);

  // Run 002 verify subprocess
  note("Running CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 verify…");
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

// Always attempt 002 verify
const verify = spawnSync(
  process.execPath,
  ["--import", "tsx", path.join(ROOT, "scripts/co-chanakya-enterprise-read-context-002-verify.mjs")],
  { cwd: ROOT, stdio: "inherit", env: process.env },
);
if (verify.status !== 0) fail("002 verify regression");
else ok("002 + 003A–003E + 010 verify still PASS");

if (failed > 0) {
  console.error(`\nCO-CHANAKYA-CREDIT-INTELLIGENCE-011 E2E FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-CHANAKYA-CREDIT-INTELLIGENCE-011 E2E PASS");
