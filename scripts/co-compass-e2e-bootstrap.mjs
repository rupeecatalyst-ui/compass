#!/usr/bin/env node
/**
 * CO-COMPASS-E2E-BOOTSTRAP — isolated Prisma dev / local Postgres only.
 * Creates COMPASS E2E test org + bootstrap admin. Never targets production remotes.
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const E2E_ORG_SLUG = "compass-e2e-test";
const E2E_ORG_NAME = "COMPASS E2E Test";

const databaseUrl = process.env.DATABASE_URL?.trim() || "";
if (!databaseUrl) {
  console.error("BLOCKED: DATABASE_URL is required.");
  process.exit(2);
}

const host = (() => {
  try {
    const u = new URL(databaseUrl.replace(/^prisma\+/, ""));
    return u.hostname;
  } catch {
    return "";
  }
})();

if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(
    `BLOCKED: DATABASE_URL host "${host || "unknown"}" is not local. Refusing bootstrap.`,
  );
  process.exit(2);
}

if (/supabase\.com|pooler\.supabase/i.test(databaseUrl)) {
  console.error("BLOCKED: remote Supabase URLs are not permitted for COMPASS E2E bootstrap.");
  process.exit(2);
}

const prisma = new PrismaClient();
const bootstrapEmail = (process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? "compass-e2e-admin@local.test")
  .trim()
  .toLowerCase();
const bootstrapPassword =
  process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD?.trim() ||
  randomBytes(24).toString("base64url");

try {
  const { hashPassword } = await import("../server/utils/password.ts");
  const passwordHash = await hashPassword(bootstrapPassword);

  await prisma.user.upsert({
    where: { email: bootstrapEmail },
    update: {
      passwordHash,
      firstName: "COMPASS",
      lastName: "E2E Admin",
      role: "SUPER_ADMIN",
      isActive: true,
      employeeId: "E2E-0001",
      department: "E2E",
      mustChangePassword: false,
    },
    create: {
      email: bootstrapEmail,
      passwordHash,
      firstName: "COMPASS",
      lastName: "E2E Admin",
      role: "SUPER_ADMIN",
      employeeId: "E2E-0001",
      department: "E2E",
      mustChangePassword: false,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: E2E_ORG_SLUG },
    update: { name: E2E_ORG_NAME, isActive: true },
    create: { slug: E2E_ORG_SLUG, name: E2E_ORG_NAME, isActive: true },
  });

  console.log("CO-COMPASS-E2E-BOOTSTRAP: PASS");
  console.log(`organizationSlug=${E2E_ORG_SLUG}`);
  console.log(`organizationId=${org.id}`);
  console.log(`adminEmail=${bootstrapEmail}`);
  console.log(`databaseHost=${host}`);
  console.log(`databaseFingerprint=${createHash("sha256").update(databaseUrl).digest("hex").slice(0, 16)}`);
} catch (error) {
  console.error("CO-COMPASS-E2E-BOOTSTRAP: FAIL");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
