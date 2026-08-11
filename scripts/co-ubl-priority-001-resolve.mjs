/**
 * CO-UBL-PRIORITY-001 — Resolve PO UBL priority candidates (read-only).
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

const PO_ORDER = [
  { name: "Axis Bank", codeHints: ["AXIS"] },
  { name: "Bajaj Finance", codeHints: ["BAJAJ_FINANCE"] },
  { name: "Clix Capital", codeHints: ["CLIX_CAPITAL"] },
  { name: "Credit Saison India", codeHints: ["CREDIT_SAISON"] },
  { name: "DCB Bank", codeHints: ["DCB"] },
  { name: "Deutsche Bank", codeHints: ["DEUTSCHE_BANK"] },
  { name: "Edelweiss Finance", codeHints: ["EDELWEISS"] },
  { name: "SMFG India Credit", codeHints: ["SMFG_INDIA"] },
  { name: "HDFC Bank", codeHints: ["HDFC"] },
  { name: "HDB Financial Services", codeHints: ["HDB_FINANCIAL"] },
  { name: "ICICI Bank", codeHints: ["ICICI"] },
  {
    name: "Tata Capital Finance",
    codeHints: ["TATA_CAPITAL", "TATA_CAPITAL_FINANCE"],
    labelHints: ["tata capital finance", "tata capital"],
  },
  { name: "Standard Chartered Bank", codeHints: ["STANDARD_CHARTERED"] },
  { name: "Yes Bank", codeHints: ["YES"] },
  { name: "L&T Finance", codeHints: ["LT_FINANCE"] },
  { name: "IDFC FIRST Bank", codeHints: ["IDFC_FIRST"] },
  { name: "FlexiLoans", codeHints: ["FLEXILOANS"] },
];

function isUbl(code) {
  const raw = String(code ?? "");
  const u = raw.toUpperCase().replace(/-/g, "_");
  return (
    u === "BUSINESS_LOAN_UNSECURED" ||
    u === "BL_STD" ||
    u === "BUSINESS_LOAN" ||
    u === "UNSECURED_BUSINESS_LOAN" ||
    raw === "BUSINESS-LOAN-UNSECURED"
  );
}

function supports(ps) {
  return Array.isArray(ps) && ps.some(isUbl);
}

async function main() {
  const products = await prisma.enterpriseProduct.findMany({
    where: { isDeleted: false },
    select: { id: true, code: true, label: true, status: true, enabled: true },
  });
  const ublProducts = products.filter(
    (p) =>
      isUbl(p.code) ||
      /unsecured\s*business/i.test(p.label || "") ||
      p.code === "BUSINESS_LOAN_UNSECURED",
  );

  const lenders = await prisma.enterpriseLender.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      code: true,
      label: true,
      enabled: true,
      status: true,
      classification: true,
      institutionCategory: true,
      productsSupported: true,
    },
  });
  const enabled = lenders.filter((l) => l.enabled !== false);
  const ublEligible = enabled.filter((l) => supports(l.productsSupported));

  const recommendations = PO_ORDER.map((po, idx) => {
    const byCode = lenders.filter((l) => po.codeHints.includes(l.code));
    const labelHints = po.labelHints || [po.name.toLowerCase()];
    const byLabel = lenders.filter((l) => {
      const label = String(l.label || "").trim().toLowerCase();
      return labelHints.some((h) => label === h || label.includes(h));
    });
    const map = new Map();
    for (const l of [...byCode, ...byLabel]) map.set(l.id, l);
    const hits = [...map.values()].map((l) => ({
      lenderId: l.id,
      lenderCode: l.code,
      institutionName: l.label,
      institutionType: l.classification || l.institutionCategory || "Not Specified",
      enabled: l.enabled,
      status: l.status,
      active: l.enabled !== false && String(l.status).toLowerCase() !== "inactive",
      ublMapped: supports(l.productsSupported),
      productsSupported: l.productsSupported,
    }));

    let selected = null;
    let reason = "NO_LIVE_LENDER_RECORD";
    if (hits.length === 1) {
      selected = hits[0];
      reason = "SINGLE_MATCH";
    } else if (hits.length > 1) {
      const preferred =
        hits.find((h) => h.ublMapped && po.codeHints.includes(h.lenderCode)) ||
        hits.find((h) => h.ublMapped) ||
        hits[0];
      selected = preferred;
      reason = `MULTI_MATCH_SELECTED_${preferred.lenderCode}`;
    }

    return {
      requestedRank: idx + 1,
      requestedName: po.name,
      hitCount: hits.length,
      hits,
      selected,
      selectionReason: reason,
      canPersistPriority: Boolean(selected?.ublMapped && selected?.active),
    };
  });

  const payload = {
    sprint: "CO-UBL-PRIORITY-001",
    readOnly: true,
    ublProductMaster: ublProducts,
    totals: {
      enabledLenders: enabled.length,
      ublEligible: ublEligible.length,
    },
    recommendations,
  };

  const dir = resolve(process.cwd(), "docs/co-ubl-priority-001");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "RESOLVE-UBL.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
