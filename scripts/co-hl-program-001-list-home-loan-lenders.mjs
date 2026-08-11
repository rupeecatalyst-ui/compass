/**
 * CO-HL-PROGRAM-001 — List active Home Loan–mapped lenders from live Prisma SSOT.
 * Read-only. No mutations. No seed creation.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

/** Align with canonical HOME_LOAN family + aliases (presentation only). */
const HOME_LOAN_CODES = new Set([
  "HOME_LOAN",
  "home_loan",
  "HL",
  "HL_STD",
  "HOME-LOAN",
  "home-loan",
  "prod_001",
]);

function normalizeCode(raw) {
  return String(raw ?? "").trim();
}

function isHomeLoanCode(raw) {
  const code = normalizeCode(raw);
  if (!code) return false;
  if (HOME_LOAN_CODES.has(code)) return true;
  const u = code.toUpperCase().replace(/-/g, "_");
  if (u === "HOME_LOAN" || u === "HL" || u === "HL_STD" || u === "PROD_001") return true;
  // Do not treat HOME_LOAN_BT as Home Loan purchase family for this wave.
  if (u === "HOME_LOAN_BT" || u.includes("HOME_LOAN_BT")) return false;
  return u === "HOME_LOAN";
}

function supportsHomeLoan(productsSupported) {
  if (!Array.isArray(productsSupported)) return false;
  return productsSupported.some((c) => isHomeLoanCode(c));
}

async function main() {
  const lenders = await prisma.enterpriseLender.findMany({
    where: { isDeleted: false, enabled: true },
    orderBy: { label: "asc" },
    select: {
      id: true,
      code: true,
      label: true,
      shortName: true,
      institutionCategory: true,
      classification: true,
      status: true,
      enabled: true,
      productsSupported: true,
      priority: true,
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
      lifecycleStatus: true,
    },
  });

  const mapped = lenders.filter((l) => supportsHomeLoan(l.productsSupported));

  const rows = mapped.map((l, idx) => {
    const hlPrograms = programs.filter(
      (p) => p.lenderId === l.id && isHomeLoanCode(p.productCode),
    );
    return {
      listOrder: idx + 1,
      lenderId: l.id,
      lenderCode: l.code,
      institutionName: l.label,
      institutionType: l.classification || l.institutionCategory || "Not Specified",
      status: l.status,
      activeInactive: l.enabled && String(l.status).toLowerCase() !== "inactive" ? "Active" : "Inactive",
      homeLoanMapped: "Yes",
      existingHomeLoanPrograms: hlPrograms.map((p) => p.label || p.id),
      existingHomeLoanProgramCount: hlPrograms.length,
      /** Global lender.priority — NOT Home Loan selection priority. */
      lenderMasterPriorityField: l.priority,
      homeLoanSelectionPriority: null,
    };
  });

  console.log(
    JSON.stringify(
      {
        sprint: "CO-HL-PROGRAM-001",
        productFamily: "HOME_LOAN",
        source: "Enterprise Lender Registry · productsSupported (Product–Lender Matrix)",
        totalEnabledLenders: lenders.length,
        homeLoanMappedCount: rows.length,
        sort: "Institution Name ascending",
        note: "Home Loan selection priority not set yet — awaiting Product Owner order.",
        lenders: rows,
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
