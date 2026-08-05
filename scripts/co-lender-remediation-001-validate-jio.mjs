/**
 * CO-LENDER-REMEDIATION-001 — read-only validation after Jio create.
 * Usage: node --env-file=.env.local scripts/co-lender-remediation-001-validate-jio.mjs
 */

import { PrismaClient } from "@prisma/client";

const LABEL = "Jio Financial Services";
const prisma = new PrismaClient();

async function main() {
  const lender = await prisma.enterpriseLender.findFirst({
    where: {
      isDeleted: false,
      OR: [
        { label: { equals: LABEL, mode: "insensitive" } },
        { displayName: { equals: LABEL, mode: "insensitive" } },
      ],
    },
  });
  if (!lender) {
    console.log(JSON.stringify({ ok: false, reason: "Jio Financial Services not found" }));
    process.exitCode = 1;
    return;
  }

  const programs = await prisma.enterpriseLenderProgram.count({
    where: { lenderId: lender.id, isDeleted: false },
  });
  const contacts = await prisma.enterpriseLenderContact.count({
    where: { lenderId: lender.id, deletedAt: null },
  });
  const documents = await prisma.enterpriseLenderDocument.count({
    where: { lenderId: lender.id, deletedAt: null },
  });
  const deals = await prisma.enterpriseDeal.count({
    where: { lenderId: lender.id },
  });

  const selectionEligible =
    lender.enabled === true &&
    lender.status === "active" &&
    lender.lifecycleStatus === "active" &&
    !lender.isDeleted;

  console.log(
    JSON.stringify(
      {
        ok: true,
        lender: {
          id: lender.id,
          code: lender.code,
          label: lender.label,
          displayName: lender.displayName,
          status: lender.status,
          enabled: lender.enabled,
          lifecycleStatus: lender.lifecycleStatus,
          operationalStatus: lender.operationalStatus,
          institutionCategory: lender.institutionCategory,
          productsSupported: lender.productsSupported,
        },
        children: { programs, contacts, documents, deals },
        selectionEligible,
        notes: [
          "Child programs/policies/contacts/employees/deals start empty until configured against this Enterprise Lender ID.",
          "Wealth Partner / Deal / BT selectors consume ELR id when selectionEligible=true.",
          "Employees bind via ECM roleProfiles.lender_employee.institution = this id.",
        ],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("ERR", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
