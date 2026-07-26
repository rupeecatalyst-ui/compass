/**
 * CO-ARCH-001-I3 — Reference Master seed verification.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

const PRIORITY_DOMAINS = [
  "country",
  "state",
  "city",
  "employment_type",
  "occupation",
  "industry",
  "property_type",
];

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
  console.log("\n=== CO-ARCH-001-I3 Reference Master Seed Verification ===\n");

  const org = await prisma.organization.findUnique({ where: { slug: "rupee-catalyst" } });
  if (!org) {
    fail("Pilot organization", "rupee-catalyst not found");
    process.exit(1);
  }
  pass("Pilot organization", org.id);

  const total = await prisma.enterpriseReferenceMaster.count({
    where: { organizationId: org.id, isDeleted: false },
  });
  if (total > 0) pass("Seeded reference masters", `${total} rows`);
  else fail("Seeded reference masters", "zero rows — run co-arch-001-i3-seed.mjs");

  for (const domain of PRIORITY_DOMAINS) {
    const count = await prisma.enterpriseReferenceMaster.count({
      where: { organizationId: org.id, domain, isDeleted: false, status: "active" },
    });
    if (count > 0) pass(`Domain ${domain}`, `${count} active`);
    else fail(`Domain ${domain}`, "no active rows");
  }

  const india = await prisma.enterpriseReferenceMaster.findFirst({
    where: { organizationId: org.id, domain: "country", code: "in", isDeleted: false },
  });
  if (india) pass("Country hierarchy anchor", "IN");
  else fail("Country hierarchy anchor", "IN missing");

  const mumbai = await prisma.enterpriseReferenceMaster.findFirst({
    where: { organizationId: org.id, domain: "city", code: "mumbai", isDeleted: false },
    include: { parent: true },
  });
  if (mumbai?.parent?.domain === "state") pass("City parent FK", "mumbai → state");
  else fail("City parent FK", "mumbai parent not linked to state");

  const salariedOcc = await prisma.enterpriseReferenceMaster.findFirst({
    where: {
      organizationId: org.id,
      domain: "occupation",
      code: "sal-software-engineer",
      isDeleted: false,
    },
    include: { parent: true },
  });
  if (salariedOcc?.parent?.domain === "employment_type") {
    pass("Occupation parent FK", "sal-software-engineer → employment_type");
  } else {
    fail("Occupation parent FK", "occupation hierarchy not linked");
  }

  const duplicates = await prisma.$queryRawUnsafe(`
    SELECT domain, code, COUNT(*)::int AS cnt
    FROM enterprise_reference_masters
    WHERE organization_id = $1 AND is_deleted = false
    GROUP BY domain, code
    HAVING COUNT(*) > 1
    LIMIT 5
  `, org.id);
  if (!duplicates.length) pass("No duplicate domain+code rows");
  else fail("No duplicate domain+code rows", `${duplicates.length} duplicate groups`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===\n`);
  process.exit(failed.length ? 1 : 0);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
