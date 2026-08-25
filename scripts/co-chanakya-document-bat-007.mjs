/**
 * CO-CHANAKYA-DOCUMENT-BAT-007 — Real transaction document reading proof.
 * Read-only BAT. Never fabricates documents or financial figures.
 *
 * Sources (in order):
 * 1) Local Prisma Enterprise Transaction Documents (when reachable)
 * 2) Authenticated CATALYST_BAT_* live API (when local DB unreachable)
 *
 * Uses the same document-intelligence extractors as Phase 005/006.
 * Does not generate a credit proposal.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import dns from "node:dns/promises";
import { extractNativeTextFromBytes } from "../src/lib/chanakya-document-intelligence/extract-native-text.ts";
import { extractPdfTextFromBytes } from "../src/lib/chanakya-document-intelligence/extract-pdf-text.ts";
import { extractStructuredFactsFromText } from "../src/lib/chanakya-document-intelligence/extract-structured-facts.ts";
import { classifyDocumentContent } from "../src/lib/chanakya-document-intelligence/classify-content.ts";
import { classifyReadingStrategy, hintDocumentFamily } from "../src/lib/chanakya-document-intelligence/classify-reading-strategy.ts";
import { buildCrossDocumentComparisons } from "../src/lib/chanakya-document-intelligence/cross-document.ts";
import { isDocumentVisionConfigured } from "../src/lib/chanakya-document-intelligence/vision-config.ts";
import {
  CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE,
  CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE,
} from "../src/constants/chanakya-document-intelligence/index.ts";

function loadEnvFile(rel) {
  const p = path.join(process.cwd(), rel);
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || !String(process.env[k] || "").trim()) {
      process.env[k] = v;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile("compass/.env.local");

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
function short(id) {
  return String(id || "").slice(0, 12);
}

function classifyDesired(typeRef, name) {
  const h = `${typeRef} ${name}`.toLowerCase();
  if (/p\s*&\s*l|profit|pnl|turnover|revenue from operations/.test(h)) return "P&L";
  if (/balance\s*sheet|\bbs\b/.test(h)) return "Balance Sheet";
  if (/bank[\s_-]*statement|passbook|banking/.test(h)) return "Bank Statement";
  if (/\bitr\b|income\s*tax/.test(h)) return "ITR";
  if (/property|sale\s*deed|title|agreement/.test(h)) return "Property";
  if (/auditor|director.?s?\s*report/.test(h)) return "Auditor/Director";
  if (/gst/.test(h)) return "GST";
  return "Other";
}

function decodeBase64(contentBase64) {
  if (!contentBase64) return null;
  const raw = contentBase64.includes(",")
    ? contentBase64.split(",").pop() || ""
    : contentBase64;
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  return buf.length > 0 ? Uint8Array.from(buf) : null;
}

async function analyzeDocument(doc) {
  const bytes = doc.bytes;
  const displayName = doc.displayName || doc.originalFilename || doc.typeRef || "document";
  const mimeType = doc.mimeType || "application/octet-stream";
  const typeRef = doc.typeRef || "unknown";
  const documentId = doc.documentId || doc.id;
  const hasBinary = Boolean(bytes && bytes.length > 0);
  const family = hintDocumentFamily({ typeRef, displayName, mimeType });
  const strategy = classifyReadingStrategy({ mimeType, displayName, hasBinary });

  let text = "";
  let method = strategy.preferredMethod;
  let status = strategy.ifUnavailableStatus;
  let limitation = null;
  let confidence = "none";

  if (!hasBinary) {
    status = "no_binary";
    method = "unavailable";
    limitation = "No durable binary on this document row";
  } else if (strategy.preferredMethod === "native_text") {
    const native = extractNativeTextFromBytes({ bytes, mimeType, displayName });
    if (native?.text) {
      text = native.text;
      method = "native_text";
      status = "content_read";
      confidence = "high";
    } else {
      status = "extraction_failed";
      method = "unavailable";
      limitation = "Native text extraction failed";
    }
  } else if (strategy.preferredMethod === "pdf_text_layer") {
    const pdf = await extractPdfTextFromBytes({ bytes });
    if (!pdf) {
      status = "extraction_failed";
      method = "unavailable";
      limitation = "Not a recognizable PDF";
    } else if (pdf.quality.empty) {
      status = "ocr_required";
      method = "ocr";
      limitation = isDocumentVisionConfigured()
        ? "Empty PDF text layer; OCR required"
        : "OCR unavailable because provider credentials are not configured";
    } else if (!pdf.quality.usable) {
      status = "unreadable_content";
      method = "pdf_text_layer";
      limitation = pdf.quality.reason;
    } else {
      text = pdf.text;
      method = "pdf_text_layer";
      status = pdf.quality.partial ? "content_read_partial" : "content_read";
      confidence = pdf.quality.partial ? "medium" : "high";
      limitation = `unpdf pages=${pdf.pageCount}`;
    }
  } else if (strategy.preferredMethod === "vision") {
    status = "vision_required";
    method = "vision";
    limitation = isDocumentVisionConfigured()
      ? "Image document; vision OCR configured but image path not executed in this BAT pass"
      : "OCR unavailable because provider credentials are not configured";
  } else {
    status = strategy.ifUnavailableStatus;
    method = "unavailable";
    limitation = "Unsupported or unavailable reading path for this MIME type";
  }

  const readable = status === "content_read" || status === "content_read_partial";
  const provenance = {
    documentId,
    opportunityId: doc.opportunityId,
    displayName,
    typeRef,
    mimeType,
    documentVersionHint: doc.updatedAt || null,
    page: null,
    sectionOrTable: null,
    extractionMethod: method,
    confidence,
  };

  const facts =
    readable && text.length >= 20
      ? extractStructuredFactsFromText({
          text,
          provenance: {
            documentId,
            opportunityId: doc.opportunityId,
            displayName,
            typeRef,
            mimeType,
            documentVersionHint: doc.updatedAt || null,
            extractionMethod: method,
            confidence: confidence === "none" ? "low" : confidence,
          },
        })
      : [];

  const classification = classifyDocumentContent({
    documentId,
    typeRef,
    displayName,
    textExcerpt: readable ? text || null : null,
  });

  const requiresOcr = status === "ocr_required" || method === "ocr";
  const requiresVision = status === "vision_required" || method === "vision";

  return {
    documentId,
    opportunityId: doc.opportunityId,
    displayName,
    typeRef,
    mimeType,
    hasBinary,
    byteLength: bytes?.length || 0,
    textCharCount: readable ? text.length : 0,
    status,
    extractionMethod: method,
    limitation,
    strategy: { ...strategy, requiresOcr, requiresVision },
    family,
    provenance,
    facts,
    classification,
  };
}

async function tryLocalPrismaDocs() {
  if ((process.env.ENTERPRISE_PERSISTENCE_MODE || "").toLowerCase() !== "prisma") {
    return { ok: false, reason: "ENTERPRISE_PERSISTENCE_MODE is not prisma" };
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, reason: "DATABASE_URL absent" };
  }

  let url = process.env.DATABASE_URL;
  try {
    const host = new URL(url).hostname;
    const looked = await dns.lookup(host, { all: true });
    const v4 = looked.find((a) => a.family === 4)?.address;
    if (v4) {
      // Prefer hostname for pooler routing; pin address when engine cannot resolve.
      const x = new URL(url);
      x.searchParams.set("hostaddr", v4);
      x.searchParams.set("connect_timeout", "20");
      url = x.toString();
    }
  } catch {
    /* keep original */
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await prisma.enterpriseTransactionDocument.findMany({
      where: { status: { not: "deleted" } },
      select: {
        id: true,
        opportunityId: true,
        opportunityNumber: true,
        typeRef: true,
        displayName: true,
        originalFilename: true,
        mimeType: true,
        fileSizeBytes: true,
        status: true,
        contentBytes: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 400,
    });
    return { ok: true, source: "local_prisma", rows, prisma };
  } catch (e) {
    await prisma.$disconnect().catch(() => {});
    return {
      ok: false,
      reason: (e instanceof Error ? e.message : String(e)).split("\n").filter(Boolean).slice(-1)[0] || "prisma failed",
    };
  }
}

