/**
 * CO-MASTER-005A — BC-3 one-time legacy invite product snapshot.
 * Additive only: creates LenderProgramPortalInviteProduct rows for invites with zero products.
 * Does not invent products. Stops and reports invites with no Matrix Product Master match.
 *
 * Usage: node --env-file=.env.local --import tsx scripts/co-master-005a-bc3-backfill.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { backfillLegacyInviteProductsBc3 } from "../server/services/lender-program-portal/invite-products.ts";

const prisma = new PrismaClient();
const root = process.cwd();
const reportDir = path.join(root, "docs", "co-master-005a");
const reportPath = path.join(reportDir, "CO-MASTER-005A-BC3-BACKFILL-REPORT.md");

async function main() {
  const result = await backfillLegacyInviteProductsBc3({ db: prisma });

  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const lines = [
    "# CO-MASTER-005A — BC-3 Legacy Invite Backfill Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Invites scanned | ${result.scanned} |`,
    `| Already scoped (skipped) | ${result.alreadyScoped} |`,
    `| Backfilled (Matrix snapshot) | ${result.backfilled} |`,
    `| Invite-product rows created | ${result.productRowsCreated} |`,
    `| Stopped (no mapped product) | ${result.stopped.length} |`,
    "",
    "## Stopped invitations (no invent)",
    "",
  ];

  if (result.stopped.length === 0) {
    lines.push("_None — every legacy invite without products had at least one Matrix Product Master match._", "");
  } else {
    lines.push(
      "| Invite ID | Token preview | Lender | Reason |",
      "| --- | --- | --- | --- |",
    );
    for (const row of result.stopped) {
      lines.push(
        `| \`${row.inviteId}\` | ${row.inviteTokenPreview} | ${row.lenderName} (\`${row.lenderId}\`) | ${row.reason} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Notes",
    "",
    "- Snapshot is one-time. Future Product–Lender Matrix changes do **not** expand these invitations.",
    "- Original invitation rows were preserved (no delete / truncate).",
    "",
  );

  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

  console.log("CO-MASTER-005A BC-3 backfill complete");
  console.log(`  scanned=${result.scanned}`);
  console.log(`  alreadyScoped=${result.alreadyScoped}`);
  console.log(`  backfilled=${result.backfilled}`);
  console.log(`  productRowsCreated=${result.productRowsCreated}`);
  console.log(`  stopped=${result.stopped.length}`);
  console.log(`  report=${path.relative(root, reportPath)}`);

  if (result.stopped.length > 0) {
    console.log("\nStopped invitations (require admin re-issue with products):");
    for (const row of result.stopped) {
      console.log(`  - ${row.inviteId} · ${row.lenderName} · ${row.reason}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("CO-MASTER-005A BC-3 backfill FAILED");
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
