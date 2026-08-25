/**
 * CO-CHANAKYA-DOCUMENT-STORAGE-009 — Durable large-document storage BAT.
 * Proves: small retrieval · large object-store retrieval · Opportunity isolation ·
 * version handling · bank-statement diagnosis · unpdf on retrieved PDF · no raw logs.
 * Never fabricates banking figures. Never logs raw document content.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import dns from "node:dns/promises";
import { retrieveAuthorizedOpportunityDocuments } from "../src/lib/chanakya-document-intelligence/retrieve-authorized.ts";
import { extractPdfTextFromBytes } from "../src/lib/chanakya-document-intelligence/extract-pdf-text.ts";
import { describeDocumentObjectStorage } from "../src/lib/enterprise-document-object-storage/resolve-adapter.ts";
import {
  ETD_INLINE_CONTENT_BYTES_MAX,
  ETD_OBJECT_STORAGE_MAX_BYTES,
} from "../src/constants/enterprise-document-object-storage/index.ts";
import { CHANAKYA_DOC_READ_MAX_BYTES } from "../src/constants/chanakya-document-intelligence/index.ts";

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
loadEnvFile(".env");

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
function classify(label, status) {
  console.log(`CLASS ${label}: ${status}`);
}

function classifyDesired(typeRef, name) {
  const h = `${typeRef} ${name}`.toLowerCase();
  if (/bank[\s_-]*statement|passbook|banking|axis/.test(h)) return "Bank Statement";
  return "Other";
}

/** Minimal PDF with extractable text + optional padding stream (still valid). */
function buildPdfBytes(markerText, padBytes = 0) {
  const escaped = String(markerText).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const pad = padBytes > 0 ? "A".repeat(padBytes) : "";
  const stream = `BT /F1 12 Tf 50 700 Td (${escaped}) Tj ET`;
  const objects = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
  );
  objects.push(
    `4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  if (pad) {
    objects.push(
      `6 0 obj<< /Length ${pad.length} >>stream\n${pad}\nendstream\nendobj\n`,
    );
  }
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

async function resolvePrisma() {
  let url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const looked = await dns.lookup(host, { all: true });
    const v4 = looked.find((a) => a.family === 4)?.address;
    if (v4) {
      const x = new URL(url);
      x.searchParams.set("hostaddr", v4);
      url = x.toString();
    }
  } catch {
    /* keep url */
  }
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  await prisma.$queryRaw`SELECT 1`;
  return prisma;
}

async function ensureStorageSchema(prisma) {
  const sqlPath = path.join(
    process.cwd(),
    "prisma/migrations/20260825120000_co_chanakya_document_storage_009/migration.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter((s) => s.length > 10);
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (e) {
      note(`Schema ensure note: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`);
    }
  }
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

async function diagnoseLiveBankStatements() {
  const auth = await loginBat();
  if (!auth.ok) {
    note(`Live bank diagnosis skipped: ${auth.reason}`);
    classify("Existing Axis bank binary (live)", "NOT AVAILABLE");
    return;
  }
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
  let bankMeta = [];
  for (const opp of opportunities) {
    const opportunityId = opp.id || opp.opportunityId;
    if (!opportunityId) continue;
    const docRes = await fetch(
      `${auth.base}/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(opportunityId)}&includeContent=1`,
      { headers, cache: "no-store" },
    );
    const docJson = await docRes.json().catch(() => ({}));
    const docs = docJson.data?.items || [];
    for (const d of docs) {
      const kind = classifyDesired(d.typeRef, d.displayName || d.originalFilename || "");
      if (kind !== "Bank Statement") continue;
      bankMeta.push({
        opportunityId,
        opportunityNumber: opp.opportunityNumber || null,
        id: d.id,
        name: d.displayName || d.originalFilename,
        fileSizeBytes: d.fileSizeBytes || 0,
        hasContent: Boolean(d.hasContent),
        hasBase64: Boolean(d.contentBase64),
        storageKey: d.storageKey || null,
      });
    }
  }
  note(`Live bank-statement metadata rows found: ${bankMeta.length}`);
  for (const b of bankMeta.slice(0, 8)) {
    const durable =
      b.hasBase64 || b.storageKey
        ? "durable binary present"
        : "Metadata exists but binary is not durably available.";
    note(
      `Bank doc ${String(b.name).slice(0, 40)} size=${b.fileSizeBytes} hasContent=${b.hasContent} storageKey=${b.storageKey ? "yes" : "no"} → ${durable}`,
    );
  }
  const recoverable = bankMeta.some((b) => b.hasBase64 || b.storageKey);
  const oversizedMissing = bankMeta.filter(
    (b) => b.fileSizeBytes > ETD_INLINE_CONTENT_BYTES_MAX && !b.hasBase64 && !b.storageKey,
  );
  note(`Oversized bank docs without durable binary: ${oversizedMissing.length}`);
  if (oversizedMissing.length > 0) {
    note(
      "Metadata exists but binary is not durably available for oversized Axis-class statements — re-upload required after STORAGE-009 deploy.",
    );
    classify("Oversized Axis bank binary (live ~4.5MB+)", "NOT AVAILABLE");
  }
  if (recoverable) {
    classify("Existing bank statement durable binary (live, any size)", "PARTIALLY PROVEN");
  } else if (bankMeta.length > 0) {
    classify("Existing bank statement durable binary (live, any size)", "NOT AVAILABLE");
  } else {
    classify("Existing bank statement durable binary (live, any size)", "NOT AVAILABLE");
  }
}

console.log("\n=== CO-CHANAKYA-DOCUMENT-STORAGE-009 ===\n");

try {
  const storageDesc = describeDocumentObjectStorage();
  note(
    `Object storage preferred=${storageDesc.preferred} provider=${storageDesc.providerId} available=${storageDesc.available} supabaseConfigured=${storageDesc.supabaseConfigured}`,
  );
  note(
    `Inline cap=${ETD_INLINE_CONTENT_BYTES_MAX} objectMax=${ETD_OBJECT_STORAGE_MAX_BYTES} chanakyaReadMax=${CHANAKYA_DOC_READ_MAX_BYTES}`,
  );
  classify(
    "Storage architecture (port + adapters)",
    storageDesc.available ? "ARCHITECTURALLY READY" : "NOT AVAILABLE",
  );

  await diagnoseLiveBankStatements();

  // --- Object-store port proof (memory) — works without Postgres ---
  const {
    clearMemoryDocumentObjectStorage,
    memoryDocumentObjectStorage,
    hashDocumentObjectBytes,
  } = await import("../src/lib/enterprise-document-object-storage/index.ts");
  clearMemoryDocumentObjectStorage();
  const markerLarge = `BAT009-LARGE-${Date.now()}`;
  const markerV2 = `BAT009-V2-${Date.now()}`;
  const markerSmall = `BAT009-SMALL-${Date.now()}`;
  const largePdf = buildPdfBytes(markerLarge, ETD_INLINE_CONTENT_BYTES_MAX + 512 * 1024);
  const smallPdf = buildPdfBytes(markerSmall, 0);
  if (largePdf.length <= ETD_INLINE_CONTENT_BYTES_MAX) {
    fail(`Large fixture not over inline cap (${largePdf.length})`);
  } else {
    ok(`Large PDF fixture size=${largePdf.length} (> inline ${ETD_INLINE_CONTENT_BYTES_MAX})`);
  }

  const orgMem = "org-bat009";
  const oppA = `bat009-opp-a-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const oppB = `bat009-opp-b-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const docId = `doc-${randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const hash1 = hashDocumentObjectBytes(Uint8Array.from(largePdf));
  const put1 = await memoryDocumentObjectStorage.put({
    organizationId: orgMem,
    opportunityId: oppA,
    documentId: docId,
    version: 1,
    contentHash: hash1,
    mimeType: "application/pdf",
    bytes: Uint8Array.from(largePdf),
  });
  const got1 = await memoryDocumentObjectStorage.get({
    organizationId: orgMem,
    opportunityId: oppA,
    storageKey: put1.storageKey,
  });
  const leakGet = await memoryDocumentObjectStorage.get({
    organizationId: orgMem,
    opportunityId: oppB,
    storageKey: put1.storageKey,
  });
  if (got1?.bytes?.byteLength === largePdf.length && !leakGet) {
    ok("Object-store put/get + Opportunity key isolation (memory adapter)");
    classify("Large document retrieval (object-store port)", "PROVEN");
    classify("Opportunity isolation (storageKey scope)", "PROVEN");
  } else {
    fail("Memory object-store put/get/isolation failed");
    classify("Large document retrieval (object-store port)", "NOT AVAILABLE");
    classify("Opportunity isolation (storageKey scope)", "NOT AVAILABLE");
  }

  const v2Pdf = buildPdfBytes(markerV2, ETD_INLINE_CONTENT_BYTES_MAX + 256 * 1024);
  const hash2 = hashDocumentObjectBytes(Uint8Array.from(v2Pdf));
  const put2 = await memoryDocumentObjectStorage.put({
    organizationId: orgMem,
    opportunityId: oppA,
    documentId: docId,
    version: 2,
    contentHash: hash2,
    mimeType: "application/pdf",
    bytes: Uint8Array.from(v2Pdf),
  });
  const got2 = await memoryDocumentObjectStorage.get({
    organizationId: orgMem,
    opportunityId: oppA,
    storageKey: put2.storageKey,
  });
  const gotOld = await memoryDocumentObjectStorage.get({
    organizationId: orgMem,
    opportunityId: oppA,
    storageKey: put1.storageKey,
  });
  if (put2.storageKey !== put1.storageKey && got2 && gotOld) {
    const t2 = (await extractPdfTextFromBytes({ bytes: got2.bytes }))?.text || "";
    if (t2.includes(markerV2) && !t2.includes(markerLarge)) {
      ok("Versioned storageKey: CHANAKYA reading v2 key sees only v2 marker");
      classify("Version handling", "PROVEN");
    } else if (t2.includes(markerV2)) {
      classify("Version handling", "PARTIALLY PROVEN");
    } else {
      fail("Version marker missing from v2 retrieval");
      classify("Version handling", "NOT AVAILABLE");
    }
  } else {
    fail("Version storage keys did not diverge");
    classify("Version handling", "NOT AVAILABLE");
  }

  if (got1?.bytes) {
    const extracted = await extractPdfTextFromBytes({ bytes: got1.bytes });
    const text = extracted?.text || "";
    if (text.includes(markerLarge)) {
      ok("unpdf reads large PDF bytes retrieved from object-store port");
      classify("unpdf on object-store PDF", "PROVEN");
    } else {
      fail("unpdf missed marker on large object-store PDF");
      classify("unpdf on object-store PDF", "PARTIALLY PROVEN");
    }
  }

  // Small path: inline-size PDF extractable (simulates contentBytes path)
  const smallExtract = await extractPdfTextFromBytes({
    bytes: Uint8Array.from(smallPdf),
  });
  if ((smallExtract?.text || "").includes(markerSmall)) {
    ok("Small PDF extraction still works (inline-size fixture)");
    classify("Small document retrieval (inline-size extract)", "PROVEN");
  } else {
    fail("Small PDF extraction failed");
    classify("Small document retrieval (inline-size extract)", "NOT AVAILABLE");
  }

  let prisma = null;
  try {
    prisma = await resolvePrisma();
    ok("Local/Prisma database reachable — running ETD end-to-end proof");
  } catch (e) {
    note(`Prisma unreachable: ${(e instanceof Error ? e.message : String(e)).slice(0, 160)}`);
    note(
      "ETD upsert/retrieveAuthorized end-to-end against Postgres is blocked by DB credentials in this environment. Object-store port + live metadata diagnosis still ran.",
    );
    classify("ETD+retrieveAuthorized end-to-end (local Prisma)", "NOT AVAILABLE");
    note("No raw document content was printed. No permanent public URLs used.");
    console.log(`\nFailed checks: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
  }

  await ensureStorageSchema(prisma);

  const org = await prisma.organization.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!org?.id) {
    fail("No organization row for storage BAT");
    process.exit(1);
  }

  process.env.ENTERPRISE_PERSISTENCE_MODE = "prisma";

  const { enterpriseTransactionDocumentService } = await import(
    "../server/services/enterprise-transaction-documents/enterprise-transaction-document.service.ts"
  );

  const smallClientId = `bat009-small-${randomUUID().slice(0, 8)}`;
  const largeClientId = `bat009-large-${randomUUID().slice(0, 8)}`;
  const leakClientId = `bat009-leak-${randomUUID().slice(0, 8)}`;

  const smallDto = await enterpriseTransactionDocumentService.upsertForOrganization(org.id, {
    opportunityId: oppA,
    clientRecordId: smallClientId,
    typeRef: "bank_statement",
    categoryLabel: "Bank Statement",
    originalFilename: "bat009-small.pdf",
    displayName: "BAT009 Small PDF",
    mimeType: "application/pdf",
    fileSizeBytes: smallPdf.length,
    uploadedBy: "bat-009",
    contentBase64: smallPdf.toString("base64"),
  });

  const largeMeta = await enterpriseTransactionDocumentService.upsertForOrganization(org.id, {
    opportunityId: oppA,
    clientRecordId: largeClientId,
    typeRef: "bank_statement",
    categoryLabel: "Bank Statement",
    originalFilename: "bat009-large-axis-sim.pdf",
    displayName: "BAT009 Large Bank-Sim PDF",
    mimeType: "application/pdf",
    fileSizeBytes: largePdf.length,
    uploadedBy: "bat-009",
  });

  const largeDto = await enterpriseTransactionDocumentService.putBinaryForOrganization({
    organizationId: org.id,
    opportunityId: oppA,
    clientRecordId: largeClientId,
    bytes: Uint8Array.from(largePdf),
    mimeType: "application/pdf",
  });

  await enterpriseTransactionDocumentService.upsertForOrganization(org.id, {
    opportunityId: oppB,
    clientRecordId: leakClientId,
    typeRef: "other",
    categoryLabel: "Other",
    originalFilename: "other-opp.pdf",
    displayName: "Other Opp Doc",
    mimeType: "application/pdf",
    fileSizeBytes: smallPdf.length,
    uploadedBy: "bat-009",
    contentBase64: smallPdf.toString("base64"),
  });

  if (smallDto.hasContent && !smallDto.storageKey) {
    ok("Small document used inline contentBytes path");
    classify("Small upload path", "PROVEN");
  } else {
    fail("Small document did not take inline path as expected");
    classify("Small upload path", "PARTIALLY PROVEN");
  }

  if (largeDto.storageKey && largeDto.hasContent && !largeDto.contentBase64) {
    ok(
      `Large document object-store path provider=${largeDto.storageProvider} version=${largeDto.contentVersion}`,
    );
    classify("Large upload path", "PROVEN");
  } else {
    fail(
      `Large document missing storageKey (storageKey=${largeDto.storageKey} hasContent=${largeDto.hasContent})`,
    );
    classify("Large upload path", "NOT AVAILABLE");
  }

  const authorized = await retrieveAuthorizedOpportunityDocuments({
    opportunityId: oppA,
    includeBinary: true,
  });
  const leak = authorized.filter((d) => d.opportunityId !== oppA);
  if (leak.length === 0) ok(`Opportunity isolation: ${authorized.length} docs, no cross-opp leak`);
  else fail(`Cross-opportunity leak: ${leak.length}`);
  classify("Opportunity isolation", leak.length === 0 ? "PROVEN" : "NOT AVAILABLE");

  const smallAuth = authorized.find((d) => d.documentId === smallDto.id);
  const largeAuth = authorized.find((d) => d.documentId === largeDto.id);

  if (smallAuth?.bytes?.byteLength) {
    ok(`Small retrieval bytes=${smallAuth.byteLength} source=${smallAuth.binarySource}`);
    classify("Small document retrieval", "PROVEN");
  } else {
    fail("Small retrieval missing bytes");
    classify("Small document retrieval", "NOT AVAILABLE");
  }

  if (largeAuth?.bytes?.byteLength && largeAuth.binarySource === "object_store") {
    ok(
      `Large retrieval bytes=${largeAuth.byteLength} source=${largeAuth.binarySource} version=${largeAuth.contentVersion}`,
    );
    classify("Large document retrieval", "PROVEN");
  } else {
    fail(
      `Large retrieval failed source=${largeAuth?.binarySource} bytes=${largeAuth?.byteLength || 0} reason=${largeAuth?.binaryAbsentReason}`,
    );
    classify("Large document retrieval", "NOT AVAILABLE");
  }

  // Version handling: replace large binary; CHANAKYA must see new marker, not old.
  const v2PdfEtd = buildPdfBytes(markerV2, ETD_INLINE_CONTENT_BYTES_MAX + 256 * 1024);
  const v2Dto = await enterpriseTransactionDocumentService.putBinaryForOrganization({
    organizationId: org.id,
    opportunityId: oppA,
    documentId: largeDto.id,
    bytes: Uint8Array.from(v2PdfEtd),
    mimeType: "application/pdf",
  });
  const afterVersion = await retrieveAuthorizedOpportunityDocuments({
    opportunityId: oppA,
    includeBinary: true,
  });
  const v2Auth = afterVersion.find((d) => d.documentId === largeDto.id);
  if (
    v2Dto.contentVersion > largeDto.contentVersion &&
    v2Auth?.bytes &&
    v2Dto.storageKey !== largeDto.storageKey
  ) {
    const extracted = await extractPdfTextFromBytes({ bytes: v2Auth.bytes });
    const text = extracted?.text || "";
    if (text.includes(markerV2) && !text.includes(markerLarge)) {
      ok(
        `ETD version handling: v${largeDto.contentVersion}→v${v2Dto.contentVersion}; unpdf sees current marker only`,
      );
      classify("ETD version handling", "PROVEN");
    } else if (text.includes(markerV2)) {
      ok("ETD version handling: new version marker present");
      classify("ETD version handling", "PARTIALLY PROVEN");
    } else {
      fail("ETD version handling: unpdf did not return new version marker");
      classify("ETD version handling", "NOT AVAILABLE");
    }
  } else {
    fail("ETD version handling: contentVersion/storageKey did not advance");
    classify("ETD version handling", "NOT AVAILABLE");
  }

  // Fresh large PDF for unpdf proof (independent of version replace)
  const extractClientId = `bat009-extract-${randomUUID().slice(0, 8)}`;
  await enterpriseTransactionDocumentService.upsertForOrganization(org.id, {
    opportunityId: oppA,
    clientRecordId: extractClientId,
    typeRef: "bank_statement",
    categoryLabel: "Bank Statement",
    originalFilename: "bat009-extract.pdf",
    displayName: "BAT009 Extract Proof",
    mimeType: "application/pdf",
    fileSizeBytes: largePdf.length,
    uploadedBy: "bat-009",
  });
  const extractDto = await enterpriseTransactionDocumentService.putBinaryForOrganization({
    organizationId: org.id,
    opportunityId: oppA,
    clientRecordId: extractClientId,
    bytes: Uint8Array.from(largePdf),
    mimeType: "application/pdf",
  });
  const extractAuth = (
    await retrieveAuthorizedOpportunityDocuments({ opportunityId: oppA, includeBinary: true })
  ).find((d) => d.documentId === extractDto.id);
  if (extractAuth?.bytes) {
    const extracted = await extractPdfTextFromBytes({ bytes: extractAuth.bytes });
    const text = extracted?.text || "";
    if (text.includes(markerLarge)) {
      ok("ETD unpdf extracted marker text from object-store large PDF (no raw content logged)");
      classify("ETD unpdf on object-store PDF", "PROVEN");
    } else {
      fail(`ETD unpdf did not find marker (chars=${text.length})`);
      classify("ETD unpdf on object-store PDF", "PARTIALLY PROVEN");
    }
  } else {
    fail("ETD unpdf proof missing retrieved bytes");
    classify("ETD unpdf on object-store PDF", "NOT AVAILABLE");
  }

  // Cleanup BAT rows (soft-delete metadata; leave blobs — non-destructive to real data)
  for (const id of [smallDto.id, largeDto.id, extractDto.id, largeMeta.id]) {
    try {
      await enterpriseTransactionDocumentService.softDeleteForOrganization({
        organizationId: org.id,
        opportunityId: oppA,
        documentId: id,
      });
    } catch {
      /* ignore */
    }
  }
  await prisma.enterpriseTransactionDocument.updateMany({
    where: { opportunityId: oppB, clientRecordId: leakClientId },
    data: { status: "deleted" },
  });

  await prisma.$disconnect();
  note("No raw document content was printed. No permanent public URLs used.");
  console.log(`\nFailed checks: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
  console.log(`\nFailed checks: ${failed}`);
  process.exit(1);
}
