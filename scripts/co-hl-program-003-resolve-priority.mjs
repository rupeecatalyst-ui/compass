/**
 * CO-HL-PROGRAM-003 — Resolve PO priority lenders against live registry (read-only).
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

const WANT = [
  "Central Bank of India",
  "HSBC Bank",
  "HDFC Bank",
  "Shinhan Bank",
  "State Bank of India",
  "Bank of India",
  "Axis Bank",
  "ICICI Bank",
  "Bajaj Housing Finance",
  "Bank of Baroda",
  "Federal Bank",
  "IIFL Home Finance",
  "Kotak Mahindra Bank",
  "LIC Housing Finance",
  "Piramal Housing Finance",
  "PNB Housing Finance",
  "Saraswat Cooperative Bank",
  "South Indian Bank",
  "Standard Chartered Bank",
  "Tata Capital Housing Finance",
  "Yes Bank",
];

const HL = new Set([
  "HOME_LOAN",
  "home_loan",
  "HL",
  "HL_STD",
  "HOME-LOAN",
  "home-loan",
  "prod_001",
]);

function isHL(c) {
  const raw = String(c ?? "");
  const u = raw.toUpperCase().replace(/-/g, "_");
  if (u.includes("HOME_LOAN_BT")) return false;
  return HL.has(raw) || u === "HOME_LOAN" || u === "HL" || u === "HL_STD" || u === "PROD_001";
}

function supports(ps) {
  return Array.isArray(ps) && ps.some(isHL);
}

function matchesWant(label, code, want) {
  const n = String(label || "").trim().toLowerCase();
  const w = want.toLowerCase();
  if (n === w) return true;
  if (want === "State Bank of India" && (code === "SBI" || n === "sbi")) return true;
  return false;
}

async function main() {
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

  const totalHL = lenders.filter((l) => l.enabled !== false && supports(l.productsSupported)).length;
  console.log(JSON.stringify({ totalEnabledHL: totalHL, totalLenders: lenders.length }, null, 2));

  const resolved = [];
  for (const want of WANT) {
    const hits = lenders.filter((l) => matchesWant(l.label, l.code, want));
    resolved.push({
      requested: want,
      hitCount: hits.length,
      hits: hits.map((l) => ({
        lenderId: l.id,
        lenderCode: l.code,
        institutionName: l.label,
        institutionType: l.classification || l.institutionCategory,
        enabled: l.enabled,
        status: l.status,
        homeLoanMapped: supports(l.productsSupported),
        productsSupported: l.productsSupported,
      })),
    });
  }

  console.log(JSON.stringify(resolved, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
