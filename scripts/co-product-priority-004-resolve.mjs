/**
 * CO-PRODUCT-PRIORITY-004 — Resolve PO priority candidates for LAP + Commercial Purchase.
 * READ-ONLY discovery. Does not mutate mappings/lenders.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

const PO_ORDER = [
  "Standard Chartered Bank",
  "Saraswat Cooperative Bank",
  "HDFC Bank",
  "IndusInd Bank",
  "Jio Financial Services",
  "Kotak Mahindra Bank",
  "Axis Bank",
  "Yes Bank",
  "Federal Bank",
  "Piramal Finance",
  "Deutsche Bank",
  "Bajaj Finance",
  "Aditya Birla Finance",
];

const CODE_HINTS = {
  "Standard Chartered Bank": ["STANDARD_CHARTERED"],
  "Saraswat Cooperative Bank": ["SARASWAT"],
  "HDFC Bank": ["HDFC"],
  "IndusInd Bank": ["INDUSIND"],
  "Jio Financial Services": ["JIO", "JIO_FINANCIAL", "JIO_FINANCE", "JIO_FINANCIAL_SERVICES"],
  "Kotak Mahindra Bank": ["KOTAK"],
  "Axis Bank": ["AXIS"],
  "Yes Bank": ["YES"],
  "Federal Bank": ["FEDERAL"],
  "Piramal Finance": ["PIRAMAL_FINANCE"],
  "Deutsche Bank": ["DEUTSCHE_BANK"],
  "Bajaj Finance": ["BAJAJ_FINANCE"],
  "Aditya Birla Finance": ["ADITYA_BIRLA_FINANCE"],
};

function isLap(code) {
  const u = String(code || "").toUpperCase().replace(/-/g, "_");
  if (u.includes("HOME_LOAN") || u === "HL" || u === "HL_STD") return false;
  return u === "LAP" || u === "LAP_STD" || u === "LOAN_AGAINST_PROPERTY";
}

function isCommPurchase(code) {
  const u = String(code || "").toUpperCase().replace(/-/g, "_");
  return (
    u === "COMM_PURCHASE" ||
    u === "COMMERCIAL_PURCHASE" ||
    u === "COMMERCIAL-PURCHASE" ||
    u === "CP_STD"
  );
}

function supports(ps, pred) {
  return Array.isArray(ps) && ps.some(pred);
}

function matchLenders(lenders, name) {
  const n = name.toLowerCase();
  const hints = CODE_HINTS[name] || [];
  const byCode = lenders.filter((l) => hints.includes(l.code));
  const byExact = lenders.filter((l) => String(l.label || "").trim().toLowerCase() === n);
  const byContains = lenders.filter((l) => {
    const label = String(l.label || "").trim().toLowerCase();
    if (name === "Jio Financial Services") {
      return label.includes("jio") && (label.includes("financ") || label.includes("jfs"));
    }
    return false;
  });
  const map = new Map();
  for (const l of [...byCode, ...byExact, ...byContains]) map.set(l.id, l);
  return [...map.values()];
}

async function main() {
  const products = await prisma.enterpriseProduct.findMany({
    where: { isDeleted: false },
    select: { id: true, code: true, label: true, status: true, enabled: true, lifecycleStatus: true },
  });

  const lapProducts = products.filter((p) => isLap(p.code) || /loan against property|\bLAP\b/i.test(p.label || ""));
  const cpProducts = products.filter(
    (p) => isCommPurchase(p.code) || /commercial\s*purchase/i.test(p.label || ""),
  );

  const lenders = await prisma.enterpriseLender.findMany({
    where: { isDeleted: false },
    orderBy: { label: "asc" },
    select: {
      id: true,
      code: true,
      label: true,
      classification: true,
      institutionCategory: true,
      status: true,
      enabled: true,
      productsSupported: true,
    },
  });

  const enabled = lenders.filter((l) => l.enabled !== false);
  const lapEligible = enabled.filter((l) => supports(l.productsSupported, isLap));
  const cpEligible = enabled.filter((l) => supports(l.productsSupported, isCommPurchase));

  const resolved = PO_ORDER.map((name, idx) => {
    const hits = matchLenders(lenders, name).map((l) => ({
      lenderId: l.id,
      lenderCode: l.code,
      institutionName: l.label,
      institutionType: l.classification || l.institutionCategory || "Not Specified",
      enabled: l.enabled,
      status: l.status,
      active: l.enabled !== false && String(l.status).toLowerCase() !== "inactive",
      lapMapped: supports(l.productsSupported, isLap),
      commercialPurchaseMapped: supports(l.productsSupported, isCommPurchase),
      productsSupported: l.productsSupported,
    }));
    return { requestedRank: idx + 1, requestedName: name, hitCount: hits.length, hits };
  });

  // Recommend one record per requested name when unambiguous / preferred code.
  const recommendations = resolved.map((r) => {
    if (r.hitCount === 0) {
      return {
        ...r,
        selected: null,
        selectionReason: "NO_LIVE_LENDER_RECORD",
      };
    }
    const preferredCode = (CODE_HINTS[r.requestedName] || [])[0];
    let selected =
      (preferredCode && r.hits.find((h) => h.lenderCode === preferredCode)) ||
      r.hits.find((h) => h.active && (h.lapMapped || h.commercialPurchaseMapped)) ||
      r.hits[0];

    // Prefer active + mapped when multiple
    if (r.hitCount > 1) {
      const mapped = r.hits.filter((h) => h.active && (h.lapMapped || h.commercialPurchaseMapped));
      if (preferredCode) {
        const pref = mapped.find((h) => h.lenderCode === preferredCode) || r.hits.find((h) => h.lenderCode === preferredCode);
        if (pref) selected = pref;
      } else if (mapped.length === 1) selected = mapped[0];
    }

    return {
      ...r,
      selected,
      selectionReason:
        r.hitCount === 1
          ? "SINGLE_MATCH"
          : `MULTI_MATCH_SELECTED_${selected?.lenderCode || "NONE"}`,
    };
  });

  const payload = {
    sprint: "CO-PRODUCT-PRIORITY-004",
    readOnly: true,
    lapProductMaster: lapProducts,
    commercialPurchaseProductMaster: cpProducts,
    totals: {
      enabledLenders: enabled.length,
      lapEligible: lapEligible.length,
      commercialPurchaseEligible: cpEligible.length,
    },
    poOrder: PO_ORDER,
    recommendations,
  };

  const dir = resolve(process.cwd(), "docs/co-product-priority-004");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "RESOLVE-LAP-COMM-PURCHASE.json"), JSON.stringify(payload, null, 2));
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
