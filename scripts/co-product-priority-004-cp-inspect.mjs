/**
 * Inspect Commercial Purchase eligible lenders (read-only).
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

function isCp(code) {
  const u = String(code || "")
    .toUpperCase()
    .replace(/-/g, "_");
  return (
    u === "COMM_PURCHASE" ||
    u === "COMMERCIAL_PURCHASE" ||
    u === "CP_STD" ||
    u.includes("COMMERCIAL_PURCHASE")
  );
}

async function main() {
  const lenders = await prisma.enterpriseLender.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      code: true,
      label: true,
      enabled: true,
      status: true,
      productsSupported: true,
    },
  });
  const enabled = lenders.filter((l) => l.enabled !== false);
  const cp = enabled.filter(
    (l) => Array.isArray(l.productsSupported) && l.productsSupported.some(isCp),
  );
  const codeFreq = new Map();
  for (const l of enabled) {
    for (const c of l.productsSupported || []) {
      const u = String(c).toUpperCase();
      if (u.includes("COMM") || u.includes("PURCH") || u.includes("CP")) {
        codeFreq.set(c, (codeFreq.get(c) || 0) + 1);
      }
    }
  }
  console.log(
    JSON.stringify(
      {
        cpEligibleCount: cp.length,
        cpEligible: cp.map((l) => ({
          id: l.id,
          code: l.code,
          label: l.label,
          productsSupported: l.productsSupported,
        })),
        relatedProductCodes: Object.fromEntries(codeFreq),
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
