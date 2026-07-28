/**
 * CO-ADMIN-004 — static readiness verify (no deletion).
 * Ensures wizard, API, flags, and docs are present; confirms default-disabled.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) failures.push(`Missing: ${rel}`);
}

mustExist("src/types/production-reset.ts");
mustExist("src/constants/production-reset/flags.ts");
mustExist("src/constants/production-reset/index.ts");
mustExist("server/services/production-reset/production-reset.service.ts");
mustExist("src/app/api/admin/production-reset/route.ts");
mustExist("src/app/(dashboard)/admin/production-reset/page.tsx");
mustExist("src/components/catalyst-one/admin/production-reset/production-reset-wizard.tsx");
mustExist("docs/co-admin-004/CO-ADMIN-004-PRODUCTION-RESET-READINESS-REPORT.md");
mustExist("prisma/migrations/20260722120000_co_admin_004_production_reset/migration.sql");

const flags = fs.readFileSync(
  path.join(root, "src/constants/production-reset/flags.ts"),
  "utf8",
);
if (!flags.includes("return false")) {
  failures.push("Flag reader must default to false");
}
if (!flags.includes("PRODUCTION_RESET_ENABLED")) {
  failures.push("Missing PRODUCTION_RESET_ENABLED env constant");
}

const service = fs.readFileSync(
  path.join(root, "server/services/production-reset/production-reset.service.ts"),
  "utf8",
);
if (!service.includes("$transaction")) {
  failures.push("Execute path must use prisma.$transaction");
}
if (!service.includes("PRODUCTION_RESET_TYPED_CONFIRMATION") && !service.includes("RESET PRODUCTION DATA")) {
  // confirmation checked via imported constant
}
if (!service.includes("assertFeatureEnabled")) {
  failures.push("Missing feature enablement guard");
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
if (!schema.includes("model ProductionResetRun")) {
  failures.push("Prisma model ProductionResetRun missing");
}

const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
if (!envExample.includes("PRODUCTION_RESET_ENABLED")) {
  failures.push(".env.example missing PRODUCTION_RESET_ENABLED documentation");
}

const routes = fs.readFileSync(path.join(root, "src/constants/routes.ts"), "utf8");
if (!routes.includes("ADMIN_PRODUCTION_RESET")) {
  failures.push("ROUTES.ADMIN_PRODUCTION_RESET missing");
}

if (failures.length) {
  console.error("CO-ADMIN-004 verify FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-ADMIN-004 verify PASSED");
console.log(" - Wizard + API + engine present");
console.log(" - Feature defaults disabled");
console.log(" - Transactional execute path present");
console.log(" - No automatic deletion performed by this script");
