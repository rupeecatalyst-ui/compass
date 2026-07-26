const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const orgs = await p.organization.findMany({
    select: { slug: true, name: true, isActive: true },
  });
  const users = await p.user.findMany({
    select: { email: true, role: true, isActive: true, mustChangePassword: true },
    orderBy: { email: "asc" },
  });
  console.log(JSON.stringify({ orgs, users }, null, 2));
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
