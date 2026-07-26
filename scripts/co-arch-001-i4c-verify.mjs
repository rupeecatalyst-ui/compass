/**

 * CO-ARCH-001-I4c — Lender Registry infrastructure verification.

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



const TABLES = [

  "enterprise_lender_categories",

  "enterprise_lenders",

  "enterprise_lender_programs",

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

  console.log("\n=== CO-ARCH-001-I4c Lender Registry Verification ===\n");



  const tableRows = await prisma.$queryRawUnsafe(`

    SELECT table_name FROM information_schema.tables

    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

  `);

  const tableNames = new Set(tableRows.map((r) => r.table_name));

  for (const table of TABLES) {

    if (tableNames.has(table)) pass(`Table ${table}`);

    else fail(`Table ${table}`, "missing");

  }



  const enums = await prisma.$queryRawUnsafe(`

    SELECT t.typname AS name FROM pg_type t

    JOIN pg_namespace n ON n.oid = t.typnamespace

    WHERE n.nspname = 'public' AND t.typtype = 'e'

      AND t.typname IN (

        'LenderInstitutionCategory',

        'LenderLifecycleStatus',

        'LenderOperationalStatus',

        'LenderProgramLifecycleStatus'

      )

  `);

  if (enums.length === 4) pass("Lender registry enums");

  else fail("Lender registry enums", `found ${enums.length}/4`);



  const failedSchema = results.filter((r) => !r.ok);

  if (failedSchema.length) {

    console.log("\n=== Schema checks failed — run npx prisma migrate deploy ===\n");

    process.exit(1);

  }



  const org = await prisma.organization.findUnique({ where: { slug: "rupee-catalyst" } });

  const admin = await prisma.user.findFirst({

    where: { role: "SUPER_ADMIN", isActive: true },

    orderBy: { createdAt: "asc" },

  });

  if (!org || !admin) {

    console.log("\n  SKIP CRUD smoke — org or admin not seeded\n");

    process.exit(0);

  }



  const code = `I4C_VERIFY_${Date.now()}`;

  const category = await prisma.enterpriseLenderCategory.create({

    data: {

      organizationId: org.id,

      code,

      label: "I4c Verify Category",

      status: "draft",

      createdBy: admin.id,

      modifiedBy: admin.id,

    },

  });

  pass("Create lender category", category.id);



  const lender = await prisma.enterpriseLender.create({

    data: {

      organizationId: org.id,

      categoryId: category.id,

      code: `${code}_LEND`,

      label: "I4c Verify Lender",

      institutionCategory: "bank",

      lifecycleStatus: "draft",

      operationalStatus: "inactive",

      status: "draft",

      createdBy: admin.id,

      modifiedBy: admin.id,

    },

  });

  pass("Create lender", lender.id);



  const program = await prisma.enterpriseLenderProgram.create({

    data: {

      organizationId: org.id,

      lenderId: lender.id,

      code: `${code}_PROG`,

      label: "I4c Verify Program",

      lifecycleStatus: "draft",

      status: "draft",

      createdBy: admin.id,

      modifiedBy: admin.id,

    },

  });

  pass("Create lender program", program.id);



  await prisma.enterpriseLenderProgram.delete({ where: { id: program.id } });

  await prisma.enterpriseLender.delete({ where: { id: lender.id } });

  await prisma.enterpriseLenderCategory.delete({ where: { id: category.id } });

  pass("Cleanup direct prisma smoke rows");



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


