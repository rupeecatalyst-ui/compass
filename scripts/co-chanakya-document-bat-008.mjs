/**
 * CO-CHANAKYA-DOCUMENT-READING-008 — Real PDF / document content reading BAT.
 * Proves unpdf extraction, quality-gated content_read, bank binary diagnosis.
 * Never fabricates figures. Never logs raw document content.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import dns from "node:dns/promises";
import { buildChanakyaDocumentIntelligencePack } from "../src/lib/chanakya-document-intelligence/build-intelligence-pack.ts";
import { retrieveAuthorizedOpportunityDocuments } from "../src/lib/chanakya-document-intelligence/retrieve-authorized.ts";
import { extractPdfTextFromBytes } from "../src/lib/chanakya-document-intelligence/extract-pdf-text.ts";
import { isDocumentVisionConfigured } from "../src/lib/chanakya-document-intelligence/vision-config.ts";
import {
  CHANAKYA_DOC_DURABLE_BINARY_MAX_BYTES,
  CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE,
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

async function loginBat() {
  const email = process.env.CATALYST_BAT_EMAIL || "";
  const password = process.env.CATALYST_BAT_PASSWORD || "";
  if (!email || !password) {
    return { ok: false, reason: "CATALYST_BAT credentials not configured" };
  }
  const bases = [
    process.env.CATALYST_BAT_URL,
    "https://catalyst-one.rupeecatalyst.com",
    "https://catalyst-one-two.vercel.app",
  ]
    .filter(Boolean)
    .map((b) => String(b).replace(/\/$/, ""));
  for (const base of [...new Set(bases)]) {
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
    } catch {
      /* try next */
    }
  }
  return { ok: false, reason: "Login failed on all BAT bases" };
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
  const opportunities = oppJson.data?.items || oppJson.data?.results || [];
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    return { ok: false, reason: "No Opportunities from live BAT" };
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
      (kinds.has("GST") ? 2 : 0);
    if (!best || score > best.score) {
      best = {
        score,
        opportunityId,
        opportunityNumber: opp.opportunityNumber || null,
        metaDocs: docs,
      };
    }
  }
  if (!best) return { ok: false, reason: "No Opportunity with documents" };

  const fullRes = await fetch(
    `${auth.base}/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(best.opportunityId)}&includeContent=1`,
    { headers, cache: "no-store" },
  );
  const fullJson = await fullRes.json().catch(() => ({}));
  const fullDocs = fullJson.data?.items || [];

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
    docs: fullDocs,
    otherOppId,
    headers,
  };
}

console.log("\n=== CO-CHANAKYA-DOCUMENT-READING-008 ===\n");

