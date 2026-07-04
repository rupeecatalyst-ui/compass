import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/utils/password";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword("Compass@123");

  await prisma.user.upsert({
    where: { email: "admin@compass.dev" },
    update: {},
    create: {
      email: "admin@compass.dev",
      passwordHash,
      firstName: "Platform",
      lastName: "Admin",
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Seeded admin user: admin@compass.dev / Compass@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
