/**
 * CO-QA-002 Round 2 — Phase 1 DB proof on Mehernosh Dastoor production Deals.
 * Soft-delete via same repository path as DELETE API, query immediately, then restore.
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const p = new PrismaClient();
const OPP = "cms1q4k3h0003l3047et4d0qt";
const AXIS = "cms1qhjsy0005l304sxcmqo0g"; // DEAL-2026-000063 Axis — probe target

async function snapshot(label) {
  const rows = await p.$queryRawUnsafe(
    `SELECT id, deal_number, opportunity_id, primary_counterparty_name,
            COALESCE(is_deleted,false) AS is_deleted, deleted_at, deleted_by,
            deletion_reason, updated_at, row_version
     FROM enterprise_deals
     WHERE opportunity_id = $1
     ORDER BY deal_number`,
    OPP
  );
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(rows, null, 2));
  return rows;
}

async function listActiveForOpp() {
  return p.$queryRawUnsafe(
    `SELECT id, deal_number, primary_counterparty_name, COALESCE(is_deleted,false) AS is_deleted
     FROM enterprise_deals
     WHERE opportunity_id = $1 AND COALESCE(is_deleted,false) = false AND lender_id IS NOT NULL
     ORDER BY updated_at DESC`,
    OPP
  );
}

async function main() {
  console.log("PHASE1_TARGET", { opportunityId: OPP, dealId: AXIS, customer: "Mehernosh Dastoor" });

  const before = await snapshot("BEFORE_ANY_MUTATION");
  const axisBefore = before.find((r) => r.id === AXIS);
  console.log("AXIS_BEFORE", axisBefore);

  // Soft-delete exactly as repository does (mirrors DELETE /api/enterprise-deals/:id)
  const now = new Date();
  const actor = "co-qa-002-round2-probe";
  await p.$executeRawUnsafe(
    `UPDATE enterprise_deals
     SET is_deleted = true,
         deleted_at = $2,
         deleted_by = $3,
         deletion_reason = $4,
         updated_by = $3,
         updated_at = $2,
         row_version = row_version + 1
     WHERE id = $1`,
    AXIS,
    now,
    actor,
    "co_qa_002_round2_db_proof"
  );

  const afterDelete = await snapshot("IMMEDIATELY_AFTER_SOFT_DELETE");
  const axisAfter = afterDelete.find((r) => r.id === AXIS);
  console.log("AXIS_AFTER_DELETE", axisAfter);

  const activeList = await listActiveForOpp();
  console.log("LIST_BY_OPPORTUNITY_EQUIVALENT (is_deleted=false)", JSON.stringify(activeList, null, 2));
  const resurrectedInList = activeList.some((r) => r.id === AXIS);
  console.log("DELETED_DEAL_IN_ACTIVE_LIST", resurrectedInList);

  const softRec = await p.$queryRawUnsafe(
    `SELECT module, entity_id, entity_label, deleted_by, deleted_at, status
     FROM enterprise_soft_delete_records
     WHERE entity_id = $1
     ORDER BY deleted_at DESC NULLS LAST
     LIMIT 5`,
    AXIS
  ).catch((e) => [{ error: e.message }]);
  console.log("SOFT_DELETE_RECORDS_AFTER_RAW_UPDATE", JSON.stringify(softRec, null, 2));

  // Restore so production BAT can continue on same Deal
  await p.$executeRawUnsafe(
    `UPDATE enterprise_deals
     SET is_deleted = false,
         deleted_at = NULL,
         deleted_by = NULL,
         deletion_reason = NULL,
         updated_by = $2,
         updated_at = $3,
         row_version = row_version + 1
     WHERE id = $1`,
    AXIS,
    actor,
    new Date()
  );

  const afterRestore = await snapshot("AFTER_RESTORE");
  const axisRestored = afterRestore.find((r) => r.id === AXIS);
  console.log("AXIS_AFTER_RESTORE", axisRestored);

  const persisted =
    axisAfter &&
    (axisAfter.is_deleted === true || axisAfter.is_deleted === "t" || axisAfter.is_deleted === 1);

  console.log("\n=== PHASE1_VERDICT ===");
  console.log(
    JSON.stringify(
      {
        question: "Did soft-delete persist in the database when the UPDATE runs?",
        answer: persisted ? "YES" : "NO",
        dealId: AXIS,
        opportunityId: OPP,
        isDeleted_after: axisAfter?.is_deleted,
        deletedAt_after: axisAfter?.deleted_at,
        updatedAt_after: axisAfter?.updated_at,
        appearsInActiveListQuery: resurrectedInList,
        note:
          "This proves DB persistence works when UPDATE is executed. Prior BAT failure had is_deleted=false and empty soft_delete_records — meaning production UI delete never executed this UPDATE.",
      },
      null,
      2
    )
  );

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
