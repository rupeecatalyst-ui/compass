/**
 * CO-BUG-117 — Issue a new temporary password for an existing user (ops recovery).
 * Prints the temp password once to stdout. Does not email.
 *
 * Usage:
 *   node --env-file=.env.local scripts/co-bug-117-reset-temp-password.cjs ketan@rupeecatalyst.com
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const bytes = crypto.randomBytes(14);
  for (let i = 0; i < 14; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

async function main() {
  const emailArg = (process.argv[2] || "").trim().toLowerCase();
  if (!emailArg || !emailArg.includes("@")) {
    console.error("Usage: node scripts/co-bug-117-reset-temp-password.cjs <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: emailArg } });
  if (!user) {
    console.error("USER_NOT_FOUND", emailArg);
    process.exit(2);
  }
  if (!user.isActive) {
    console.error("USER_INACTIVE", emailArg);
    process.exit(3);
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  console.log(
    JSON.stringify(
      {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: true,
        temporaryPassword,
        note: "Share securely. First login requires password change.",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
