/**
 * CO-BUG-117 — Verify email normalization + bcrypt login path (no password secrets printed).
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const mixed = "Ketan@RupeeCatalyst.com";
  const normalized = mixed.trim().toLowerCase();

  const beforeFix = await prisma.user.findUnique({ where: { email: mixed } });
  const afterFix = await prisma.user.findUnique({ where: { email: normalized } });

  console.log(
    JSON.stringify(
      {
        mixed_case_lookup_found: Boolean(beforeFix),
        normalized_lookup_found: Boolean(afterFix),
        email: afterFix?.email ?? null,
        role: afterFix?.role ?? null,
        isActive: afterFix?.isActive ?? null,
        mustChangePassword: afterFix?.mustChangePassword ?? null,
        hasPasswordHash: Boolean(afterFix?.passwordHash),
        hashLooksBcrypt: Boolean(afterFix?.passwordHash?.startsWith("$2")),
        case_bug_reproduced: !beforeFix && Boolean(afterFix),
      },
      null,
      2,
    ),
  );

  // Sanity: bcrypt round-trip with a throwaway password (not persisted)
  const sample = "TempCheck9!";
  const hash = await bcrypt.hash(sample, 12);
  const ok = await bcrypt.compare(sample, hash);
  const bad = await bcrypt.compare("wrong-password", hash);
  console.log(JSON.stringify({ bcrypt_roundtrip_ok: ok, bcrypt_rejects_wrong: !bad }, null, 2));
}

main()
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
