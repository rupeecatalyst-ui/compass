/**
 * CO-DOC-001 — Phase 1 operational BAT readiness check.
 * Verifies every Product Owner scenario can Generate LOD without silent fallback.
 * Run: npx tsx scripts/co-doc-001-phase1-bat-ready.ts
 */

import { CO_DOC_001_PHASE1_BAT_SCENARIOS } from "../src/constants/document-requests";
import {
  EdieLodCertificationError,
  generateOpportunityLod,
} from "../src/lib/document-requests/generate-lod";
import { evaluateDocumentRequestLodReadiness } from "../src/lib/document-requests/lod-readiness";

function employmentFor(borrower: string): string {
  if (borrower.toLowerCase().includes("self")) return "self-employed-business";
  if (borrower.toLowerCase().includes("company")) return "company";
  return "salaried";
}

function run() {
  const lines: string[] = [];
  let failed = 0;

  for (const scenario of CO_DOC_001_PHASE1_BAT_SCENARIOS) {
    const employmentType = employmentFor(scenario.borrower);
    const constitution = scenario.constitution;
    const gate = evaluateDocumentRequestLodReadiness({
      customerName: "BAT Customer",
      mobile: "9876543210",
      email: "bat@example.com",
      productLabel: scenario.product,
      employmentType,
      constitution,
    });
    if (!gate.canGenerate) {
      failed += 1;
      lines.push(
        `FAIL gate · ${scenario.product} · ${scenario.borrower} · ${constitution ?? "—"} · ${gate.gaps.map((g) => g.label).join(", ")}`,
      );
      continue;
    }
    try {
      const lod = generateOpportunityLod({
        productLabel: scenario.product,
        employmentType,
        constitution,
        transactionType: scenario.product.toLowerCase().includes("balance transfer")
          ? "balance_transfer"
          : "fresh",
      });
      if (!lod.length) {
        failed += 1;
        lines.push(`FAIL empty LOD · ${scenario.product} · ${scenario.borrower}`);
        continue;
      }
      lines.push(
        `PASS · ${scenario.product} · ${scenario.borrower}${constitution ? ` · ${constitution}` : ""} · ${lod.length} docs`,
      );
    } catch (err) {
      failed += 1;
      const msg = err instanceof EdieLodCertificationError ? err.message : String(err);
      lines.push(`FAIL generate · ${scenario.product} · ${msg.split("\n")[0]}`);
    }
  }

  // Product codes from Opportunity catalog must also resolve
  for (const code of [
    "HOME_LOAN",
    "HOME_LOAN_BT",
    "LAP",
    "PERSONAL_LOAN",
    "EDUCATION_LOAN",
    "CAR_LOAN",
    "GOLD_LOAN",
    "LOAN_AGAINST_SECURITIES",
    "UNSECURED_BUSINESS_LOAN",
    "BUSINESS_LOAN",
  ]) {
    const lod = generateOpportunityLod({
      productLabel: code,
      employmentType: code.includes("BUSINESS") ? "self-employed-business" : "salaried",
      constitution: code.includes("BUSINESS") ? "proprietorship" : undefined,
    });
    lines.push(`PASS code · ${code} · ${lod.length} docs`);
  }

  console.log("CO-DOC-001 PHASE 1 BAT READY");
  for (const line of lines) console.log(`  ${line}`);
  if (failed) {
    console.log(`RESULT: FAIL (${failed})`);
    process.exit(1);
  }
  console.log("RESULT: PASS — Generate LOD operational for listed Phase 1 scenarios");
}

run();
