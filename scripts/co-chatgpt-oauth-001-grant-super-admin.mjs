/**
 * CO-CHATGPT-OAUTH-001 — Grant AI capabilities to approved Super Admin only.
 * Usage: node --env-file=.env.local --import tsx scripts/co-chatgpt-oauth-001-grant-super-admin.mjs
 *
 * Never prints passwords or secret env values.
 */
import { PrismaClient } from "@prisma/client";
import { mergeAiCapabilityPatch, parseUserAiCapabilitiesJson } from "../src/lib/enterprise-ai-access/resolve.ts";

const prisma = new PrismaClient();

const TARGET_EMAILS = [
  process.env.CHATGPT_DEPLOY_SUPER_ADMIN_EMAIL?.trim().toLowerCase(),
  process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase(),
  "admin@rupeecatalyst.com",
  "admin@compass.com",
].filter(Boolean);

const GRANT = {
  AI_ACCESS: true,
  AI_TEXT: true,
  AI_VOICE: true,
  AI_CHANAKYA: true,
  AI_CATALYST_INTELLIGENCE: true,
  AI_ACTIONS: false,
};

async function main() {
  let user = null;
  for (const email of [...new Set(TARGET_EMAILS)]) {
    user = await prisma.user.findFirst({
      where: { email, role: "SUPER_ADMIN", isActive: true },
      select: { id: true, email: true, role: true, aiCapabilitiesJson: true },
    });
    if (user) break;
  }

  if (!user) {
    console.error("FAIL: No active SUPER_ADMIN found for approved deploy emails.");
    process.exit(1);
  }

  const current = parseUserAiCapabilitiesJson(user.aiCapabilitiesJson);
  const next = mergeAiCapabilityPatch(current, GRANT);

  await prisma.user.update({
    where: { id: user.id },
    data: { aiCapabilitiesJson: next },
  });

  console.log("PASS: AI capabilities granted to approved Super Admin");
  console.log(`  userId: ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  AI_ACCESS: ON`);
  console.log(`  AI_TEXT: ON`);
  console.log(`  AI_VOICE: ON`);
  console.log(`  AI_CHANAKYA: ON`);
  console.log(`  AI_CATALYST_INTELLIGENCE: ON`);
  console.log(`  AI_ACTIONS: OFF (forced)`);
}

main()
  .catch((err) => {
    console.error("FAIL:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
