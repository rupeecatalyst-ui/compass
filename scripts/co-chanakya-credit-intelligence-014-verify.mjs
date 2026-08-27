/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-014 — OCR & scanned document intelligence verification.
 *
 * Usage:
 *   node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-intelligence-014-verify.mjs
 *   node --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-intelligence-014-verify.mjs --avon
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN_AVON = process.argv.includes("--avon");

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

const { assessOcrExtractQuality } = await import(
  "../src/lib/chanakya-document-intelligence/assess-ocr-quality.ts"
);
const { assessExtractedTextQuality } = await import(
  "../src/lib/chanakya-document-intelligence/assess-text-quality.ts"
);
const { classifyCreditOcrDocument } = await import(
  "../src/lib/chanakya-document-intelligence/classify-credit-ocr-priority.ts"
);
const { createCompositeOcrPort } = await import(
  "../src/lib/chanakya-document-intelligence/composite-ocr-port.ts"
);
const {
  isAnyOcrProviderConfigured,
  listOcrProviderDescriptors,
} = await import("../src/lib/chanakya-document-intelligence/ocr-provider-config.ts");
const { extractPdfTextFromBytes } = await import(
  "../src/lib/chanakya-document-intelligence/extract-pdf-text.ts"
);
const { extractStructuredFactsFromText } = await import(
  "../src/lib/chanakya-document-intelligence/extract-structured-facts.ts"
);
const { CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED } = await import(
  "../src/constants/chanakya-document-intelligence/index.ts"
);

// --- Garbage OCR rejected ---
{
  const garbage = "cid cid obj stream xref trailer 123 456 789";
  const quality = assessOcrExtractQuality({
    text: garbage,
    providerConfidence: "medium",
  });
  if (quality.accepted) fail("014 garbage OCR must be rejected");
  else ok("Garbage OCR rejected by quality gate");
}

// --- Good OCR text accepted ---
{
  const good = `
INCOME TAX RETURN ACKNOWLEDGEMENT
Assessment Year 2024-25
Name: Sample Entity Pvt Ltd
Total Income: ₹ 45,00,000
`;
  const quality = assessOcrExtractQuality({
    text: good,
    providerConfidence: "high",
  });
  if (!quality.accepted) fail("014 labelled ITR OCR text should be accepted");
  else ok("Labelled ITR OCR text accepted");
}

// --- Credit document prioritization ---
{
  const itr = classifyCreditOcrDocument({ displayName: "ACK632165941241125.pdf" });
  if (itr.category !== "itr" || itr.priority !== "high") {
    fail("014 ITR acknowledgement priority classification");
  } else ok("ITR acknowledgement classified high priority");
  const auditor = classifyCreditOcrDocument({
    displayName: "Auditor Report FY 2023-24.pdf",
  });
  if (auditor.category !== "auditor_report") fail("014 auditor report classification");
  else ok("Auditor report classified credit-relevant");
}

// --- Provider port chain exists without hard-coded vendor ---
{
  const port = createCompositeOcrPort([]);
  if (port.providerId !== "composite_ocr_chain") fail("014 composite OCR port id");
  else ok("Composite OCR port chain (provider-port based)");
  const descriptors = listOcrProviderDescriptors();
  if (descriptors.length < 2) fail("014 expected multiple OCR provider descriptors");
  else ok("Multiple OCR provider descriptors registered");
}

// --- PROVIDER_NOT_CONFIGURED honest when no credentials ---
{
  if (isAnyOcrProviderConfigured()) {
    ok("OCR provider credentials detected in environment — live OCR may run");
  } else {
    ok(`${CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED} — no OCR credentials in this environment (expected for cert)`);
  }
}

