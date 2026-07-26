const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const c = await p.ecmContact.findUnique({
    where: { id: "cmrxqpxin0001jr041rajq1om" },
  });
  const deals = await p.enterpriseDeal.count();
  const seq = await p.enterpriseDealNumberSequence.findMany({ take: 10 });
  const anyDeal = await p.$queryRawUnsafe(
    "SELECT COUNT(*)::int AS c FROM enterprise_deals WHERE primary_contact_id = $1 OR primary_contact_name ILIKE $2",
    "cmrxqpxin0001jr041rajq1om",
    "%Abhiraj Kapoor%",
  );
  console.log(
    JSON.stringify(
      {
        contact: c && {
          id: c.id,
          name: c.name,
          createdAt: c.createdAt.toISOString(),
          createdBy: c.createdBy,
        },
        enterprise_deals_count: deals,
        deals_for_abhiraj: anyDeal,
        deal_number_sequences: seq.map((s) => ({
          organizationId: s.organizationId,
          year: s.year,
          nextValue: s.nextValue,
        })),
      },
      null,
      2,
    ),
  );
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
