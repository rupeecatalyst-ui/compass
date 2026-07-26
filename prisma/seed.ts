import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/utils/password";
import { ENTERPRISE_PERSISTENCE_ORG_SLUG } from "../src/constants/enterprise-persistence";

const prisma = new PrismaClient();

/**
 * Bootstrap Super Admin — temporary password for first login only.
 * CO-STAB-001 — password MUST come from BOOTSTRAP_SUPER_ADMIN_PASSWORD (never hardcoded).
 */
const BOOTSTRAP_SUPER_ADMIN_EMAIL =
  (process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? "admin@rupeecatalyst.com").trim().toLowerCase();

async function main() {
  const temporaryPassword = (process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? "").trim();
  if (!temporaryPassword || temporaryPassword.length < 12) {
    throw new Error(
      "[CO-STAB-001] BOOTSTRAP_SUPER_ADMIN_PASSWORD is required (min 12 characters). " +
        "Set it in the environment before running prisma seed.",
    );
  }

  const passwordHash = await hashPassword(temporaryPassword);

  await prisma.user.upsert({
    where: { email: BOOTSTRAP_SUPER_ADMIN_EMAIL },
    update: {
      passwordHash,
      firstName: "Business",
      lastName: "Certification Admin",
      role: "SUPER_ADMIN",
      isActive: true,
      employeeId: "RC-0001",
      department: "Administration",
      mustChangePassword: true,
    },
    create: {
      email: BOOTSTRAP_SUPER_ADMIN_EMAIL,
      passwordHash,
      firstName: "Business",
      lastName: "Certification Admin",
      role: "SUPER_ADMIN",
      employeeId: "RC-0001",
      department: "Administration",
      mustChangePassword: true,
    },
  });

  // Pilot organization — required for ECM rows. No demo contacts or companies.
  await prisma.organization.upsert({
    where: { slug: ENTERPRISE_PERSISTENCE_ORG_SLUG },
    update: { name: "Rupee Catalyst", isActive: true },
    create: {
      slug: ENTERPRISE_PERSISTENCE_ORG_SLUG,
      name: "Rupee Catalyst",
      isActive: true,
    },
  });

  console.log("");
  console.log("=== Catalyst One — Seed execution report (bootstrap only) ===");
  console.log(`Organization : Rupee Catalyst (slug=${ENTERPRISE_PERSISTENCE_ORG_SLUG})`);
  console.log(`Super Admin  : ${BOOTSTRAP_SUPER_ADMIN_EMAIL}`);
  console.log(`Role         : SUPER_ADMIN`);
  console.log(`Temp password: [set via BOOTSTRAP_SUPER_ADMIN_PASSWORD — not printed]`);
  console.log(`mustChangePassword: true`);
  console.log("Store the temporary password securely. The app will not display it.");
  console.log("No contacts, companies, loans, or demo business data were seeded.");
  console.log("==============================================================");
  console.log("");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
