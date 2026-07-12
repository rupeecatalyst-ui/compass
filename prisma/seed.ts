import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/utils/password";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword("Admin@123");

  await prisma.user.upsert({
    where: { email: "admin@compass.com" },
    update: {
      passwordHash,
      firstName: "Business",
      lastName: "Certification Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      email: "admin@compass.com",
      passwordHash,
      firstName: "Business",
      lastName: "Certification Admin",
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Seeded Business Certification Admin: admin@compass.com / Admin@123 (SUPER_ADMIN)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
