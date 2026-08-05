/**
 * CO-WP-LENDER-SSOT-001 — optional live registry check for "axis".
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rows = await prisma.enterpriseLender.findMany({
    where: {
      isDeleted: false,
      OR: [
        { displayName: { contains: "axis", mode: "insensitive" } },
        { label: { contains: "axis", mode: "insensitive" } },
        { legalName: { contains: "axis", mode: "insensitive" } },
        { shortName: { contains: "axis", mode: "insensitive" } },
        { code: { contains: "axis", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      code: true,
      displayName: true,
      label: true,
      status: true,
      enabled: true,
      lifecycleStatus: true,
      operationalStatus: true,
    },
    take: 20,
  });
  console.log("AXIS_MATCH_COUNT", rows.length);
  console.log(JSON.stringify(rows, null, 2));
  const visible = rows.filter(
    (r) =>
      r.status === "active" &&
      r.enabled === true &&
      r.lifecycleStatus === "active" &&
      r.operationalStatus === "active",
  );
  console.log("AXIS_PARTNER_VISIBLE", visible.length);
  console.log(
    "VISIBLE_NAMES",
    visible.map((r) => r.displayName || r.label),
  );
} catch (err) {
  console.error("DB_ERR", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
