/**
 * CO-LENDER-REMEDIATION-001 P0-B
 * Create "Jio Financial Services" via Prisma Enterprise Lender Registry (production SSOT).
 * Does NOT recover Soft Go-Live ghost records. Idempotent by display/legal name.
 *
 * Usage: node --env-file=.env.local scripts/co-lender-remediation-001-create-jio.mjs
 */

import { PrismaClient } from "@prisma/client";

const LABEL = "Jio Financial Services";
const ACTOR = "system-co-lender-remediation-001";
const ORG_SLUG = process.env.ENTERPRISE_PERSISTENCE_ORG_SLUG || "rupee-catalyst";

const prisma = new PrismaClient();

function allocateCode(existingCodes) {
  const used = new Set(
    existingCodes.map((c) => String(c || "").toUpperCase()).filter(Boolean),
  );
  for (let i = 1; i < 1_000_000; i++) {
    const code = `LND${String(i).padStart(6, "0")}`;
    if (!used.has(code)) return code;
  }
  throw new Error("Unable to allocate lender code.");
}

async function resolveOrganizationId() {
  const org =
    (await prisma.organization.findUnique({
      where: { slug: ORG_SLUG },
      select: { id: true, slug: true, name: true },
    })) ||
    (await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, name: true },
    }));
  if (!org) throw new Error("No organization found.");
  return org;
}

async function main() {
  const existing = await prisma.enterpriseLender.findFirst({
    where: {
      isDeleted: false,
      OR: [
        { label: { equals: LABEL, mode: "insensitive" } },
        { displayName: { equals: LABEL, mode: "insensitive" } },
        { legalName: { equals: LABEL, mode: "insensitive" } },
        { legalName: { equals: "Jio Financial Services Limited", mode: "insensitive" } },
      ],
    },
  });

  if (existing) {
    console.log(
      JSON.stringify(
        {
          status: "already_exists",
          id: existing.id,
          code: existing.code,
          label: existing.label,
          displayName: existing.displayName,
          statusField: existing.status,
          enabled: existing.enabled,
          lifecycleStatus: existing.lifecycleStatus,
        },
        null,
        2,
      ),
    );
    return;
  }

  const org = await resolveOrganizationId();
  const category =
    (await prisma.enterpriseLenderCategory.findFirst({
      where: {
        organizationId: org.id,
        enabled: true,
        status: "active",
        isDeleted: false,
      },
      orderBy: { sortOrder: "asc" },
    })) ||
    (await prisma.enterpriseLenderCategory.findFirst({
      where: { organizationId: org.id, isDeleted: false },
      orderBy: { sortOrder: "asc" },
    }));
  if (!category) {
    throw new Error(`No lender category for organization ${org.id} (${org.slug}).`);
  }

  const codes = await prisma.enterpriseLender.findMany({
    where: { organizationId: org.id },
    select: { code: true },
  });
  const code = allocateCode(codes.map((r) => r.code));

  const created = await prisma.enterpriseLender.create({
    data: {
      organizationId: org.id,
      categoryId: category.id,
      code,
      label: LABEL,
      legalName: "Jio Financial Services Limited",
      displayName: LABEL,
      shortName: "Jio Financial",
      aliases: ["Jio Finance", "JFS"],
      institutionCategory: "nbfc",
      classification: "nbfc",
      lifecycleStatus: "active",
      operationalStatus: "active",
      status: "active",
      enabled: true,
      rbiRegulated: true,
      panIndia: true,
      productsSupported: [],
      headquartersLabel: "Mumbai",
      website: "https://www.jiofinancialservices.com",
      createdBy: ACTOR,
      modifiedBy: ACTOR,
    },
  });

  console.log(
    JSON.stringify(
      {
        status: "created",
        id: created.id,
        code: created.code,
        label: created.label,
        displayName: created.displayName,
        organizationId: org.id,
        organizationSlug: org.slug,
        categoryId: category.id,
        lifecycleStatus: created.lifecycleStatus,
        enabled: created.enabled,
        statusField: created.status,
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
