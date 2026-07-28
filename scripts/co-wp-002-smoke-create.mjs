/**
 * CO-WP-002 — Smoke-create Wealth Partner then soft-delete (no Contact mutation).
 * Usage: node --env-file=.env.local scripts/co-wp-002-smoke-create.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnv() {
  const envFile = existsSync(".env.local") ? ".env.local" : ".env";
  const text = readFileSync(resolve(process.cwd(), envFile), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { slug: "rupee-catalyst" },
    select: { id: true },
  });
  if (!org) throw new Error("Pilot organization not found");

  const contact = await prisma.ecmContact.findFirst({
    where: { organizationId: org.id, isDeleted: false },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
  if (!contact) throw new Error("No contact available for smoke (read-only pick)");

  const already = await prisma.enterpriseWealthPartner.findFirst({
    where: {
      organizationId: org.id,
      contactId: contact.id,
      isDeleted: false,
    },
    select: { id: true, code: true },
  });
  if (already) {
    console.log("SKIP create — contact already WP:", already.code, already.id);
    return;
  }

  const created = await prisma.enterpriseWealthPartner.create({
    data: {
      organizationId: org.id,
      code: `WPTSMOKE${Date.now().toString().slice(-6)}`,
      displayName: contact.name || "Smoke Partner",
      partnerType: "referral_associate",
      identityKind: "contact",
      contactId: contact.id,
      identityLabel: contact.name,
      createdBy: "co-wp-002-smoke",
      modifiedBy: "co-wp-002-smoke",
    },
  });
  await prisma.enterpriseWealthPartnerActivity.create({
    data: {
      organizationId: org.id,
      wealthPartnerId: created.id,
      activityType: "created",
      title: "Smoke create",
      actorUserId: "co-wp-002-smoke",
    },
  });
  console.log("CREATE_OK", created.id, created.code);

  await prisma.enterpriseWealthPartner.update({
    where: { id: created.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: "co-wp-002-smoke",
      deletionReason: "CO-WP-002 smoke cleanup",
    },
  });
  console.log("SOFT_DELETE_OK", created.id);
}

main()
  .catch((e) => {
    console.error("SMOKE_FAILED", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
