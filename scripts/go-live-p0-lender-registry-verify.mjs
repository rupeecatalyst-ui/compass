/**
 * GO-LIVE P0 — verify Lender Registry admin + comparison wiring.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let failed = false;

const required = [
  "src/app/(dashboard)/admin/lender-registry/page.tsx",
  "src/components/catalyst-one/lender-registry-admin/lender-registry-admin-workspace.tsx",
  "src/components/catalyst-one/lender-registry-admin/new-lender-wizard.tsx",
  "src/lib/enterprise-lender-registry/local-store.ts",
  "src/lib/enterprise-lender-registry/index.ts",
  "src/lib/enterprise-lender-registry/map-to-directory.ts",
  "src/lib/enterprise-lender-registry/permissions.ts",
  "prisma/migrations/20260721240000_go_live_p0_lender_registry_extension/migration.sql",
  "docs/co-arch-001/GO-LIVE-P0-ENTERPRISE-LENDER-REGISTRY.md",
];

for (const rel of required) {
  if (!existsSync(resolve(process.cwd(), rel))) {
    console.error(`FAIL: missing ${rel}`);
    failed = true;
  } else console.log(`OK: ${rel}`);
}

const adminConsole = readFileSync(
  resolve(process.cwd(), "src/constants/administration-console.ts"),
  "utf8",
);
if (!adminConsole.includes('id: "masters"') || !adminConsole.includes("ADMIN_LENDER_REGISTRY")) {
  console.error("FAIL: Masters → Lender Registry not in administration console");
  failed = true;
} else console.log("OK: Administration Masters → Lender Registry");

const elw = readFileSync(
  resolve(process.cwd(), "src/components/catalyst-one/enterprise-lender-workspace/elw-lender-registry.tsx"),
  "utf8",
);
if (elw.includes("listLenderProgramsForProduct")) {
  console.error("FAIL: comparison still uses marketing listLenderProgramsForProduct");
  failed = true;
} else console.log("OK: comparison does not use marketing offer list");

if (!elw.includes("publishedOnly") && !elw.includes("buildPublishedDirectoryRows")) {
  console.error("FAIL: comparison missing published registry wiring");
  failed = true;
} else console.log("OK: comparison wired to published registry programs");

if (!elw.includes("ADMIN_LENDER_REGISTRY")) {
  console.error("FAIL: comparison missing link to Lender Registry");
  failed = true;
} else console.log("OK: comparison links to Lender Registry");

if (failed) {
  console.error("\nGO-LIVE P0 LENDER REGISTRY VERIFY FAILED");
  process.exit(1);
}
console.log("\nGO-LIVE P0 LENDER REGISTRY VERIFY PASSED");