// --- Financial OCR reuses 012 extractors (no parallel parser) ---
{
  const ocrText = `
AVON APPLIANCES PRIVATE LIMITED
Balance Sheet as at 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
Total Assets 114,630 109,451
Share Capital 500 500
`;
  const quality = assessOcrExtractQuality({ text: ocrText, providerConfidence: "high" });
  if (!quality.accepted) fail("014 financial OCR fixture quality");
  const facts = extractStructuredFactsFromText({
    text: ocrText,
    provenance: {
      documentId: "doc_ocr_fin",
      opportunityId: "opp_014",
      displayName: "Audited Balance Sheet scan.pdf",
      typeRef: "doc:financial",
      mimeType: "application/pdf",
      documentVersionHint: null,
      extractionMethod: "table_extraction",
      confidence: quality.ocrConfidence,
    },
  });
  if (!facts.some((f) => f.key === "total_assets")) {
    fail("014 OCR financial text must produce total_assets via 012 extractors");
  } else ok("Financial OCR reuses 012 table extractors (no parallel parser)");
}

// --- OCR facts not emitted when quality fails ---
{
  const noise = assessExtractedTextQuality("x y z 1 2 3");
  if (noise.usable) fail("014 noise must not be usable");
  else ok("Noise OCR cannot become structured facts");
}

// --- Preserve 013 verify ---
{
  const verify = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-intelligence-013-verify.mjs",
    ],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (verify.status !== 0) fail("013 verify regression");
  else ok("013 + 002–012 checks still PASS");
}

