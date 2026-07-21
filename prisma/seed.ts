import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/utils/password";
import { ENTERPRISE_PERSISTENCE_ORG_SLUG } from "../src/constants/enterprise-persistence";

const prisma = new PrismaClient();

/**
 * Bootstrap Super Admin — temporary password for first login only.
 * Shown once in the seed console report. Account forces password change.
 * Do not reuse as a long-lived credential.
 */
const BOOTSTRAP_SUPER_ADMIN_EMAIL = "admin@rupeecatalyst.com";
const BOOTSTRAP_TEMPORARY_PASSWORD = "Rc7$mK9pL2#vNq4X";

async function main() {
  const passwordHash = await hashPassword(BOOTSTRAP_TEMPORARY_PASSWORD);

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
  console.log(`Temp password: ${BOOTSTRAP_TEMPORARY_PASSWORD}`);
  console.log(`mustChangePassword: true`);
  console.log("Store this temporary password securely. It will not be shown again by the app.");
  console.log("No contacts, companies, loans, or demo business data were seeded.");
  console.log("==============================================================");
  console.log("");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
