/**
 * CO-P0-006 — verify Abhiraj Kapoor Deal in enterprise_deals (Pilot Postgres).
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const NAME = "Abhiraj Kapoor";

async function main() {
  const contacts = await prisma.ecmContact.findMany({
    where: { name: { contains: NAME, mode: "insensitive" } },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  const contactIds = contacts.map((c) => c.id);

  const dealsByName = await prisma.enterpriseDeal.findMany({
    where: {
      OR: [
        { primaryContactName: { contains: NAME, mode: "insensitive" } },
        { dealNumber: { equals: "OPP-2026-2004" } },
        { dealNumber: { contains: "2004", mode: "insensitive" } },
        { fileNumber: { contains: "2004", mode: "insensitive" } },
        { fileNumber: { equals: "OPP-2026-2004" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const dealsByContact =
    contactIds.length > 0
      ? await prisma.enterpriseDeal.findMany({
          where: { primaryContactId: { in: contactIds } },
          orderBy: { createdAt: "desc" },
          take: 25,
        })
      : [];

  const byId = new Map();
  for (const d of [...dealsByName, ...dealsByContact]) byId.set(d.id, d);
  const deals = [...byId.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const total = await prisma.enterpriseDeal.count();
  const activeTotal = await prisma.enterpriseDeal.count({
    where: { isDeleted: false },
  });

  const sqlRows = await prisma.$queryRawUnsafe(
    `SELECT id, deal_number, file_number, primary_contact_id, primary_contact_name,
            legacy_loan_file_id, created_at, updated_at, is_deleted, archived,
            product_label, created_by, requested_amount::float8 AS requested_amount
     FROM enterprise_deals
     WHERE primary_contact_name ILIKE $1
        OR deal_number ILIKE $2
        OR file_number ILIKE $2
        OR deal_number = $3
        OR file_number = $3
        OR (cardinality($4::text[]) > 0 AND primary_contact_id = ANY($4::text[]))
     ORDER BY created_at DESC
     LIMIT 25`,
    `%${NAME}%`,
    `%2004%`,
    "OPP-2026-2004",
    contactIds,
  );

  console.log(
    JSON.stringify(
      {
        query: NAME,
        source: "PostgreSQL via Prisma (DATABASE_URL from .env.local — Pilot)",
        enterprise_deals_total: total,
        enterprise_deals_active: activeTotal,
        matching_contacts: contacts.map((c) => ({
          id: c.id,
          name: c.name,
          mobilePrimary: c.mobilePrimary,
          createdAt: c.createdAt.toISOString(),
          organizationId: c.organizationId,
          isDeleted: c.isDeleted,
        })),
        matching_deals_prisma: deals.map((d) => ({
          id: d.id,
          dealNumber: d.dealNumber,
          fileNumber: d.fileNumber,
          primaryContactId: d.primaryContactId,
          primaryContactName: d.primaryContactName,
          primaryContactMobile: d.primaryContactMobile,
          legacyLoanFileId: d.legacyLoanFileId,
          productLabel: d.productLabel,
          requestedAmount: d.requestedAmount != null ? Number(d.requestedAmount) : null,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
          createdBy: d.createdBy,
          isDeleted: d.isDeleted,
          archived: d.archived,
          grossStage: d.grossStage,
        })),
        matching_deals_sql: sqlRows.map((r) => ({
          id: r.id,
          deal_number: r.deal_number,
          file_number: r.file_number,
          primary_contact_id: r.primary_contact_id,
          primary_contact_name: r.primary_contact_name,
          legacy_loan_file_id: r.legacy_loan_file_id,
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
          updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
          is_deleted: r.is_deleted,
          archived: r.archived,
          product_label: r.product_label,
          created_by: r.created_by,
          requested_amount: r.requested_amount,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