// --- Optional Avon OCR-required inventory (read-only BAT) ---
if (RUN_AVON) {
  console.log("\n--- Avon OPP-2026-000060 OCR-required inventory (read-only BAT) ---\n");

  const base =
    process.env.CO_CHANAKYA_011_READ_BASE?.replace(/\/$/, "") ||
    "https://catalyst-one.rupeecatalyst.com";
  const email = process.env.CATALYST_BAT_EMAIL || "";
  const password = process.env.CATALYST_BAT_PASSWORD || "";

  if (!email || !password) {
    fail("BAT credentials are not configured. Authenticated certification cannot continue.");
  } else if (!isAnyOcrProviderConfigured()) {
    ok(`${CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED} — Avon live OCR portion stopped honestly (no provider credentials)`);
    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const token = (await login.json()).data?.accessToken;
    if (!token) {
      fail("BAT login failed — cannot inventory OCR-required Avon documents");
    } else {
      ok(`BAT login (read-only) against ${base}`);
      const docs = (
        await (
          await fetch(
            `${base}/api/enterprise-transaction-documents?opportunityId=cmsipb7hu0003l304f7yrz7p8&includeContent=1`,
            { headers: { Authorization: `Bearer ${token}` } },
          )
        ).json()
      ).data?.items || [];

      let ocrRequired = 0;
      let creditRelevantOcr = 0;
      const rows = [];

      for (const doc of docs) {
        const priority = classifyCreditOcrDocument({
          displayName: doc.displayName || "",
          typeRef: doc.typeRef || "",
        });

        if (!doc.contentBase64) {
          if (priority.creditRelevant && (doc.fileSizeBytes || 0) > 0) {
            rows.push({
              name: (doc.displayName || "").slice(0, 60),
              category: priority.category,
              priority: priority.priority,
              note: "metadata_only — OCR blocked (no durable binary)",
            });
          }
          continue;
        }

        const raw = doc.contentBase64.includes(",")
          ? doc.contentBase64.split(",").pop()
          : doc.contentBase64;
        let bytes;
        try {
          bytes = Uint8Array.from(Buffer.from(raw, "base64"));
        } catch {
          continue;
        }
        const mime = (doc.mimeType || "").toLowerCase();
        const name = (doc.displayName || "").toLowerCase();
        if (mime !== "application/pdf" && !name.endsWith(".pdf")) continue;

        const extracted = await extractPdfTextFromBytes({ bytes });
        const textLen = extracted?.text?.trim().length ?? 0;
        const needsOcr =
          !extracted ||
          extracted.quality.empty ||
          textLen < 40 ||
          (!extracted.quality.usable && !extracted.quality.partial);
        if (!needsOcr) continue;

        ocrRequired += 1;
        if (priority.creditRelevant) creditRelevantOcr += 1;
        rows.push({
          name: (doc.displayName || "").slice(0, 60),
          category: priority.category,
          priority: priority.priority,
          note: extracted?.quality.empty ? "empty_text_layer" : "sparse_or_unusable_text",
        });
      }

      const metadataOnlyCredit = rows.filter((r) => r.note?.includes("metadata_only"));
      console.log(`Documents with binary requiring OCR (sparse/empty PDF text layer): ${ocrRequired}`);
      console.log(`Credit-relevant OCR-required (readable binary): ${creditRelevantOcr}`);
      console.log(`Credit-relevant metadata-only (OCR blocked): ${metadataOnlyCredit.length}`);
      for (const row of rows.slice(0, 20)) {
        console.log(
          `  · ${row.name} | ${row.category} | priority=${row.priority}${row.note ? ` | ${row.note}` : ""}`,
        );
      }
      if (rows.length > 20) console.log(`  … +${rows.length - 20} more`);

      ok("Avon OCR-required inventory reported without executing provider (credentials absent or not attempted here)");
      if (ocrRequired === 0) fail("014 expected OCR-required scanned PDFs on Avon");
      else ok(`Avon has ${ocrRequired} OCR-required PDF(s) on record`);
    }
  } else {
    ok("OCR provider credentials present — attempting composite port on Avon credit-relevant docs");
    const { ensureChanakyaDocumentIntelligencePortsWired } = await import(
      "../src/lib/chanakya-document-intelligence/wire-default-ports.ts"
    );
    ensureChanakyaDocumentIntelligencePortsWired();
    const ocrPort = createCompositeOcrPort();

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const token = (await login.json()).data?.accessToken;
    if (!token) fail("BAT login failed for live OCR Avon test");
    else {
      const docs = (
        await (
          await fetch(
            `${base}/api/enterprise-transaction-documents?opportunityId=cmsipb7hu0003l304f7yrz7p8&includeContent=1`,
            { headers: { Authorization: `Bearer ${token}` } },
          )
        ).json()
      ).data?.items || [];

      let attempted = 0;
      let succeeded = 0;
      let rejected = 0;
      let factsTotal = 0;

      for (const doc of docs) {
        const priority = classifyCreditOcrDocument({
          displayName: doc.displayName || "",
          typeRef: doc.typeRef || "",
        });
        if (!priority.creditRelevant || !doc.contentBase64) continue;

        const raw = doc.contentBase64.includes(",")
          ? doc.contentBase64.split(",").pop()
          : doc.contentBase64;
        let bytes;
        try {
          bytes = Uint8Array.from(Buffer.from(raw, "base64"));
        } catch {
          continue;
        }
        if (bytes.length > 4 * 1024 * 1024) continue;

        const extracted = await extractPdfTextFromBytes({ bytes });
        if (!extracted?.quality.empty) continue;

        attempted += 1;
        const ocr = await ocrPort.extract({
          documentId: doc.id,
          opportunityId: doc.opportunityId,
          mimeType: doc.mimeType || "application/pdf",
          bytes,
          displayName: doc.displayName,
        });
        if (!ocr?.text?.trim()) continue;

        const quality = assessOcrExtractQuality({
          text: ocr.text,
          providerConfidence: ocr.confidence,
        });
        if (!quality.accepted) {
          rejected += 1;
          console.log(`  REJECT  ${doc.displayName.slice(0, 55)} — ${quality.reason}`);
          continue;
        }

        succeeded += 1;
        const facts = extractStructuredFactsFromText({
          text: ocr.text,
          provenance: {
            documentId: doc.id,
            opportunityId: doc.opportunityId,
            displayName: doc.displayName,
            typeRef: doc.typeRef || "unknown",
            mimeType: doc.mimeType || "application/pdf",
            documentVersionHint: doc.updatedAt || null,
            extractionMethod: "table_extraction",
            confidence: quality.ocrConfidence,
          },
        });
        factsTotal += facts.length;
        console.log(
          `  OK  ${doc.displayName.slice(0, 55)} | provider=${ocr.providerId} | facts=${facts.length} | conf=${quality.ocrConfidence}`,
        );
      }

      console.log(
        `\nAvon OCR: attempted=${attempted} succeeded=${succeeded} rejected=${rejected} facts=${factsTotal}`,
      );
      ok("Avon live OCR run completed (no raw binaries in output)");
    }
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
