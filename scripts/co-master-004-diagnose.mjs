/**
 * CO-MASTER-004 — live diagnostic (read-only). No seeds/mutations.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function norm(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function family(a, b) {
  const A = norm(a);
  const B = norm(b);
  return A === B || A.replace(/_/g, "") === B.replace(/_/g, "");
}

const TARGETS = [
  "HOME_LOAN",
  "LAP",
  "PERSONAL_LOAN",
  "BUSINESS_LOAN_UNSECURED",
  "COMMERCIAL_PURCHASE",
];

async function main() {
  const lenders = await prisma.enterpriseLender.findMany({
    where: { status: "active", enabled: true },
    select: {
      id: true,
      code: true,
      label: true,
      displayName: true,
      productsSupported: true,
    },
  });

  let products = [];
  try {
    products = await prisma.enterpriseProduct.findMany({
      where: { enabled: true },
      select: { id: true, code: true, label: true, status: true },
    });
  } catch (e) {
    products = { error: String(e.message || e) };
  }

  const mapped = {};
  for (const code of TARGETS) {
    const hits = lenders.filter((l) =>
      (l.productsSupported || []).some((ps) => family(ps, code)),
    );
    mapped[code] = {
      count: hits.length,
      sampleCodes: hits.slice(0, 5).map((h) => h.code),
      sampleProducts: hits.slice(0, 2).map((h) => h.productsSupported),
    };
  }

  const legacyFilterWouldMatch = lenders.filter((l) =>
    (l.productsSupported || []).some(
      (p) =>
        p === "home_loan" ||
        p === "home-loan" ||
        String(p).includes("home_loan"),
    ),
  ).length;

  const hlProduct = Array.isArray(products)
    ? products.find(
        (x) =>
          family(x.code, "HOME_LOAN") || /home\s*loan/i.test(x.label || ""),
      )
    : null;

  console.log(
    JSON.stringify(
      {
        activeLenderCount: lenders.length,
        homeLoanProduct: hlProduct,
        productCount: Array.isArray(products) ? products.length : products,
        mappedByCanonicalCode: mapped,
        legacyDirectoryFilterHomeLoanHits: legacyFilterWouldMatch,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
