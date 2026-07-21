import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();
const email = "admin@rupeecatalyst.com";
const candidates = [
  process.env.VERIFY_ADMIN_PASSWORD,
  "Rc7$mK9pL2#vNq4X",
  "Admin@123",
  "Compass@123",
].filter(Boolean);

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.log("No user found for", email);
  process.exit(1);
}

console.log("User:", user.id, user.role, "mustChangePassword:", user.mustChangePassword);

for (const pwd of candidates) {
  const ok = await bcrypt.compare(pwd, user.passwordHash);
  console.log(`Password match (${pwd?.slice(0, 3)}***):`, ok);
}

await prisma.$disconnect();
