/**
 * CO-ARCH-001 Wave 4 — Tier 2 registry seed verification.
 * Checks non-zero counts across all three registries and idempotent re-seed (0 created).
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

function loadEnv(path, override = false) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (override || !process.env[key]) process.env[key] = val;
  }
}

loadEnv(resolve(".env"));
loadEnv(resolve(".env.local"), true);

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: DATABASE_URL / DIRECT_URL missing");
  process.exit(2);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
const results = [];

function pass(label, detail = "") {
  results.push({ ok: true, label, detail });
  console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
  results.push({ ok: false, label, detail });
  console.error(` FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("\n=== CO-ARCH-001 Wave 4 Tier 2 Seed Verification ===\n");

  const org = await prisma.organization.findUnique({ where: { slug: "rupee-catalyst" } });
  if (!org) {
    fail("Pilot organization", "rupee-catalyst not found");
    process.exit(1);
  }
  pass("Pilot organization", org.id);

  const [
    productCategories,
    productGroups,
    products,
    documentTypes,
    documentDefinitions,
    lenderCategories,
    lenders,
    programs,
  ] = await Promise.all([
    prisma.enterpriseProductCategory.count({
      where: { organizationId: org.id, isDeleted: false },
    }),
    prisma.enterpriseProductGroup.count({
      where: { organizationId: org.id, isDeleted: false },
    }),
    prisma.enterpriseProduct.count({
      where: { organizationId: org.id, isDeleted: false },
    }),
    prisma.enterpriseDocumentType.count({
      where: { organizationId: org.id, isDeleted: false },
    }),
    prisma.enterpriseDocumentDefinition.count({
      where: { organizationId: org.id, isDeleted: false },
    }),
    prisma.enterpriseLenderCategory.count({
      where: { organizationId: org.id, isDeleted: false },
    }),
    prisma.enterpriseLender.count({
      where: { organizationId: org.id, isDeleted: false },
    }),
    prisma.enterpriseLenderProgram.count({
      where: { organizationId: org.id, isDeleted: false },
    }),
  ]);

  if (productCategories > 0 && productGroups > 0 && products > 0) {
    pass(
      "Product registry non-zero",
      `${productCategories}/${productGroups}/${products}`,
    );
  } else {
    fail(
      "Product registry non-zero",
      `${productCategories}/${productGroups}/${products} — run co-arch-001-wave4-seed.mjs`,
    );
  }

  if (documentTypes > 0 && documentDefinitions > 0) {
    pass("Document registry non-zero", `${documentTypes}/${documentDefinitions}`);
  } else {
    fail(
      "Document registry non-zero",
      `${documentTypes}/${documentDefinitions} — run co-arch-001-wave4-seed.mjs`,
    );
  }

  if (lenderCategories > 0 && lenders > 0 && programs > 0) {
    pass("Lender registry non-zero", `${lenderCategories}/${lenders}/${programs}`);
  } else {
    fail(
      "Lender registry non-zero",
      `${lenderCategories}/${lenders}/${programs} — run co-arch-001-wave4-seed.mjs`,
    );
  }

  // Idempotent re-seed — capture created counts from runner output
  let reseedOutput = "";
  try {
    reseedOutput = execSync("npx tsx scripts/co-arch-001-wave4-seed-runner.ts", {
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: url },
      cwd: resolve("."),
    });
    console.log(reseedOutput);
  } catch (err) {
    fail("Idempotent re-seed execution", err instanceof Error ? err.message : "failed");
  }

  const createdMatches = [...reseedOutput.matchAll(/\+(\d+)/g)].map((m) =>
    Number(m[1]),
  );
  const totalCreated = createdMatches.reduce((a, b) => a + b, 0);
  if (createdMatches.length > 0 && totalCreated === 0) {
    pass("Idempotent re-seed produces 0 created");
  } else if (createdMatches.length === 0) {
    fail("Idempotent re-seed produces 0 created", "could not parse created counts");
  } else {
    fail("Idempotent re-seed produces 0 created", `total created=${totalCreated}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===\n`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