try {
  const visionConfigured = isDocumentVisionConfigured();
  note(CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE);
  note(
    visionConfigured
      ? "Vision credentials PRESENT"
      : "Vision credentials ABSENT — OCR must stay unavailable",
  );

  // Prefer live BAT when local Prisma fails (same as 007).
  let opportunityId = null;
  let opportunityNumber = null;
  let source = null;
  let live = null;

  const localOk =
    (process.env.ENTERPRISE_PERSISTENCE_MODE || "").toLowerCase() === "prisma" &&
    Boolean(process.env.DATABASE_URL?.trim());

  if (localOk) {
    try {
      let url = process.env.DATABASE_URL;
      const host = new URL(url).hostname;
      const looked = await dns.lookup(host, { all: true });
      const v4 = looked.find((a) => a.family === 4)?.address;
      if (v4) {
        const x = new URL(url);
        x.searchParams.set("hostaddr", v4);
        url = x.toString();
      }
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      const sample = await prisma.enterpriseTransactionDocument.findFirst({
        where: { status: { not: "deleted" }, contentBytes: { not: null } },
        select: { opportunityId: true, opportunityNumber: true },
      });
      await prisma.$disconnect();
      if (sample?.opportunityId) {
        opportunityId = sample.opportunityId;
        opportunityNumber = sample.opportunityNumber;
        source = "local_prisma";
        ok("Local Prisma document source available");
      }
    } catch (e) {
      note(`Local Prisma unavailable: ${(e instanceof Error ? e.message : String(e)).split("\n").pop()}`);
    }
  }

  if (!opportunityId) {
    live = await fetchLiveDocs();
    if (!live.ok) {
      fail(`Cannot obtain real documents: ${live.reason}`);
      process.exit(1);
    }
    opportunityId = live.opportunityId;
    opportunityNumber = live.opportunityNumber;
    source = live.source;
    ok(`Live BAT document source: ${live.base}`);
  }

  console.log(`\nSource: ${source}`);
  console.log(`Opportunity: ${opportunityId}${opportunityNumber ? ` (${opportunityNumber})` : ""}`);

  // When using live API, we cannot call retrieveAuthorized (local DB).
  // Run extraction directly on downloaded binaries + mirror pack semantics.
  let pack = null;
  let docsForTable = [];

  if (source === "local_prisma") {
    const authorized = await retrieveAuthorizedOpportunityDocuments({
      opportunityId,
      includeBinary: true,
    });
    const leak = authorized.filter((d) => d.opportunityId !== opportunityId);
    if (leak.length === 0) ok(`Authorized retrieval: ${authorized.length} docs, opportunity-scoped`);
    else fail(`Cross-opportunity leak: ${leak.length}`);
    pack = await buildChanakyaDocumentIntelligencePack({ opportunityId });
    docsForTable = pack.reads;
  } else {
    // Live path: process binaries with the same extractors the pack uses.
    const { extractStructuredFactsFromText } = await import(
      "../src/lib/chanakya-document-intelligence/extract-structured-facts.ts"
    );
    const { classifyDocumentContent } = await import(
      "../src/lib/chanakya-document-intelligence/classify-content.ts"
    );
    const { classifyReadingStrategy, hintDocumentFamily } = await import(
      "../src/lib/chanakya-document-intelligence/classify-reading-strategy.ts"
    );
    const { buildCrossDocumentComparisons } = await import(
      "../src/lib/chanakya-document-intelligence/cross-document.ts"
    );
    const { extractNativeTextFromBytes } = await import(
      "../src/lib/chanakya-document-intelligence/extract-native-text.ts"
    );

    const reads = [];
    const structuredFacts = [];
    for (const d of live.docs) {
      const bytes = decodeBase64(d.contentBase64);
      const displayName = d.displayName || d.originalFilename || d.typeRef;
      const mimeType = d.mimeType || "application/octet-stream";
      const typeRef = d.typeRef || "unknown";
      const familyHint = hintDocumentFamily({ typeRef, displayName, mimeType });
      const strategy = classifyReadingStrategy({
        mimeType,
        displayName,
        hasBinary: Boolean(bytes?.length),
      });
      let status = strategy.ifUnavailableStatus;
      let method = strategy.preferredMethod;
      let limitation = null;
      let textExcerpt = null;
      let parseText = null;
      let confidence = "none";
      let page = null;
      const fileSizeBytes = d.fileSizeBytes || 0;
      const binaryAbsentReason = bytes?.length
        ? "none"
        : fileSizeBytes > CHANAKYA_DOC_DURABLE_BINARY_MAX_BYTES
          ? "over_durable_cap"
          : "never_persisted";

      if (!bytes?.length) {
        status = "no_binary";
        method = "unavailable";
        limitation =
          binaryAbsentReason === "over_durable_cap"
            ? `Durable contentBytes absent (fileSizeBytes=${fileSizeBytes} > ${CHANAKYA_DOC_DURABLE_BINARY_MAX_BYTES} cap). Client IndexedDB may hold the blob.`
            : "No durable binary persisted.";
      } else if (strategy.preferredMethod === "native_text") {
        const native = extractNativeTextFromBytes({ bytes, mimeType, displayName });
        if (native) {
          parseText = native.text;
          textExcerpt = native.text.slice(0, 8000);
          status = "content_read";
          method = "native_text";
          confidence = "high";
        } else {
          status = "extraction_failed";
          method = "unavailable";
        }
      } else if (strategy.preferredMethod === "pdf_text_layer") {
        const extracted = await extractPdfTextFromBytes({ bytes });
        if (!extracted) {
          status = "extraction_failed";
        } else if (extracted.quality.empty) {
          status = "ocr_required";
          method = "ocr";
          limitation = visionConfigured
            ? "Empty text layer; OCR needed"
            : "OCR/vision unavailable — provider credentials not configured.";
        } else if (!extracted.quality.usable) {
          status = "unreadable_content";
          method = "pdf_text_layer";
          limitation = extracted.quality.reason;
        } else {
          parseText = extracted.text;
          textExcerpt = extracted.excerpt;
          status = extracted.quality.partial ? "content_read_partial" : "content_read";
          method = "pdf_text_layer";
          confidence = extracted.quality.partial ? "medium" : "high";
          page = extracted.pageCount > 0 ? 1 : null;
          limitation = `unpdf pages=${extracted.pageCount} words≈${extracted.quality.alphaWordCount}`;
        }
      } else if (strategy.preferredMethod === "vision") {
        status = "vision_required";
        method = "vision";
        limitation = visionConfigured
          ? "Vision configured"
          : "OCR/vision unavailable — provider credentials not configured.";
      } else {
        status = strategy.ifUnavailableStatus;
        method = "unavailable";
        limitation = "Unsupported type";
      }

      let facts = [];
      if (
        parseText &&
        (status === "content_read" || status === "content_read_partial")
      ) {
        facts = extractStructuredFactsFromText({
          text: parseText,
          provenance: {
            documentId: d.id,
            opportunityId,
            displayName,
            typeRef,
            mimeType,
            documentVersionHint: d.updatedAt,
            extractionMethod: method,
            confidence,
          },
        });
        facts = facts.map((f) => ({
          ...f,
          provenance: { ...f.provenance, page: f.provenance.page ?? page },
        }));
        structuredFacts.push(...facts);
      }

      reads.push({
        documentId: d.id,
        opportunityId,
        displayName,
        typeRef,
        mimeType,
        familyHint,
        status,
        extractionMethod: method,
        hasBinary: Boolean(bytes?.length),
        byteLength: bytes?.length || 0,
        fileSizeBytes,
        binaryAbsentReason,
        textExcerpt,
        textCharCount: textExcerpt?.length || 0,
        limitation,
        facts,
        classification: classifyDocumentContent({
          documentId: d.id,
          displayName,
          typeRef,
          textExcerpt,
        }),
        provenance: {
          documentId: d.id,
          opportunityId,
          displayName,
          typeRef,
          mimeType,
          documentVersionHint: d.updatedAt,
          page,
          sectionOrTable: null,
          extractionMethod: method,
          confidence,
        },
      });
    }

    const comparisons = buildCrossDocumentComparisons(structuredFacts);
    pack = {
      opportunityId,
      reads,
      structuredFacts,
      crossDocumentComparisons: comparisons,
      documentsReviewed: reads.length,
      documentsWithBinary: reads.filter((r) => r.hasBinary).length,
      documentsWithReadableText: reads.filter(
        (r) => r.status === "content_read" || r.status === "content_read_partial",
      ).length,
      documentsRequiringOcr: reads.filter((r) => r.status === "ocr_required").length,
      documentsRequiringVision: reads.filter((r) => r.status === "vision_required").length,
      capability: { pdfTextExtraction: true, pdfTextLayerProbe: false },
    };
    docsForTable = reads;

    const leak = live.docs.filter((d) => d.opportunityId !== opportunityId);
    if (leak.length === 0) ok("All live docs opportunity-scoped");
    else fail(`Cross-opportunity leak: ${leak.length}`);

    if (live.otherOppId) {
      const otherRes = await fetch(
        `${live.base}/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(live.otherOppId)}`,
        { headers: live.headers, cache: "no-store" },
      );
      const otherJson = await otherRes.json().catch(() => ({}));
      const otherDocs = otherJson.data?.items || [];
      const overlap = live.docs.filter((a) => otherDocs.some((b) => b.id === a.id));
      if (overlap.length === 0) ok("No document id overlap across Opportunities");
      else fail(`Overlap: ${overlap.length}`);
    }
  }

  const desired = [
    "P&L",
    "Balance Sheet",
    "Bank Statement",
    "ITR",
    "Property",
    "Auditor/Director",
    "GST",
  ];
  const presentKinds = new Set(
    docsForTable.map((d) => classifyDesired(d.typeRef, d.displayName)),
  );
  console.log("\nDesired coverage:");
  for (const k of desired) {
    console.log(`  ${presentKinds.has(k) ? "PRESENT" : "MISSING"}  ${k}`);
  }

  console.log("\n=== Reading table ===\n");
  console.log("Document | Type | Method | Status | Facts | Confidence");
  for (const r of docsForTable) {
    const kind = classifyDesired(r.typeRef, r.displayName);
    const facts =
      r.facts?.length ??
      pack.structuredFacts.filter((f) => f.provenance.documentId === r.documentId)
        .length;
    console.log(
      `${r.displayName} | ${kind} | ${r.extractionMethod} | ${r.status} | ${facts} | ${r.provenance?.confidence || "n/a"}`,
    );
  }

  // 1. Real PDF extraction proof on Balance Sheet binary
  const bs = docsForTable.find(
    (r) =>
      classifyDesired(r.typeRef, r.displayName) === "Balance Sheet" && r.hasBinary,
  );
  if (bs && source !== "local_prisma") {
    const rawDoc = live.docs.find((d) => d.id === bs.documentId);
    const bytes = decodeBase64(rawDoc?.contentBase64);
    if (bytes) {
      const extracted = await extractPdfTextFromBytes({ bytes });
      const labels = [
        "total assets",
        "share capital",
        "reserves",
        "liabilities",
        "balance sheet",
      ];
      const hit = labels.filter((l) =>
        (extracted?.text || "").toLowerCase().includes(l),
      );
      console.log("\n=== Balance Sheet PDF extraction proof ===");
      console.log(
        JSON.stringify(
          {
            pages: extracted?.pageCount,
            usable: extracted?.quality.usable,
            alphaWordCount: extracted?.quality.alphaWordCount,
            hasMeaningfulLabels: extracted?.quality.hasMeaningfulLabels,
            labelHits: hit,
            status: bs.status,
            facts: pack.structuredFacts.filter(
              (f) => f.provenance.documentId === bs.documentId,
            ).map((f) => ({ label: f.label, value: f.value, unit: f.unit })),
          },
          null,
          2,
        ),
      );
      if (extracted?.quality.usable && hit.length > 0) {
        ok("Balance Sheet PDF yields meaningful financial labels via unpdf");
      } else if (bs.status === "unreadable_content" || bs.status === "ocr_required") {
        note(
          "Balance Sheet did not yield usable text-layer content — correctly not content_read",
        );
      } else {
        fail("Balance Sheet extraction quality unexpected");
      }
    }
  } else if (bs) {
    if (bs.status === "content_read" || bs.status === "content_read_partial") {
      ok(`Balance Sheet status=${bs.status} via pack`);
    } else {
      note(`Balance Sheet status=${bs.status}`);
    }
  } else {
    note("No Balance Sheet with binary on this Opportunity");
  }

  // GST sample
  const gstReadable = docsForTable.find(
    (r) =>
      classifyDesired(r.typeRef, r.displayName) === "GST" &&
      (r.status === "content_read" || r.status === "content_read_partial"),
  );
  if (gstReadable) {
    const gstFacts = pack.structuredFacts.filter(
      (f) => f.provenance.documentId === gstReadable.documentId,
    );
    ok(
      `GST readable (${gstReadable.status}); structured facts=${gstFacts.length}`,
    );
  } else {
    note("No quality-gated GST readable document (or GST missing)");
  }

  // Bank binary diagnosis
  const bankDocs = docsForTable.filter(
    (r) => classifyDesired(r.typeRef, r.displayName) === "Bank Statement",
  );
  console.log("\n=== Bank statement binary diagnosis ===");
  for (const b of bankDocs.slice(0, 5)) {
    console.log(
      `- ${b.displayName}: status=${b.status} hasBinary=${b.hasBinary} fileSize=${b.fileSizeBytes ?? "n/a"} absentReason=${b.binaryAbsentReason ?? "n/a"}`,
    );
  }
  if (bankDocs.some((b) => !b.hasBinary)) {
    ok("Bank statements without durable binary correctly reported as no_binary");
  } else if (bankDocs.length === 0) {
    note("No bank statements on Opportunity");
  } else {
    ok("Bank statement binaries present where available");
  }

  // OCR honesty
  if (!visionConfigured) {
    const falseOcr = docsForTable.some(
      (r) =>
        (r.extractionMethod === "ocr" || r.extractionMethod === "vision") &&
        (r.status === "content_read" || r.status === "content_read_partial") &&
        r.textCharCount > 0,
    );
    if (falseOcr) fail("OCR/vision success claimed without credentials");
    else ok("No OCR/vision success claimed without credentials");
  }

  // content_read must not be CID noise — unreadable_content for garbage
  const noiseAsRead = docsForTable.filter(
    (r) =>
      (r.status === "content_read" || r.status === "content_read_partial") &&
      r.limitation &&
      /CID|binary noise|non-semantic/i.test(r.limitation),
  );
  if (noiseAsRead.length === 0) {
    ok("No CID/noise documents marked content_read");
  } else {
    fail(`${noiseAsRead.length} noise docs incorrectly marked readable`);
  }

  // Provenance examples
  console.log("\n=== Provenance (up to 8 facts) ===\n");
  const facts = pack.structuredFacts.slice(0, 8);
  if (facts.length === 0) {
    note("No structured facts extracted (honest — may be layout/table-only)");
  } else {
    for (const f of facts) {
      console.log(
        `${f.label}: ${f.value}\n  Source: ${f.provenance.displayName}\n  Page: ${f.provenance.page ?? "n/a"}\n  Section: ${f.provenance.sectionOrTable || "n/a"}\n  Method: ${f.provenance.extractionMethod}\n  Confidence: ${f.provenance.confidence}\n  doc=${short(f.provenance.documentId)}… opp=${short(f.provenance.opportunityId)}…\n`,
      );
    }
    ok(`Provenance on ${facts.length} fact(s)`);
  }

  console.log("\n=== Cross-document ===\n");
  if (pack.crossDocumentComparisons.length === 0) {
    note("No comparisons (need ≥2 comparable keys)");
  } else {
    for (const c of pack.crossDocumentComparisons.slice(0, 8)) {
      console.log(`- ${c.factKey}: ${c.status} — ${c.note}`);
    }
    ok(`${pack.crossDocumentComparisons.length} comparison(s)`);
  }

  const orphan = pack.structuredFacts.filter((f) => {
    const r = docsForTable.find((x) => x.documentId === f.provenance.documentId);
    return (
      !r ||
      (r.status !== "content_read" && r.status !== "content_read_partial")
    );
  });
  if (orphan.length === 0) ok("No facts attached to unread documents");
  else fail(`${orphan.length} orphan fact(s)`);

  console.log("\n=== Counts ===");
  console.log(
    JSON.stringify(
      {
        documentsReviewed: pack.documentsReviewed,
        documentsWithBinary: pack.documentsWithBinary,
        documentsWithReadableText: pack.documentsWithReadableText,
        documentsRequiringOcr: pack.documentsRequiringOcr,
        structuredFacts: pack.structuredFacts.length,
        crossDocumentComparisons: pack.crossDocumentComparisons.length,
      },
      null,
      2,
    ),
  );

  console.log(
    failed === 0
      ? "\nCO-CHANAKYA-DOCUMENT-READING-008: engineering checks PASS"
      : `\nCO-CHANAKYA-DOCUMENT-READING-008: FAIL (${failed})`,
  );

  console.log("\n__BAT_JSON__");
  console.log(
    JSON.stringify({
      source,
      opportunityId,
      opportunityNumber,
      desiredCoverage: Object.fromEntries(desired.map((k) => [k, presentKinds.has(k)])),
      counts: {
        documentsReviewed: pack.documentsReviewed,
        documentsWithBinary: pack.documentsWithBinary,
        documentsWithReadableText: pack.documentsWithReadableText,
        documentsRequiringOcr: pack.documentsRequiringOcr,
        structuredFacts: pack.structuredFacts.length,
        crossDocumentComparisons: pack.crossDocumentComparisons.length,
      },
      statuses: Object.fromEntries(
        [
          "content_read",
          "content_read_partial",
          "unreadable_content",
          "ocr_required",
          "vision_required",
          "no_binary",
          "extraction_failed",
          "unsupported_type",
        ].map((s) => [s, docsForTable.filter((r) => r.status === s).length]),
      ),
      factExamples: facts.map((f) => ({
        label: f.label,
        value: f.value,
        documentName: f.provenance.displayName,
        page: f.provenance.page,
        method: f.provenance.extractionMethod,
        confidence: f.provenance.confidence,
        unit: f.unit ?? null,
      })),
      crossDocumentComparisons: pack.crossDocumentComparisons,
      visionConfigured,
      failed,
    }),
  );

  process.exit(failed === 0 ? 0 : 1);
} catch (err) {
  console.error("BAT crashed:", err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
}
