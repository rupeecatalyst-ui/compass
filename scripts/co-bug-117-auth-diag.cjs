/**
 * CO-BUG-117 — Diagnose user account (no password hashes printed).
 * Usage: node --env-file=.env.local scripts/co-bug-117-auth-diag.mjs
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const ketan = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "ketan", mode: "insensitive" } },
        { firstName: { contains: "Ketan", mode: "insensitive" } },
      ],
    },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });
  console.log("ketan_matches", JSON.stringify(ketan, null, 2));

  const byEmailExact = await prisma.user.findUnique({
    where: { email: "ketan@rupeecatalyst.com" },
    select: {
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log("exact_lowercase", byEmailExact);

  const byEmailMixed = await prisma.user.findUnique({
    where: { email: "Ketan@RupeeCatalyst.com" },
    select: {
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log("exact_mixed_case", byEmailMixed);

  const recent = await prisma.user.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log("recent_users", JSON.stringify(recent, null, 2));

  const total = await prisma.user.count();
  const active = await prisma.user.count({ where: { isActive: true } });
  console.log("totals", { total, active });
}

main()
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