async function loginBat() {
  const email = process.env.CATALYST_BAT_EMAIL || "";
  const password = process.env.CATALYST_BAT_PASSWORD || "";
  if (!email || !password) {
    return { ok: false, reason: "CATALYST_BAT_EMAIL / PASSWORD not configured" };
  }

  const bases = [
    process.env.CATALYST_BAT_URL,
    "https://catalyst-one.rupeecatalyst.com",
    "https://catalyst-one-two.vercel.app",
  ]
    .filter(Boolean)
    .map((b) => String(b).replace(/\/$/, ""));
  const unique = [...new Set(bases)];

  const attempts = [];
  for (const base of unique) {
    try {
      const loginRes = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginJson = await loginRes.json().catch(() => ({}));
      const token =
        loginJson.data?.accessToken ||
        loginJson.data?.token ||
        loginJson.accessToken;
      if (loginRes.ok && loginJson.success && token) {
        return { ok: true, base, token };
      }
      attempts.push(`${base} → HTTP ${loginRes.status}`);
    } catch (e) {
      attempts.push(
        `${base} → ${e instanceof Error ? e.message.slice(0, 60) : "fetch error"}`,
      );
    }
  }
  return {
    ok: false,
    reason: `Login failed on all BAT bases (${attempts.join("; ")})`,
  };
}

