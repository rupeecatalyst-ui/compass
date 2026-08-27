/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019A — Banking document retrieval fix verification.
 *
 * Proves STORAGE-009 retrieval path (metadata → object store → PDF → intelligence)
 * when a valid binary exists; diagnoses Avon Axis metadata-only state honestly.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-certification-019a-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import dns from "node:dns/promises";
import {
  ETD_INLINE_CONTENT_BYTES_MAX,
  ETD_OBJECT_STORAGE_MAX_BYTES,
} from "../src/constants/enterprise-document-object-storage/index.ts";
import { CHANAKYA_DOC_READ_MAX_BYTES } from "../src/constants/chanakya-document-intelligence/index.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
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
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "verify-019a-jwt-secret-at-least-32-characters-long";

const { retrieveAuthorizedOpportunityDocuments } = await import(
  "../src/lib/chanakya-document-intelligence/retrieve-authorized.ts"
);
const { buildChanakyaDocumentIntelligencePack } = await import(
  "../src/lib/chanakya-document-intelligence/build-intelligence-pack.ts"
);
const { extractPdfTextFromBytes } = await import(
  "../src/lib/chanakya-document-intelligence/extract-pdf-text.ts"
);
const { isBankStatementDocument } = await import(
  "../src/lib/chanakya-document-intelligence/resolve-bank-document-state.ts"
);
const { describeDocumentObjectStorage } = await import(
  "../src/lib/enterprise-document-object-storage/resolve-adapter.ts"
);
const AVON_OPP_ID = "cmsipb7hu0003l304f7yrz7p8";
const AVON_OPP_NO = "OPP-2026-000060";

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

