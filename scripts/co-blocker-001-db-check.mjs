import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

const [contactCount, companyCount, recentContacts, recentCompanies] = await Promise.all([
  prisma.ecmContact.count({ where: { isDeleted: false } }),
  prisma.ecmCompany.count({ where: { isDeleted: false } }),
  prisma.ecmContact.findMany({
    where: { isDeleted: false },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, name: true, mobilePrimary: true, status: true, enabled: true },
  }),
  prisma.ecmCompany.findMany({
    where: { isDeleted: false },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, companyName: true, enabled: true, status: true },
  }),
]);

console.log(JSON.stringify({ contactCount, companyCount, recentContacts, recentCompanies }, null, 2));
await prisma.$disconnect();