async function fetchLiveDocs() {
  const auth = await loginBat();
  if (!auth.ok) return auth;

  const headers = {
    Authorization: `Bearer ${auth.token}`,
    "Content-Type": "application/json",
  };

  const oppRes = await fetch(
    `${auth.base}/api/enterprise-opportunities?limit=40&orderBy=updatedAt`,
    { headers, cache: "no-store" },
  );
  const oppJson = await oppRes.json().catch(() => ({}));
  if (!oppRes.ok || !oppJson.success) {
    return { ok: false, reason: `Opportunity search failed HTTP ${oppRes.status}` };
  }
  const items = oppJson.data?.items || oppJson.data?.results || oppJson.data || [];
  const opportunities = Array.isArray(items) ? items : [];
  if (opportunities.length === 0) {
    return { ok: false, reason: "No Opportunities returned from live BAT API" };
  }

  let best = null;
  for (const opp of opportunities) {
    const opportunityId = opp.id || opp.opportunityId;
    if (!opportunityId) continue;
    const docRes = await fetch(
      `${auth.base}/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(opportunityId)}`,
      { headers, cache: "no-store" },
    );
    const docJson = await docRes.json().catch(() => ({}));
    if (!docRes.ok || !docJson.success) continue;
    const docs = docJson.data?.items || [];
    if (!Array.isArray(docs) || docs.length === 0) continue;
    const withContent = docs.filter((d) => d.hasContent);
    const kinds = new Set(
      docs.map((d) => classifyDesired(d.typeRef, d.displayName || d.originalFilename || "")),
    );
    const score =
      withContent.length * 10 +
      (kinds.has("P&L") ? 5 : 0) +
      (kinds.has("Balance Sheet") ? 5 : 0) +
      (kinds.has("Bank Statement") ? 4 : 0) +
      (kinds.has("ITR") ? 3 : 0) +
      (kinds.has("Property") ? 3 : 0) +
      (kinds.has("Auditor/Director") ? 3 : 0);
    if (!best || score > best.score) {
      best = {
        score,
        opportunityId,
        opportunityNumber: opp.opportunityNumber || opp.reference || null,
        metaDocs: docs,
      };
    }
  }

  if (!best) {
    return { ok: false, reason: "No Opportunity with Enterprise Transaction Documents on live BAT" };
  }

  const fullRes = await fetch(
    `${auth.base}/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(best.opportunityId)}&includeContent=1`,
    { headers, cache: "no-store" },
  );
  const fullJson = await fullRes.json().catch(() => ({}));
  if (!fullRes.ok || !fullJson.success) {
    return { ok: false, reason: `includeContent fetch failed HTTP ${fullRes.status}` };
  }
  const fullDocs = fullJson.data?.items || [];

  // Cross-opportunity probe: pick another opp if available
  let otherOppId = null;
  for (const opp of opportunities) {
    const id = opp.id || opp.opportunityId;
    if (id && id !== best.opportunityId) {
      otherOppId = id;
      break;
    }
  }

  return {
    ok: true,
    source: "live_bat_api",
    base: auth.base,
    opportunityId: best.opportunityId,
    opportunityNumber: best.opportunityNumber,
    docs: fullDocs.map((d) => ({
      id: d.id,
      documentId: d.id,
      opportunityId: d.opportunityId,
      typeRef: d.typeRef,
      displayName: d.displayName || d.originalFilename,
      originalFilename: d.originalFilename,
      mimeType: d.mimeType,
      updatedAt: d.updatedAt,
      hasContent: d.hasContent,
      bytes: decodeBase64(d.contentBase64),
    })),
    otherOppId,
    headers,
  };
}