function buildPdfBytes(markerText, padBytes = 0) {
  const escaped = String(markerText)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  const stream = `BT /F1 12 Tf 50 700 Td (${escaped}) Tj ET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];
  if (padBytes > 0) {
    objects.push(
      `6 0 obj<< /Length ${padBytes} >>stream\n${"A".repeat(padBytes)}\nendstream\nendobj\n`,
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

async function loginBat() {
  const email = process.env.CATALYST_BAT_EMAIL || "";
  const password = process.env.CATALYST_BAT_PASSWORD || "";
  if (!email || !password) return { ok: false, reason: "BAT credentials missing" };
  const bases = [
    process.env.CO_CHANAKYA_011_READ_BASE,
    process.env.CATALYST_BAT_URL,
    "https://catalyst-one.rupeecatalyst.com",
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
      const token = loginJson.data?.accessToken || loginJson.data?.token;
      if (loginRes.ok && loginJson.success && token) {
        return { ok: true, base, token };
      }
    } catch {
      /* try next */
    }
  }
  return { ok: false, reason: "Login failed" };
}

console.log("\n=== CO-CHANAKYA-CREDIT-CERTIFICATION-019A ===\n");

const storageDesc = describeDocumentObjectStorage();
note(
  `STORAGE-009 adapter preferred=${storageDesc.preferred} provider=${storageDesc.providerId} available=${storageDesc.available}`,
);
note(
  `Inline cap=${ETD_INLINE_CONTENT_BYTES_MAX} objectMax=${ETD_OBJECT_STORAGE_MAX_BYTES} chanakyaReadMax=${CHANAKYA_DOC_READ_MAX_BYTES}`,
);
if (storageDesc.available) ok("STORAGE-009 object storage port available");
else fail("STORAGE-009 object storage port unavailable");

// --- Avon live diagnosis (read-only BAT) ---
console.log("\n--- Avon Axis bank statement diagnosis (read-only BAT) ---\n");
let avonRequiresReupload = false;
const auth = await loginBat();
if (!auth.ok) {
  fail(`Avon diagnosis skipped: ${auth.reason}`);
} else {
  ok(`BAT login against ${auth.base}`);
  const docRes = await fetch(
    `${auth.base}/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(AVON_OPP_ID)}&includeContent=1`,
    { headers: { Authorization: `Bearer ${auth.token}` }, cache: "no-store" },
  );
  const docJson = await docRes.json().catch(() => ({}));
  const docs = docJson.data?.items || [];
  const axis = docs.filter(
    (d) =>
      isBankStatementDocument({
        displayName: d.displayName || d.originalFilename || "",
        typeRef: d.typeRef || "",
      }) && /\baxis\b/i.test(d.displayName || d.originalFilename || ""),
  );
  note(`Avon total ETD rows=${docs.length} Axis bank statements=${axis.length}`);
  let missingBinary = 0;
  for (const d of axis) {
    const durable = Boolean(d.contentBase64 || d.storageKey);
    const oversize = (d.fileSizeBytes || 0) > ETD_INLINE_CONTENT_BYTES_MAX;
    note(
      `  ${String(d.displayName || "").slice(0, 55)} | ${((d.fileSizeBytes || 0) / 1_048_576).toFixed(1)}MB | storageKey=${d.storageKey ? "yes" : "no"} | inline=${d.contentBase64 ? "yes" : "no"}`,
    );
    if (!durable && (d.fileSizeBytes || 0) > 0) missingBinary += 1;
  }
  if (axis.length === 8 && missingBinary === 8) {
    ok("All 8 Avon Axis statements are metadata-only (no storageKey, no inline bytes)");
    avonRequiresReupload = true;
    note("CODE PATH READY — RE-UPLOAD REQUIRED for Avon Axis bank PDFs on production");
  } else if (axis.length === 8 && missingBinary === 0) {
    ok("All 8 Avon Axis statements have durable binary references");
  } else {
    fail(`Avon Axis inventory unexpected: axis=${axis.length} missingBinary=${missingBinary}`);
  }
}

// --- Memory port: metadata-only → object store → PDF → intelligence ---
console.log("\n--- STORAGE-009 retrieval chain proof (memory adapter) ---\n");
const marker = `019A-BANK-${Date.now()}`;
const largePdf = buildPdfBytes(marker, ETD_INLINE_CONTENT_BYTES_MAX + 512 * 1024);
if (largePdf.length <= ETD_INLINE_CONTENT_BYTES_MAX) {
  fail(`Fixture must exceed inline cap (${largePdf.length})`);
} else {
  ok(`Large bank-sim PDF fixture ${largePdf.length} bytes (> ${ETD_INLINE_CONTENT_BYTES_MAX})`);
}

const {
  clearMemoryDocumentObjectStorage,
  memoryDocumentObjectStorage,
  hashDocumentObjectBytes,
} = await import("../src/lib/enterprise-document-object-storage/index.ts");
clearMemoryDocumentObjectStorage();

const orgMem = "org-019a";
const oppMem = `opp-019a-${randomUUID().slice(0, 8)}`;
const docId = `doc-${randomUUID().slice(0, 10)}`;
const hash = hashDocumentObjectBytes(Uint8Array.from(largePdf));
const put = await memoryDocumentObjectStorage.put({
  organizationId: orgMem,
  opportunityId: oppMem,
  documentId: docId,
  version: 1,
  contentHash: hash,
  mimeType: "application/pdf",
  bytes: Uint8Array.from(largePdf),
});
const got = await memoryDocumentObjectStorage.get({
  organizationId: orgMem,
  opportunityId: oppMem,
  storageKey: put.storageKey,
});
if (got?.bytes?.byteLength === largePdf.length) {
  ok("Object-store put/get for oversized PDF (uses object storage, not inline)");
} else {
  fail("Memory object-store put/get failed");
}

const extracted = await extractPdfTextFromBytes({ bytes: got.bytes });
if ((extracted?.text || "").includes(marker)) {
  ok("PDF text extraction succeeded on object-store bytes");
} else {
  fail("PDF text extraction missed marker on object-store bytes");
}

// --- Prisma E2E when DATABASE_URL reachable ---
console.log("\n--- retrieveAuthorized → intelligence pack (Prisma when available) ---\n");
let prisma = null;
try {
  prisma = await resolvePrisma();
  ok("Prisma reachable — running ETD end-to-end proof");
} catch (e) {
  note(`Prisma unreachable: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`);
  note("Skipping local ETD+retrieveAuthorized proof (memory port proof above still valid)");
}

if (prisma) {
  process.env.ENTERPRISE_PERSISTENCE_MODE = "prisma";
  const org = await prisma.organization.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!org?.id) {
    fail("No organization for Prisma proof");
  } else {
    const { enterpriseTransactionDocumentService } = await import(
      "../server/services/enterprise-transaction-documents/enterprise-transaction-document.service.ts"
    );
    const clientId = `019a-bank-${randomUUID().slice(0, 8)}`;
    const oppProof = `019a-proof-${randomUUID().slice(0, 8)}`;
    const markerDb = `019A-ETD-${Date.now()}`;
    const pdfDb = buildPdfBytes(markerDb, ETD_INLINE_CONTENT_BYTES_MAX + 400 * 1024);

    await enterpriseTransactionDocumentService.upsertForOrganization(org.id, {
      opportunityId: oppProof,
      clientRecordId: clientId,
      typeRef: "bank_statement",
      categoryLabel: "Bank Statement",
      originalFilename: "019a-axis-sim.pdf",
      displayName: "019A Axis Sim Bank Statement",
      mimeType: "application/pdf",
      fileSizeBytes: pdfDb.length,
      uploadedBy: "019a-verify",
    });
    const dto = await enterpriseTransactionDocumentService.putBinaryForOrganization({
      organizationId: org.id,
      opportunityId: oppProof,
      clientRecordId: clientId,
      bytes: Uint8Array.from(pdfDb),
      mimeType: "application/pdf",
    });

    if (dto.storageKey && !dto.contentBase64 && dto.fileSizeBytes > ETD_INLINE_CONTENT_BYTES_MAX) {
      ok(
        `Large upload used object store (storageKey set, no inline base64, size=${dto.fileSizeBytes})`,
      );
    } else {
      fail(
        `Large upload did not use expected object-store path storageKey=${dto.storageKey} size=${dto.fileSizeBytes}`,
      );
    }

    const authorized = await retrieveAuthorizedOpportunityDocuments({
      opportunityId: oppProof,
      includeBinary: true,
    });
    const bankDoc = authorized.find((d) => d.documentId === dto.id);
    if (bankDoc?.bytes?.byteLength && bankDoc.binarySource === "object_store") {
      ok(
        `retrieveAuthorized hydrated object-store binary bytes=${bankDoc.byteLength} source=${bankDoc.binarySource}`,
      );
    } else {
      fail(
        `retrieveAuthorized missing object-store bytes reason=${bankDoc?.binaryAbsentReason} source=${bankDoc?.binarySource}`,
      );
    }

    if (bankDoc?.bytes) {
      const pdfExtract = await extractPdfTextFromBytes({ bytes: bankDoc.bytes });
      if ((pdfExtract?.text || "").includes(markerDb)) {
        ok("PDF extraction on retrieveAuthorized bytes succeeded");
      } else {
        fail("PDF extraction on retrieveAuthorized bytes failed");
      }
    }

    const pack = await buildChanakyaDocumentIntelligencePack({ opportunityId: oppProof });
    const bankRead = pack.contentReads.find((r) => r.documentId === dto.id);
    if (bankRead && bankRead.status !== "no_binary") {
      ok(`Document intelligence pack status=${bankRead.status} for object-store bank PDF`);
    } else {
      fail(`Document intelligence pack still no_binary for object-store bank PDF`);
    }

    try {
      await enterpriseTransactionDocumentService.softDeleteForOrganization({
        organizationId: org.id,
        opportunityId: oppProof,
        documentId: dto.id,
      });
    } catch {
      /* cleanup best-effort */
    }
  }
  await prisma.$disconnect();
}

// --- Regression: enterprise-read + credit-intelligence verify ---
console.log("\n--- Regression verify scripts ---\n");
for (const script of [
  "co-chanakya-enterprise-read-context-002-verify.mjs",
  "co-chanakya-credit-intelligence-013-verify.mjs",
]) {
  const args =
    script.includes("013")
      ? [
          "--env-file=.env.local",
          "--env-file=compass/.env.local",
          "--import",
          "./scripts/_bat-stub-server-only.mjs",
          "--import",
          "tsx",
          `scripts/${script}`,
          "--avon",
        ]
      : ["--import", "tsx", `scripts/${script}`];
  const v = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
  });
  if (v.status === 0) ok(`${script} PASS`);
  else {
    fail(`${script} FAIL`);
    if (v.stderr) note(v.stderr.slice(0, 400));
  }
}

console.log("\n--- 019A summary ---\n");
if (avonRequiresReupload) {
  note("Avon OPP-2026-000060: CODE PATH READY — RE-UPLOAD REQUIRED");
  note("Eight Axis statements (4.5–7.5 MB) have Postgres metadata only — binaries never persisted pre-STORAGE-009.");
} else if (auth.ok) {
  note("Avon Axis statements may have durable binaries — re-check production state");
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed > 0 ? 1 : 0);
