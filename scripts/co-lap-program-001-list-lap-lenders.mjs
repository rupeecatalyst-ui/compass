/**
 * CO-LAP-PROGRAM-001 — Read-only discovery of live LAP-eligible lenders.
 * Does not mutate lenders, matrix, programs, or priorities.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

/** Align with Product Master selection family for Loan Against Property. */
const LAP_CODES = new Set([
  "LAP",
  "lap",
  "LAP_STD",
  "LOAN_AGAINST_PROPERTY",
  "loan_against_property",
  "LOAN-AGAINST-PROPERTY",
]);

function normalize(raw) {
  return String(raw ?? "").trim();
}

function isLapCode(raw) {
  const code = normalize(raw);
  if (!code) return false;
  if (LAP_CODES.has(code)) return true;
  const u = code.toUpperCase().replace(/-/g, "_");
  if (u === "LAP" || u === "LAP_STD" || u === "LOAN_AGAINST_PROPERTY") return true;
  // Do not treat HOME_LOAN / other families as LAP.
  if (u.includes("HOME_LOAN") || u === "HL" || u === "HL_STD") return false;
  return false;
}

function supportsLap(productsSupported) {
  return Array.isArray(productsSupported) && productsSupported.some(isLapCode);
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

  const lapProducts = products.filter(
    (p) =>
      isLapCode(p.code) ||
      /loan against property|\bLAP\b/i.test(String(p.label || "")),
  );

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

  // Priority table may already exist for other families — read LAP family only (no writes).
  let priorityByLender = {};
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
    if (org && prisma.enterpriseProductLenderPriority) {
      const pri = await prisma.enterpriseProductLenderPriority.findMany({
        where: { organizationId: org.id, productFamily: "LAP" },
        select: { lenderId: true, priorityRank: true },
      });
      for (const row of pri) priorityByLender[row.lenderId] = row.priorityRank;
    }
  } catch {
    priorityByLender = {};
  }

  const mapped = lenders.filter((l) => supportsLap(l.productsSupported));
  const nameCount = {};
  for (const l of mapped) {
    const n = String(l.label || "").trim().toLowerCase();
    nameCount[n] = (nameCount[n] || 0) + 1;
  }

  const rows = mapped.map((l, idx) => {
    const lapPrograms = programs.filter(
      (p) => p.lenderId === l.id && isLapCode(p.productCode),
    );
    const name = String(l.label || "").trim();
    const dup = (nameCount[name.toLowerCase()] || 0) > 1;
    return {
      listOrder: idx + 1,
      institutionName: name,
      institutionType: l.classification || l.institutionCategory || "Not Specified",
      lenderId: l.id,
      lenderCode: l.code,
      activeInactive:
        l.enabled && String(l.status).toLowerCase() !== "inactive" ? "Active" : "Inactive",
      status: l.status,
      lapMapped: "Yes",
      existingLapPrograms: lapPrograms.map((p) => p.label || p.id),
      existingLapProgramCount: lapPrograms.length,
      currentPriority: priorityByLender[l.id] ?? null,
      duplicateNameDifferentRecord: dup,
      productsSupported: l.productsSupported,
    };
  });

  const duplicates = rows.filter((r) => r.duplicateNameDifferentRecord);

  const payload = {
    sprint: "CO-LAP-PROGRAM-001",
    productFamily: "LAP",
    source:
      "Enterprise Lender Registry · productsSupported (Product–Lender Matrix) — independent of HOME_LOAN",
    readOnly: true,
    dataModified: false,
    lapProductMaster: lapProducts,
    totalEnabledLenders: lenders.length,
    lapEligibleCount: rows.length,
    sort: "Institution Name ascending",
    currentPriorityStatus: "No LAP priority assigned in this discovery step",
    lenders: rows,
    duplicateNameRecords: duplicates.map((r) => ({
      institutionName: r.institutionName,
      lenderId: r.lenderId,
      lenderCode: r.lenderCode,
      institutionType: r.institutionType,
      activeInactive: r.activeInactive,
      lapMapped: r.lapMapped,
    })),
  };

  const out = resolve(process.cwd(), "docs/co-lap-program-001/LAP-ELIGIBLE-LENDERS-LIVE.json");
  writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
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
