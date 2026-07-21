import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const user = await p.user.findUnique({
  where: { email: "admin@rupeecatalyst.com" },
  select: {
    id: true,
    email: true,
    role: true,
    isActive: true,
    mustChangePassword: true,
    firstName: true,
    lastName: true,
    createdAt: true,
  },
});
console.log(JSON.stringify(user, null, 2));
await p.$disconnect();
