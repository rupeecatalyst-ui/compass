/**
 * CO-STAB-001 — Check whether VERIFY_ADMIN_PASSWORD matches the bootstrap admin hash.
 * Usage: VERIFY_ADMIN_PASSWORD=... node scripts/co-blocker-001-password-check.mjs
 */
import { requireEnv } from "./_lib/require-env.mjs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = (process.env.VERIFY_ADMIN_EMAIL || "admin@rupeecatalyst.com").trim().toLowerCase();
const password = requireEnv("VERIFY_ADMIN_PASSWORD");

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("No user found for", email);
    process.exit(1);
  }

  console.log("User:", user.id, user.role, "mustChangePassword:", user.mustChangePassword);
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log(`Password match (${password.slice(0, 2)}***):`, ok);
  process.exit(ok ? 0 : 2);
} finally {
  await prisma.$disconnect();
}
