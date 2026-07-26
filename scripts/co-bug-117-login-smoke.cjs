/**
 * CO-BUG-117 — Functional login check (password via argv; result only).
 * node --env-file=.env.local scripts/co-bug-117-login-smoke.cjs <email> <password>
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const password = process.argv[3] || "";
  if (!email || !password) {
    console.error("Usage: node scripts/co-bug-117-login-smoke.cjs <email> <password>");
    process.exit(1);
  }

  const mixedLookup = await prisma.user.findUnique({
    where: { email: process.argv[2].trim() },
  });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(JSON.stringify({ ok: false, reason: "USER_NOT_FOUND" }));
    process.exit(2);
  }
  if (!user.isActive) {
    console.log(JSON.stringify({ ok: false, reason: "INACTIVE" }));
    process.exit(3);
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  console.log(
    JSON.stringify({
      ok: valid,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      mixed_case_would_fail_before_fix: !mixedLookup && process.argv[2] !== email,
      reason: valid ? "CREDENTIALS_OK" : "BAD_PASSWORD",
    }),
  );
  process.exit(valid ? 0 : 4);
}

main()
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