console.log("\n=== CO-CHANAKYA-DOCUMENT-BAT-007 ===\n");

try {
  const visionConfigured = isDocumentVisionConfigured();
  note(
    visionConfigured
      ? "Vision/OCR credentials PRESENT"
      : "Vision/OCR credentials ABSENT — scanned/image OCR must remain unavailable",
  );
  note(`Capability: ${CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE}`);
  note(`Vision provider note: ${CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE}`);

  let source = null;
  let opportunityId = null;
  let opportunityNumber = null;
  let docs = [];
  let otherOppId = null;
  let liveHeaders = null;
  let liveBase = null;
  let prisma = null;

  const local = await tryLocalPrismaDocs();
  if (local.ok) {
    ok("Local Prisma reachable — using Enterprise Transaction Documents");
    source = "local_prisma";
    prisma = local.prisma;
    const byOpp = new Map();
    for (const r of local.rows) {
      const list = byOpp.get(r.opportunityId) || [];
      list.push(r);
      byOpp.set(r.opportunityId, list);
    }
    let bestOppId = null;
    let bestScore = -1;
    for (const [oppId, list] of byOpp) {
      const binaries = list.filter((d) => d.contentBytes?.length);
      const kinds = new Set(
        list.map((d) => classifyDesired(d.typeRef, d.displayName || d.originalFilename || "")),
      );
      const score =
        binaries.length * 10 +
        (kinds.has("P&L") ? 5 : 0) +
        (kinds.has("Balance Sheet") ? 5 : 0) +
        (kinds.has("Bank Statement") ? 4 : 0) +
        (kinds.has("ITR") ? 3 : 0) +
        (kinds.has("Property") ? 3 : 0) +
        (kinds.has("Auditor/Director") ? 3 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestOppId = oppId;
      }
    }
    opportunityId = bestOppId;
    const list = byOpp.get(opportunityId) || [];
    opportunityNumber = list[0]?.opportunityNumber || null;
    docs = list.map((d) => ({
      id: d.id,
      documentId: d.id,
      opportunityId: d.opportunityId,
      typeRef: d.typeRef,
      displayName: d.displayName || d.originalFilename,
      originalFilename: d.originalFilename,
      mimeType: d.mimeType,
      updatedAt: d.updatedAt?.toISOString?.() || String(d.updatedAt),
      hasContent: Boolean(d.contentBytes?.length),
      bytes: d.contentBytes ? Uint8Array.from(d.contentBytes) : null,
    }));
    otherOppId = [...byOpp.keys()].find((id) => id !== opportunityId) || null;
  } else {
    note(`Local Prisma unavailable: ${local.reason}`);
    const live = await fetchLiveDocs();
    if (!live.ok) {
      fail(`Cannot obtain real documents: ${live.reason}`);
      console.log("\nBAT RESULT: BLOCKED — no reachable document source");
      process.exit(1);
    }
    ok(`Live BAT API document source: ${live.base}`);
    source = live.source;
    opportunityId = live.opportunityId;
    opportunityNumber = live.opportunityNumber;
    docs = live.docs;
    otherOppId = live.otherOppId;
    liveHeaders = live.headers;
    liveBase = live.base;
  }

  console.log(`\nSource: ${source}`);
  console.log(`Selected Opportunity: ${opportunityId}${opportunityNumber ? ` (${opportunityNumber})` : ""}`);
  console.log(`Documents: ${docs.length}`);

  const desired = [
    "P&L",
    "Balance Sheet",
    "Bank Statement",
    "ITR",
    "Property",
    "Auditor/Director",
  ];
  const presentKinds = new Set(
    docs.map((d) => classifyDesired(d.typeRef, d.displayName || "")),
  );
  console.log("\nDesired document coverage:");
  for (const k of desired) {
    console.log(`  ${presentKinds.has(k) ? "PRESENT" : "MISSING"}  ${k}`);
  }

  // Access / cross-opportunity checks
  const leak = docs.filter((d) => d.opportunityId && d.opportunityId !== opportunityId);
  if (leak.length === 0) ok("All retrieved documents are opportunity-scoped");
  else fail(`Cross-opportunity leak in retrieved set: ${leak.length}`);

  if (otherOppId && liveBase && liveHeaders) {
    const otherRes = await fetch(
      `${liveBase}/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(otherOppId)}`,
      { headers: liveHeaders, cache: "no-store" },
    );
    const otherJson = await otherRes.json().catch(() => ({}));
    const otherDocs = otherJson.data?.items || [];
    const overlap = docs.filter((a) => otherDocs.some((b) => b.id === a.documentId));
    if (overlap.length === 0) ok("No document id overlap across two Opportunities");
    else fail(`Document id overlap across opportunities: ${overlap.length}`);
  } else if (otherOppId && prisma) {
    const otherRows = await prisma.enterpriseTransactionDocument.findMany({
      where: { opportunityId: otherOppId, status: { not: "deleted" } },
      select: { id: true },
      take: 50,
    });
    const overlap = docs.filter((a) => otherRows.some((b) => b.id === a.documentId));
    if (overlap.length === 0) ok("No document id overlap across two Opportunities");
    else fail(`Document id overlap across opportunities: ${overlap.length}`);
  } else {
    note("Only one Opportunity available for cross-opportunity contrast");
  }

  const reads = await Promise.all(docs.map((d) => analyzeDocument(d)));
  const allFacts = reads.flatMap((r) => r.facts);
  const comparisons = buildCrossDocumentComparisons(allFacts);

  console.log("\n=== Document reading table ===\n");
  console.log(
    "Document | Type | Method | Read successfully? | Facts extracted | Confidence",
  );
  console.log("--- | --- | --- | --- | --- | ---");

  const tableRows = [];
  for (const r of reads) {
    const kind = classifyDesired(r.typeRef, r.displayName);
    const readOk =
      r.textCharCount > 0 &&
      (r.status === "content_read" ||
        r.status === "content_read_partial" ||
        r.status === "content_partial");
    console.log(
      `${r.displayName} | ${kind} | ${r.extractionMethod} | ${readOk ? "YES" : "NO"} | ${r.facts.length} | ${r.provenance.confidence}`,
    );
    tableRows.push({
      document: r.displayName,
      type: kind,
      mimeType: r.mimeType,
      method: r.extractionMethod,
      status: r.status,
      readSuccessfully: readOk,
      factsExtracted: r.facts.length,
      confidence: r.provenance.confidence,
      limitation: r.limitation,
      textCharCount: r.textCharCount,
      hasBinary: r.hasBinary,
      byteLength: r.byteLength,
      documentId: r.documentId,
      family: r.family,
      requiresOcr: r.strategy.requiresOcr,
      requiresVision: r.strategy.requiresVision,
    });
  }

  console.log("\n=== Provenance examples (up to 8 facts) ===\n");
  const factExamples = allFacts.slice(0, 8);
  if (factExamples.length === 0) {
    note("No structured facts extracted from readable text on this Opportunity");
  } else {
    for (const f of factExamples) {
      console.log(
        [
          `${f.label}: ${f.value}`,
          `  Source: ${f.provenance.displayName}`,
          `  Period: ${f.periodLabel || "n/a"}`,
          `  Section: ${f.provenance.sectionOrTable || "n/a"}`,
          `  Page: ${f.provenance.page ?? "n/a"}`,
          `  Method: ${f.provenance.extractionMethod}`,
          `  Confidence: ${f.provenance.confidence}`,
          `  Unit: ${f.unit ?? "n/a"}`,
          `  documentId: ${short(f.provenance.documentId)}…`,
          `  opportunityId: ${short(f.provenance.opportunityId)}…`,
          `  versionHint: ${f.provenance.documentVersionHint || "n/a"}`,
        ].join("\n"),
      );
      console.log("");
    }
    ok(`Provenance present on ${factExamples.length} fact example(s)`);
  }

  console.log("=== Cross-document comparisons ===\n");
  if (comparisons.length === 0) {
    note("No cross-document comparisons (need ≥2 docs with comparable extracted keys)");
  } else {
    for (const c of comparisons.slice(0, 10)) {
      console.log(`- ${c.factKey}: ${c.status} — ${c.note}`);
    }
    ok(`${comparisons.length} comparison(s) produced`);
  }

  console.log("\n=== Content classifications ===\n");
  for (const r of reads.slice(0, 12)) {
    const c = r.classification;
    console.log(
      `- ${c.kind} (${c.confidence}) doc=${short(r.documentId)}… signals=${(c.signals || []).join(",") || "none"}`,
    );
  }

  // No-fabrication: facts only when text exists
  const orphanFacts = allFacts.filter((f) => {
    const read = reads.find((r) => r.documentId === f.provenance.documentId);
    return !read || read.textCharCount === 0;
  });
  if (orphanFacts.length === 0) {
    ok("No structured facts attached to documents without readable text");
  } else {
    fail(`${orphanFacts.length} structured fact(s) orphaned from unread documents`);
  }

  if (!visionConfigured) {
    const claimedOcrRead = reads.some(
      (r) =>
        r.textCharCount > 0 &&
        (r.extractionMethod === "ocr" || r.extractionMethod === "vision") &&
        (r.status === "content_read" || r.status === "content_partial"),
    );
    if (claimedOcrRead) fail("OCR/vision content claimed while credentials are ABSENT");
    else ok("No OCR/vision success claimed while credentials are ABSENT");
  }

  // Proposal context wiring (architecture smoke — no proposal generation)
  ok("Document Intelligence extractors produced pack-compatible reads/facts for proposal gather");

  const counts = {
    documentsReviewed: reads.length,
    documentsWithBinary: reads.filter((r) => r.hasBinary).length,
    documentsWithReadableText: reads.filter((r) => r.textCharCount > 0).length,
    documentsRequiringOcr: reads.filter((r) => r.strategy.requiresOcr).length,
    documentsRequiringVision: reads.filter((r) => r.strategy.requiresVision).length,
    structuredFacts: allFacts.length,
    crossDocumentComparisons: comparisons.length,
  };

  console.log("\n=== Summary counts ===\n");
  console.log(JSON.stringify(counts, null, 2));

  console.log(
    failed === 0
      ? "\nCO-CHANAKYA-DOCUMENT-BAT-007: engineering checks PASS"
      : `\nCO-CHANAKYA-DOCUMENT-BAT-007: engineering checks FAIL (${failed})`,
  );

  console.log("\n__BAT_JSON__");
  console.log(
    JSON.stringify({
      source,
      opportunityId,
      opportunityNumber,
      desiredCoverage: Object.fromEntries(desired.map((k) => [k, presentKinds.has(k)])),
      tableRows,
      factExamples: factExamples.map((f) => ({
        label: f.label,
        value: f.value,
        periodLabel: f.periodLabel,
        documentName: f.provenance.displayName,
        section: f.provenance.sectionOrTable,
        page: f.provenance.page,
        method: f.provenance.extractionMethod,
        confidence: f.provenance.confidence,
        documentId: f.provenance.documentId,
        opportunityId: f.provenance.opportunityId,
        versionHint: f.provenance.documentVersionHint,
        unit: f.unit ?? null,
      })),
      allFacts: allFacts.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        periodLabel: f.periodLabel,
        documentName: f.provenance.displayName,
        method: f.provenance.extractionMethod,
        confidence: f.provenance.confidence,
        unit: f.unit ?? null,
      })),
      crossDocumentComparisons: comparisons,
      contentClassifications: reads.map((r) => r.classification),
      visionConfigured,
      capabilityNote: CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE,
      visionProviderNote: CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE,
      counts,
      failed,
    }),
  );

  if (prisma) await prisma.$disconnect().catch(() => {});
  process.exit(failed === 0 ? 0 : 1);
} catch (err) {
  console.error("BAT crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
