/**
 * CO-C1-HEALTH-REMEDIATION-002 — read-only migration verification.
 * Prints table/index/FK/migration presence only — no secrets, no row dumps.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const migrationName = "20260811160000_co_notification_001_enterprise_notification";

  const migrationRows = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back
     FROM "_prisma_migrations"
     WHERE migration_name = $1`,
    migrationName,
  );

  const table = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.enterprise_notifications') IS NOT NULL AS exists`,
  );

  const indexes = await prisma.$queryRawUnsafe(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'enterprise_notifications'
     ORDER BY indexname`,
  );

  const fks = await prisma.$queryRawUnsafe(
    `SELECT conname
     FROM pg_constraint
     WHERE conname = 'enterprise_notifications_organization_id_fkey'`,
  );

  const sampleCounts = await prisma.$queryRawUnsafe(
    `SELECT
       (SELECT COUNT(*)::int FROM organizations) AS organizations_count,
       (SELECT COUNT(*)::int FROM enterprise_deals) AS enterprise_deals_count,
       CASE WHEN to_regclass('public.enterprise_notifications') IS NOT NULL
            THEN (SELECT COUNT(*)::int FROM enterprise_notifications)
            ELSE -1 END AS enterprise_notifications_count`,
  );

  const pendingLike = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS applied_migration_count FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`,
  );

  console.log(
    JSON.stringify(
      {
        migrationName,
        migrationRows,
        tableExists: table,
        indexes,
        fks,
        sampleCounts,
        pendingLike,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("VERIFY_FAILED", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
