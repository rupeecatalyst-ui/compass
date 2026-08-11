/**
 * CO-PRODUCT-LENDER-DISCOVERY-001 — Read-only PL + Unsecured BL lender discovery.
 * Independent Product–Lender Matrix derivation. No mutations.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

const FAMILIES = {
  PERSONAL_LOAN: {
    key: "PERSONAL_LOAN",
    label: "Personal Loan",
    codes: new Set([
      "PERSONAL_LOAN",
      "personal_loan",
      "PL",
      "PL_STD",
      "PERSONAL-LOAN",
      "personal-loan",
    ]),
    normalizeMatch(u) {
      return (
        u === "PERSONAL_LOAN" ||
        u === "PL" ||
        u === "PL_STD" ||
        u === "PERSONALLOAN"
      );
    },
    labelMatch: /personal\s*loan|\bPL\b/i,
  },
  BUSINESS_LOAN_UNSECURED: {
    key: "BUSINESS_LOAN_UNSECURED",
    label: "Unsecured Business Loan",
    codes: new Set([
      "BUSINESS_LOAN_UNSECURED",
      "business_loan_unsecured",
      "BL_UNSECURED",
      "BL_STD",
      "BUSINESS-LOAN-UNSECURED",
      "UNSECURED_BUSINESS_LOAN",
      "unsecured_business_loan",
    ]),
    normalizeMatch(u) {
      // Explicitly exclude secured business / WC secured.
      if (u === "BUSINESS_LOAN_SECURED" || u === "WORKING_CAPITAL_SECURED") return false;
      if (u.includes("SECURED") && !u.includes("UNSECURED")) return false;
      return (
        u === "BUSINESS_LOAN_UNSECURED" ||
        u === "BL_UNSECURED" ||
        u === "BL_STD" ||
        u === "UNSECURED_BUSINESS_LOAN" ||
        // Canonical Product Master alias for Unsecured Business Loan
        u === "BUSINESS_LOAN"
      );
    },
    labelMatch: /unsecured\s*business\s*loan|business\s*loan\s*\(unsecured\)/i,
  },
};

function norm(raw) {
  return String(raw ?? "").trim();
}

function isFamilyCode(family, raw) {
  const code = norm(raw);
  if (!code) return false;
  if (family.codes.has(code)) return true;
  const u = code.toUpperCase().replace(/-/g, "_");
  // Hard excludes for cross-product leakage
  if (u.includes("HOME_LOAN") || u === "HL" || u === "HL_STD") return false;
  if (u === "LAP" || u === "LAP_STD" || u.includes("LOAN_AGAINST_PROPERTY")) return false;
  if (family.key === "PERSONAL_LOAN") {
    if (u.includes("BUSINESS")) return false;
    return family.normalizeMatch(u);
  }
  if (family.key === "BUSINESS_LOAN_UNSECURED") {
    if (u.includes("PERSONAL")) return false;
    if (u === "BUSINESS_LOAN_SECURED" || u === "WORKING_CAPITAL_SECURED") return false;
    return family.normalizeMatch(u);
  }
  return false;
}

function supportsFamily(family, productsSupported) {
  return Array.isArray(productsSupported) && productsSupported.some((c) => isFamilyCode(family, c));
}

const TYPE_MAP = {
  housing_finance_company: "HFC",
  hfc: "HFC",
  nbfc: "NBFC",
  private_sector_bank: "Private Bank",
  public_sector_bank: "Public Bank",
  cooperative_bank: "Cooperative Bank",
  small_finance_bank: "SFB",
  bank: "Bank",
  foreign_bank: "Foreign Bank",
  regional_rural_bank: "RRB",
};

function typeLabel(raw) {
  const k = String(raw || "").toLowerCase();
  return TYPE_MAP[k] || String(raw || "Not Specified").replace(/_/g, " ");
}

async function discoverFamily(family, lenders, programs, products, priorityByLender) {
  const productHits = products.filter(
    (p) =>
      isFamilyCode(family, p.code) ||
      family.labelMatch.test(String(p.label || "")),
  );

  const mapped = lenders.filter((l) => supportsFamily(family, l.productsSupported));
  const nameCount = {};
  for (const l of mapped) {
    const n = String(l.label || "").trim().toLowerCase();
    nameCount[n] = (nameCount[n] || 0) + 1;
  }

  const rows = mapped.map((l, idx) => {
    const famPrograms = programs.filter(
      (p) => p.lenderId === l.id && isFamilyCode(family, p.productCode),
    );
    const name = String(l.label || "").trim();
    const dup = (nameCount[name.toLowerCase()] || 0) > 1;
    return {
      listOrder: idx + 1,
      institutionName: name,
      institutionType: l.classification || l.institutionCategory || "Not Specified",
      institutionTypeLabel: typeLabel(l.classification || l.institutionCategory),
      lenderId: l.id,
      lenderCode: l.code,
      activeInactive:
        l.enabled && String(l.status).toLowerCase() !== "inactive" ? "Active" : "Inactive",
      status: l.status,
      productMapped: "Yes",
      existingPrograms: famPrograms.map((p) => ({
        programId: p.id,
        programName: p.label || p.id,
        lenderId: l.id,
        lenderCode: l.code,
        lenderName: name,
        activeInactive:
          p.enabled !== false && String(p.status || "").toLowerCase() !== "inactive"
            ? "Active"
            : "Inactive",
        status: p.status,
        enabled: p.enabled,
      })),
      existingProgramCount: famPrograms.length,
      currentPriority: priorityByLender[l.id] ?? null,
      duplicateNameDifferentRecord: dup,
    };
  });

  const duplicates = rows
    .filter((r) => r.duplicateNameDifferentRecord)
    .map((r) => ({
      institutionName: r.institutionName,
      lenderId: r.lenderId,
      lenderCode: r.lenderCode,
      institutionType: r.institutionTypeLabel,
      activeInactive: r.activeInactive,
      productMapped: "Yes",
    }));

  const allPrograms = rows.flatMap((r) => r.existingPrograms);

  return {
    productFamily: family.key,
    productLabel: family.label,
    productMaster: productHits,
    totalEligible: rows.length,
    sort: "Institution Name ascending",
    currentPriorityStatus: `No ${family.label} priority assigned in this discovery step`,
    lenders: rows,
    duplicateNameRecords: duplicates,
    existingPrograms: allPrograms,
    dataModified: false,
    readOnly: true,
  };
}

async function main() {
  const products = await prisma.enterpriseProduct.findMany({
    where: { isDeleted: false },
    orderBy: { label: "asc" },
    select: {
      id: true,
      code: true,
      label: true,
      status: true,
      enabled: true,
      lifecycleStatus: true,
    },
  });

  const lenders = await prisma.enterpriseLender.findMany({
    where: { isDeleted: false, enabled: true },
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

  const programs = await prisma.enterpriseLenderProgram.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      lenderId: true,
      productCode: true,
      label: true,
      status: true,
      enabled: true,
    },
  });

  let orgId = null;
  try {
    const org =
      (await prisma.organization.findUnique({
        where: { slug: "rupee-catalyst" },
        select: { id: true },
      })) ||
      (await prisma.organization.findFirst({
        where: { isActive: true },
        select: { id: true },
      }));
    orgId = org?.id ?? null;
  } catch {
    orgId = null;
  }

  async function loadPriorities(familyKey) {
    const map = {};
    if (!orgId || !prisma.enterpriseProductLenderPriority) return map;
    try {
      const rows = await prisma.enterpriseProductLenderPriority.findMany({
        where: { organizationId: orgId, productFamily: familyKey },
        select: { lenderId: true, priorityRank: true },
      });
      for (const r of rows) map[r.lenderId] = r.priorityRank;
    } catch {
      /* ignore */
    }
    return map;
  }

  const plPriority = await loadPriorities("PERSONAL_LOAN");
  const blPriority = await loadPriorities("BUSINESS_LOAN_UNSECURED");

  const personalLoan = await discoverFamily(
    FAMILIES.PERSONAL_LOAN,
    lenders,
    programs,
    products,
    plPriority,
  );
  const unsecuredBusinessLoan = await discoverFamily(
    FAMILIES.BUSINESS_LOAN_UNSECURED,
    lenders,
    programs,
    products,
    blPriority,
  );

  const payload = {
    sprint: "CO-PRODUCT-LENDER-DISCOVERY-001",
    source:
      "Enterprise Lender Registry · productsSupported (Product–Lender Matrix) — independent per product",
    readOnly: true,
    dataModified: false,
    totalEnabledLenders: lenders.length,
    personalLoan,
    unsecuredBusinessLoan,
  };

  const dir = resolve(process.cwd(), "docs/co-product-lender-discovery-001");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, "PERSONAL-LOAN-AND-UNSECURED-BL-ELIGIBLE-LIVE.json"),
    JSON.stringify(payload, null, 2),
    "utf8",
  );

  // Chat-ready lines
  function chatLines(section, mappedLabel) {
    const lines = [];
    for (const r of section.lenders) {
      const progs =
        r.existingProgramCount > 0
          ? r.existingPrograms.map((p) => p.programName).join("; ")
          : "—";
      const dup = r.duplicateNameDifferentRecord
        ? "  [DUPLICATE NAME — DIFFERENT RECORD]"
        : "";
      lines.push(
        `${r.listOrder}. ${r.institutionName} | ${r.institutionTypeLabel} | ${r.lenderCode} | ${r.lenderId} | ${r.activeInactive} | ${mappedLabel}: Yes | Programs: ${progs} | Priority: —${dup}`,
      );
    }
    return lines.join("\n");
  }

  writeFileSync(
    resolve(dir, "PERSONAL-LOAN-CHAT.txt"),
    chatLines(personalLoan, "Personal Loan Mapped"),
    "utf8",
  );
  writeFileSync(
    resolve(dir, "UNSECURED-BUSINESS-LOAN-CHAT.txt"),
    chatLines(unsecuredBusinessLoan, "Unsecured Business Loan Mapped"),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        personalLoanEligible: personalLoan.totalEligible,
        unsecuredBlEligible: unsecuredBusinessLoan.totalEligible,
        personalLoanProducts: personalLoan.productMaster,
        unsecuredBlProducts: unsecuredBusinessLoan.productMaster,
        plDuplicates: personalLoan.duplicateNameRecords.length,
        blDuplicates: unsecuredBusinessLoan.duplicateNameRecords.length,
        plPrograms: personalLoan.existingPrograms.length,
        blPrograms: unsecuredBusinessLoan.existingPrograms.length,
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
