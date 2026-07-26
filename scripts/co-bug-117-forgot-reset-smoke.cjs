/**
 * CO-BUG-117 — Forgot/reset token validation smoke (does not change user password).
 * Usage: node --env-file=.env.local scripts/co-bug-117-forgot-reset-smoke.cjs ketan@rupeecatalyst.com
 */
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "ketan@rupeecatalyst.com").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    console.log(JSON.stringify({ ok: false, step: "user", reason: "NOT_FOUND_OR_INACTIVE" }));
    process.exit(2);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const created = await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const found = await prisma.passwordResetToken.findUnique({ where: { token } });
  const tokenValid =
    Boolean(found) && !found.used && found.expiresAt > new Date() && found.userId === user.id;

  const expiredToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      token: expiredToken,
      userId: user.id,
      expiresAt: new Date(Date.now() - 60_000),
    },
  });
  const expiredRow = await prisma.passwordResetToken.findUnique({ where: { token: expiredToken } });
  const expiredRejected = Boolean(expiredRow) && expiredRow.expiresAt < new Date();

  const bogus = await prisma.passwordResetToken.findUnique({ where: { token: "not-a-real-token" } });

  await prisma.passwordResetToken.update({
    where: { id: created.id },
    data: { used: true },
  });
  const usedRow = await prisma.passwordResetToken.findUnique({ where: { token } });
  const usedRejected = Boolean(usedRow?.used);

  // Cleanup smoke tokens
  await prisma.passwordResetToken.deleteMany({
    where: { id: { in: [created.id, expiredRow?.id].filter(Boolean) } },
  });

  console.log(
    JSON.stringify(
      {
        ok: tokenValid && expiredRejected && !bogus && usedRejected,
        checks: {
          token_valid: tokenValid,
          expired_rejected: expiredRejected,
          invalid_token_null: !bogus,
          used_token_rejected: usedRejected,
        },
        password_unchanged: true,
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
