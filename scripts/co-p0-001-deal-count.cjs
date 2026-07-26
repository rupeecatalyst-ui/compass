const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const count = await p.enterpriseDeal.count();
  const active = await p.enterpriseDeal.count({
    where: { isDeleted: false, archived: false },
  });
  const sample = await p.enterpriseDeal.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      dealNumber: true,
      legacyLoanFileId: true,
      createdAt: true,
      isDeleted: true,
      archived: true,
    },
  });
  console.log(JSON.stringify({ count, active, sample }, null, 2));
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
