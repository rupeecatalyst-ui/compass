/**
 * P0 integrity — Enterprise Deal Registry inventory (no secrets printed).
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function projectRef(url) {
  if (!url) return null;
  const u = url.match(/postgres\.([a-z0-9]+):/i);
  if (u?.[1]) return u[1];
  try {
    const host = new URL(url).hostname;
    const m =
      host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i) ||
      host.match(/^([a-z0-9]+)\.pooler\.supabase\.com$/i);
    if (m?.[1]) return m[1];
  } catch {
    /* ignore */
  }
  return null;
}

function startOfTodayIST() {
  // IST = UTC+5:30 — "today" relative to report generation in India
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  // Midnight IST as UTC
  return new Date(Date.UTC(y, m, d) - istOffsetMs);
}

(async () => {
  const ref = projectRef(process.env.DATABASE_URL);
  const report = {
    source: "local_.env.local_DATABASE_URL",
    projectRef: ref,
    persistenceMode: process.env.ENTERPRISE_PERSISTENCE_MODE || null,
    publicPersistenceMode: process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE || null,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    report.connected = true;

    const total = await prisma.enterpriseDeal.count();
    const active = await prisma.enterpriseDeal.count({
      where: { isDeleted: false, archived: false },
    });
    const deleted = await prisma.enterpriseDeal.count({ where: { isDeleted: true } });
    const archived = await prisma.enterpriseDeal.count({ where: { archived: true } });

    const all = await prisma.enterpriseDeal.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        dealNumber: true,
        legacyLoanFileId: true,
        primaryContactName: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        isDeleted: true,
        archived: true,
        grossStage: true,
        lifecycleStatus: true,
      },
    });

    const todayStart = startOfTodayIST();
    const createdToday = all.filter((d) => d.createdAt >= todayStart);

    report.counts = { total, active, deleted, archived };
    report.deals = all.map((d) => ({
      id: d.id,
      dealNumber: d.dealNumber,
      legacyLoanFileId: d.legacyLoanFileId,
      borrower: d.primaryContactName,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      createdBy: d.createdBy,
      updatedBy: d.updatedBy,
      isDeleted: d.isDeleted,
      archived: d.archived,
      grossStage: d.grossStage,
      lifecycleStatus: d.lifecycleStatus,
    }));
    report.todayStartIstAsUtc = todayStart.toISOString();
    report.createdTodayCount = createdToday.length;
    report.createdToday = createdToday.map((d) => ({
      id: d.id,
      dealNumber: d.dealNumber,
      borrower: d.primaryContactName,
      createdAt: d.createdAt.toISOString(),
      createdBy: d.createdBy,
      isDeleted: d.isDeleted,
      archived: d.archived,
    }));

    // dual-write / integrity markers
    const integrity = all.filter(
      (d) =>
        (d.createdBy || "").includes("co-p0") ||
        (d.dealNumber || "").startsWith("P0-") ||
        (d.legacyLoanFileId || "").startsWith("p0-"),
    );
    report.integrityTestDeals = integrity.map((d) => d.dealNumber);
  } catch (e) {
    report.connected = false;
    report.error = e.message;
  }

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
})();
