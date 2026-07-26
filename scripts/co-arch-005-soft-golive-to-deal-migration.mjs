/**
 * CO-ARCH-005 — One-time Soft Go-Live → Enterprise Deal Registry migration.
 *
 * Usage (Node, with DATABASE_URL / API session as applicable):
 *   node --import tsx scripts/co-arch-005-soft-golive-to-deal-migration.mjs --dry-run
 *   node --import tsx scripts/co-arch-005-soft-golive-to-deal-migration.mjs --apply
 *
 * Browser dump helper: paste JSON from localStorage key `compass:loan-files-data`
 * into `scripts/fixtures/soft-golive-loan-files.json` then run with --file.
 *
 * This script does NOT keep Soft Go-Live as runtime SSOT — it imports once.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STORAGE_KEY = "compass:loan-files-data";

function parseArgs(argv) {
  const dryRun = !argv.includes("--apply");
  const fileIdx = argv.indexOf("--file");
  const file = fileIdx >= 0 ? argv[fileIdx + 1] : null;
  return { dryRun, file };
}

function loadFixture(filePath) {
  const abs = resolve(process.cwd(), filePath);
  if (!existsSync(abs)) {
    throw new Error(`Fixture not found: ${abs}`);
  }
  const raw = JSON.parse(readFileSync(abs, "utf8"));
  return Array.isArray(raw) ? raw : raw?.files ?? raw?.loanFiles ?? [];
}

function summarize(files) {
  return files.map((f) => ({
    id: f.id,
    fileNumber: f.fileNumber,
    customerName: f.customerName,
    enterpriseDealId: f.enterpriseDealId ?? null,
    enterpriseOpportunityId: f.enterpriseOpportunityId ?? null,
    lenders: (f.lenders ?? []).map((l) => ({
      name: l.lender,
      caseStage: l.caseStage,
      lenderRegistryId: l.lenderRegistryId ?? null,
    })),
  }));
}

async function main() {
  const { dryRun, file } = parseArgs(process.argv.slice(2));
  console.log("CO-ARCH-005 Soft Go-Live → Deal Registry migration");
  console.log(`Mode: ${dryRun ? "DRY-RUN (pass --apply to write)" : "APPLY"}`);
  console.log(`localStorage key (browser): ${STORAGE_KEY}`);

  if (!file) {
    console.log(`
No --file provided.

Manual one-time steps:
  1. In browser DevTools → Application → Local Storage → copy value of "${STORAGE_KEY}"
  2. Save as scripts/fixtures/soft-golive-loan-files.json
  3. Re-run: node scripts/co-arch-005-soft-golive-to-deal-migration.mjs --file scripts/fixtures/soft-golive-loan-files.json --dry-run
  4. When inventory looks correct: add --apply

Operational runtime no longer reads Soft Go-Live for Deal Workspace / My Deals / Move to Deal.
Deals already in Enterprise Deal Registry need no import.
Only orphan Soft Go-Live rows without enterpriseDealId require create via authenticated API.
`);
    process.exit(0);
  }

  const files = loadFixture(file);
  const inventory = summarize(files);
  const orphans = inventory.filter((f) => !f.enterpriseDealId);
  const alreadyLinked = inventory.filter((f) => f.enterpriseDealId);

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    total: inventory.length,
    alreadyLinked: alreadyLinked.length,
    orphansNeedingImport: orphans.length,
    inventory,
  };

  const outPath = resolve(
    process.cwd(),
    "docs/co-arch-001/CO-ARCH-005-SOFT-GOLIVE-MIGRATION-INVENTORY.json",
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Wrote inventory: ${outPath}`);
  console.log(
    `Summary: ${inventory.length} Soft Go-Live rows · ${alreadyLinked.length} already linked · ${orphans.length} orphans`,
  );

  if (dryRun) {
    console.log("Dry-run complete — no Registry writes.");
    return;
  }

  if (orphans.length === 0) {
    console.log("Nothing to import — all Soft Go-Live rows already have enterpriseDealId.");
    return;
  }

  console.log(`
APPLY mode: ${orphans.length} orphan(s) listed.
Automated create requires authenticated browser session (Move to Deal / Deal API).
Export orphans and create via Enterprise Deal API with opportunityId + lenderId (BI-2/BI-3).
This script stops at inventory for safety — do not invent Opportunity/Lender links.
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
