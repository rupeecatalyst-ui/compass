#!/usr/bin/env node
/**
 * CO-CERT-005 — Script 3: Enterprise Data Integrity Certification
 * Reuses CO-STAB-002 audit probes. Never prints connection strings.
 *
 * Usage: node scripts/co-cert-data-integrity.mjs
 */

import { PrismaClient } from "@prisma/client";
import {
  envValue,
  exitCode,
  overallFromResults,
  printGateRow,
  printSection,
  validateConnectionVar,
} from "./_lib/cert-toolkit.mjs";

printSection("Enterprise Data Integrity Certification");

if (validateConnectionVar("DATABASE_URL") === "FAIL" && validateConnectionVar("DIRECT_URL") === "FAIL") {
  printGateRow("DATABASE connectivity config", "FAIL");
  printSection("Overall Result");
  console.log("FAIL");
  process.exit(1);
}

const url = envValue("DIRECT_URL") || envValue("DATABASE_URL");
const prisma = new PrismaClient({ datasources: { db: { url } } });

function countOf(rows) {
  return Array.isArray(rows) && rows[0] ? Number(rows[0].c) : -1;
}

async function main() {
  const gates = [];

  try {
    const [
      dealsMissingOpp,
      dealsMissingLender,
      activeOppMissingProductKey,
      softDeletedContactsReferenced,
      docLinkBadDef,
      indexes,
      dealCount,
      oppCount,
      contactCount,
      lenderCount,
    ] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM enterprise_deals WHERE is_deleted = false AND opportunity_id IS NULL`,
      ),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM enterprise_deals WHERE is_deleted = false AND lender_id IS NULL`,
      ),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM enterprise_opportunities
         WHERE is_deleted = false AND archived = false
           AND lifecycle_status::text IN ('requirement_captured','active','on_hold')
           AND closed_at IS NULL AND product_uniqueness_key IS NULL`,
      ),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM enterprise_opportunities o
         JOIN ecm_contacts c ON c.id = o.primary_contact_id
         WHERE c.is_deleted = true AND o.is_deleted = false`,
      ),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM enterprise_deal_document_links d
         WHERE d.is_deleted = false AND d.document_definition_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM enterprise_document_definitions x WHERE x.id = d.document_definition_id
           )`,
      ),
      prisma.$queryRawUnsafe(
        `SELECT indexname FROM pg_indexes WHERE indexname IN (
           'eopp_active_contact_product_uidx',
           'edeal_org_opp_lender_active_key',
           'eapayee_org_contact_unique_active',
           'eapayee_org_company_unique_active',
           'ecm_companies_org_name_ci_key'
         ) ORDER BY indexname`,
      ),
      prisma.enterpriseDeal.count({ where: { isDeleted: false } }),
      prisma.enterpriseOpportunity.count({ where: { isDeleted: false } }),
      prisma.ecmContact.count({ where: { isDeleted: false } }),
      prisma.enterpriseLender.count({ where: { isDeleted: false } }),
    ]);

    const orphanChecks = [
      ["Orphans: deals missing opportunity", countOf(dealsMissingOpp) === 0 ? "PASS" : "FAIL"],
      ["Orphans: deals missing lender", countOf(dealsMissingLender) === 0 ? "PASS" : "FAIL"],
      [
        "Orphans: active opp missing product key",
        countOf(activeOppMissingProductKey) === 0 ? "PASS" : "FAIL",
      ],
      [
        "Orphans: soft-deleted contact refs",
        countOf(softDeletedContactsReferenced) === 0 ? "PASS" : "FAIL",
      ],
      [
        "Orphans: deal document definition links",
        countOf(docLinkBadDef) === 0 ? "PASS" : "FAIL",
      ],
    ];

    const indexNames = (Array.isArray(indexes) ? indexes : []).map((r) => r.indexname);
    const expected = [
      "eopp_active_contact_product_uidx",
      "edeal_org_opp_lender_active_key",
      "eapayee_org_contact_unique_active",
      "eapayee_org_company_unique_active",
      "ecm_companies_org_name_ci_key",
    ];
    const indexesOk = expected.every((name) => indexNames.includes(name));

    const ssotMode =
      envValue("NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE") === "prisma" ||
      envValue("ENTERPRISE_PERSISTENCE_MODE") === "prisma"
        ? "PASS"
        : "FAIL";

    for (const [label, result] of orphanChecks) {
      printGateRow(label, result);
      gates.push(result);
    }
    printGateRow("Referential indexes (DB-only uniques)", indexesOk ? "PASS" : "FAIL");
    gates.push(indexesOk ? "PASS" : "FAIL");
    printGateRow("SSOT persistence mode (prisma)", ssotMode);
    gates.push(ssotMode);

    printSection("Registry Consistency (counts — non-secret)");
    printGateRow("Contacts (active)", String(contactCount));
    printGateRow("Opportunities (active)", String(oppCount));
    printGateRow("Enterprise Deals (active)", String(dealCount));
    printGateRow("Lenders (active)", String(lenderCount));
    // Counts are informational — do not fail solely on zero (empty Pilot is valid).
  } catch (err) {
    printGateRow("Integrity audit execution", "FAIL");
    console.log(`Detail: ${String(err?.message || err).slice(0, 200)}`);
    gates.push("FAIL");
  } finally {
    await prisma.$disconnect();
  }

  const overall = overallFromResults(gates);
  printSection("Overall Result");
  console.log(overall);
  process.exit(exitCode(overall));
}

await main();
