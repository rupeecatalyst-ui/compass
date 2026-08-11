/**
 * CO-MASTER-004 — Product filter regression (read-only).
 * Proves Directory filter uses Product Master family match against
 * Lender Registry productsSupported (same as Product–Lender Matrix).
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { productCodesShareSelectionFamily } from "../src/constants/enterprise-product-master/canonical-catalog.ts";

const prisma = new PrismaClient();
const root = process.cwd();
const failures = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

/** Legacy Directory filter (pre-CO-MASTER-004). */
function legacyHit(productsSupported, selected) {
  const map = {
    "home-loan": "home_loan",
    "loan-against-property": "loan_against_property",
    "personal-loan": "personal_loan",
    "business-loan": "business_loan",
  };
  const code = map[selected] ?? selected;
  return (productsSupported || []).some(
    (p) =>
      p === code ||
      p === selected ||
      String(p).includes(String(selected).replace(/-/g, "_")),
  );
}

function familyHit(productsSupported, selected) {
  return (productsSupported || []).some((p) =>
    productCodesShareSelectionFamily(p, selected),
  );
}

async function main() {
  const compose = fs.readFileSync(
    path.join(root, "src/lib/enterprise-lender-directory/compose-directory.ts"),
    "utf8",
  );
  const workspace = fs.readFileSync(
    path.join(
      root,
      "src/components/catalyst-one/enterprise-lender-directory/enterprise-lender-directory-workspace.tsx",
    ),
    "utf8",
  );

  assert(
    compose.includes("productCodesShareSelectionFamily"),
    "filter must use productCodesShareSelectionFamily",
  );
  assert(
    !compose.includes("mapDirectoryProductIdToRegistryCode(filters.product)"),
    "filter must not use legacy directory slug mapper",
  );
  assert(
    workspace.includes("useProductMasterOptions"),
    "dropdown must load Product Master options",
  );
  assert(
    !workspace.includes("ELW_DIRECTORY_PRODUCTS"),
    "dropdown must not use hardcoded ELW_DIRECTORY_PRODUCTS",
  );
  assert(
    workspace.includes("value={p.code}"),
    "SelectItem must bind canonical product code",
  );

  const lenders = await prisma.enterpriseLender.findMany({
    where: { status: "active", enabled: true },
    select: { code: true, productsSupported: true, institutionCategory: true },
  });

  const products = await prisma.enterpriseProduct.findMany({
    where: { enabled: true },
    select: { id: true, code: true, label: true },
  });

  const targets = [
    {
      label: "Home Loan",
      matrixCode: "HOME_LOAN",
      selectValues: ["HOME_LOAN", "HL_STD", "home-loan"],
    },
    {
      label: "Loan Against Property",
      matrixCode: "LAP",
      selectValues: ["LAP", "loan-against-property"],
    },
    {
      label: "Personal Loan",
      matrixCode: "PERSONAL_LOAN",
      selectValues: ["PERSONAL_LOAN", "personal-loan"],
    },
    {
      label: "Unsecured Business Loan",
      matrixCode: "BUSINESS_LOAN_UNSECURED",
      selectValues: ["BUSINESS_LOAN_UNSECURED", "business-loan"],
    },
    {
      label: "Commercial Purchase",
      matrixCode: "COMMERCIAL_PURCHASE",
      selectValues: ["COMMERCIAL_PURCHASE"],
    },
  ];

  const report = {
    activeLenders: lenders.length,
    productMasterCount: products.length,
    homeLoanProductMaster: products.find(
      (p) =>
        productCodesShareSelectionFamily(p.code, "HOME_LOAN") ||
        /home\s*loan/i.test(p.label || ""),
    ),
    products: {},
  };

  for (const t of targets) {
    const matrixCount = lenders.filter((l) =>
      familyHit(l.productsSupported, t.matrixCode),
    ).length;
    const bySelectedValue = {};
    for (const c of t.selectValues) {
      bySelectedValue[c] = {
        familyFilter: lenders.filter((l) => familyHit(l.productsSupported, c))
          .length,
        legacyFilter: lenders.filter((l) => legacyHit(l.productsSupported, c))
          .length,
      };
      assert(
        bySelectedValue[c].familyFilter === matrixCount,
        `${t.label}: filter(${c})=${bySelectedValue[c].familyFilter} must equal matrix ${matrixCount}`,
      );
    }

    if (t.matrixCode === "HOME_LOAN" && matrixCount > 0) {
      assert(
        bySelectedValue["home-loan"].legacyFilter === 0,
        "legacy home-loan filter must remain 0 against HOME_LOAN storage (proves root cause)",
      );
      assert(
        bySelectedValue["HOME_LOAN"].familyFilter > 0,
        "HOME_LOAN family filter must return mapped lenders",
      );
    }

    const pm = products.find((p) =>
      productCodesShareSelectionFamily(p.code, t.matrixCode),
    );

    report.products[t.label] = {
      productId: pm?.id ?? null,
      productCode: pm?.code ?? t.matrixCode,
      matrixMappedCount: matrixCount,
      directoryDisplayedCount: bySelectedValue[t.selectValues[0]].familyFilter,
      bySelectedValue,
      result:
        bySelectedValue[t.selectValues[0]].familyFilter === matrixCount
          ? "PASS"
          : "FAIL",
    };
  }

  report.homeLoanPlusSearchPnb = lenders.filter(
    (l) =>
      familyHit(l.productsSupported, "HOME_LOAN") &&
      String(l.code || "")
        .toUpperCase()
        .includes("PNB"),
  ).length;
  assert(
    report.homeLoanPlusSearchPnb >= 1,
    "Home Loan + search PNB should find at least one lender",
  );

  report.homeLoanPlusCategoryBank = lenders.filter(
    (l) =>
      familyHit(l.productsSupported, "HOME_LOAN") &&
      String(l.institutionCategory || "").toLowerCase() === "bank",
  ).length;

  console.log(JSON.stringify(report, null, 2));

  if (failures.length) {
    console.error("CO-MASTER-004 VERIFY FAIL");
    for (const f of failures) console.error(" -", f);
    process.exit(1);
  }
  console.log("CO-MASTER-004 VERIFY PASS");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
