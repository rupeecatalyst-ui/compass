/**
 * CO-LENDER-ARCH-001 — Verify Enterprise Lender Registry SSOT.
 * Usage: node scripts/co-lender-arch-001-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const catalogPath = path.join(
    root,
    "src/constants/enterprise-lender-registry/master-seed-catalog.ts",
  );
  const catalogSrc = fs.readFileSync(catalogPath, "utf8");
  const seedKeys = [...catalogSrc.matchAll(/seedKey:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert(seedKeys.length >= 75, `Expected >= 75 master lenders, got ${seedKeys.length}`);

  // Soft Go-Live bootstrap count (via tsx if available, else static assert)
  const publishedPath = path.join(
    root,
    "src/lib/enterprise-lender-registry/published-directory.ts",
  );
  const publishedSrc = fs.readFileSync(publishedPath, "utf8");
  assert(
    publishedSrc.includes("isLenderPublishedAndActive"),
    "Published ∧ Active gate missing",
  );

  const deriveSrc = fs.readFileSync(
    path.join(root, "src/lib/chanakya-opportunity-recommendations/derive.ts"),
    "utf8",
  );
  assert(
    deriveSrc.includes("recommendPublishedLendersFromRegistry"),
    "Chanakya must rank from Enterprise Lender Registry",
  );
  assert(
    !deriveSrc.includes("seedLifeContactsIfEmpty"),
    "Chanakya must not seed LIFE demo contacts for ranking",
  );

  const lifeVal = fs.readFileSync(
    path.join(root, "src/lib/enterprise-life-engine/validation-engine.ts"),
    "utf8",
  );
  assert(
    lifeVal.includes("isContactLinkedToPublishedLender") ||
      lifeVal.includes("resolvePublishedEnterpriseLenderId"),
    "LIFE must gate executors on Published registry",
  );

  const strategy = fs.readFileSync(
    path.join(root, "src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx"),
    "utf8",
  );
  assert(
    strategy.includes("listPublishedLenderOptionsAsync"),
    "Manual Selection must use published directory",
  );

  const competition = fs.readFileSync(
    path.join(root, "src/components/catalyst-one/opportunity-workspace/workspace-competition-panel.tsx"),
    "utf8",
  );
  assert(
    competition.includes("listPublishedLenderOptions"),
    "Competition search must use Enterprise Lender Registry",
  );
  assert(
    !competition.includes("ECM_MASTER_CATALOGS.lender"),
    "Competition must not use ECM lender catalog",
  );

  const seedCatalog = fs.readFileSync(
    path.join(root, "server/services/tier2-registry/seed-catalog.ts"),
    "utf8",
  );
  assert(
    seedCatalog.includes("LENDER_MASTER_SEED_CATALOG"),
    "Prisma Tier2 seed must use master catalog",
  );

  const moveToDeal = fs.readFileSync(
    path.join(root, "src/lib/strategic-lender-pipeline/move-to-deal.ts"),
    "utf8",
  );
  assert(
    moveToDeal.includes("resolveLenderRegistryId") &&
      moveToDeal.includes("listPublishedLenderOptionsAsync"),
    "Deal creation must resolve Enterprise Lender ID",
  );

  // Scan for remaining selection-oriented hardcoded imports
  const offenders = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "docs") continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(ent.name)) {
        const src = fs.readFileSync(p, "utf8");
        if (
          src.includes("from \"@/data/catalyst-one/loan-files\"") &&
          /loanLenders/.test(src) &&
          !p.includes("loan-files.ts") &&
          !p.includes("generate-loan-files")
        ) {
          offenders.push(path.relative(root, p));
        }
        if (src.includes("ECM_MASTER_CATALOGS.lender") && p.includes("competition")) {
          offenders.push(path.relative(root, p));
        }
      }
    }
  };
  walk(path.join(root, "src"));

  const report = {
    masterCatalogCount: seedKeys.length,
    uniqueSeedKeys: new Set(seedKeys).size,
    publishedGate: true,
    chanakyaUsesRegistry: true,
    lifeGatesOnRegistry: true,
    manualUsesRegistry: true,
    competitionUsesRegistry: true,
    prismaSeedUsesMaster: true,
    dealResolvesEnterpriseLenderId: true,
    remainingLoanLendersImports: offenders,
    verdict:
      seedKeys.length >= 75 && offenders.length === 0 ? "PASS" : "FAIL",
  };

  const outDir = path.join(root, "docs/certification-screenshots/co-lender-arch-001");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "verify-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.verdict !== "PASS") process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
