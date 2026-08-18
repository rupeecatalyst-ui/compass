/**
 * CO-C1-PDC-SCHEDULE-REPAIR-001
 * Restore missing pending PDC schedules for historical Disbursed Deals.
 *
 * Default: DRY RUN (no writes).
 * Writes require explicit --execute (do not use until Product Owner authorises).
 *
 * Does not update EnterpriseDeal. Does not run the PDC cron / stage transition.
 *
 * Runtime: this file is plain Node ESM. The repair implementation is TypeScript
 * that uses tsconfig aliases (`@server/*`, `@/*`). Load it through tsx so
 * `node scripts/co-c1-pdc-schedule-repair-001.mjs` resolves those aliases —
 * the same mechanism as `node --import tsx` / `npm run repair:co-c1-pdc-schedule-001:dry-run`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = path.join(root, ".env.local");
if (fs.existsSync(envLocal) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envLocal);
}

const {
  applyHistoricalPdcScheduleRepair,
  planHistoricalPdcScheduleRepair,
} = await tsImport(
  "../server/services/post-disbursement-confirmation/historical-schedule-repair.ts",
  import.meta.url,
);

const execute = process.argv.includes("--execute");

const plan = await planHistoricalPdcScheduleRepair();
const result = execute ? await applyHistoricalPdcScheduleRepair(plan) : plan;

console.log(
  execute
    ? "CO-C1-PDC-SCHEDULE-REPAIR-001 EXECUTE"
    : "CO-C1-PDC-SCHEDULE-REPAIR-001 DRY RUN",
);
console.log(
  JSON.stringify(
    {
      dryRun: result.dryRun,
      scannedDisbursedDeals: result.scannedDisbursedDeals,
      candidates: result.candidates.length,
      existingSchedulesExcluded: result.existingSchedulesExcluded,
      unresolvedClock: result.unresolvedClock,
      candidateDeals: result.candidates.map((row) => ({
        dealNumber: row.dealNumber,
        dealId: row.dealId,
        source: row.source,
        originalDisbursedTransitionAt: row.originalDisbursedTransitionAt,
        dueAt: row.dueAt,
        dueAtAlreadyElapsed: row.dueAtAlreadyElapsed,
        action: row.action,
      })),
      excludedExisting: result.skippedExisting.map((row) => ({
        dealNumber: row.dealNumber,
        status: row.existingStatus,
        dueAt: row.existingDueAt,
      })),
      unresolved: result.skippedUnresolved.map((row) => ({
        dealNumber: row.dealNumber,
        reason: row.reason,
      })),
    },
    null,
    2,
  ),
);
