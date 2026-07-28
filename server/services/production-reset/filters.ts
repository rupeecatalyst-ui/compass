/**
 * CO-ADMIN-004 / CO-CUTOVER-001 — Demo / cutover filter builders (Prisma where fragments).
 * Demo heuristics target seed/demo/test markers only — never wipe unmarked live production.
 */

import type { Prisma } from "@prisma/client";
import type { ProductionResetFilters } from "@/types/production-reset";

const DEMO_PREFIX_RE = /^(demo|test|uat|sample|training)[\s\-_/]/i;

/** Creators used by in-app demo seed paths (never treat as live production authors). */
export const DEMO_SEED_CREATED_BY = ["demo-seed", "demo_seed", "system-demo"] as const;

export function parseCreatedBefore(filters: ProductionResetFilters): Date | null {
  if (!filters.createdBefore) return null;
  const d = new Date(filters.createdBefore);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function opportunityWhere(
  organizationIds: string[],
  filters: ProductionResetFilters,
): Prisma.EnterpriseOpportunityWhereInput {
  const and: Prisma.EnterpriseOpportunityWhereInput[] = [
    { organizationId: { in: organizationIds } },
    { isDeleted: false },
  ];
  const before = parseCreatedBefore(filters);
  if (before) and.push({ createdAt: { lte: before } });
  if (filters.createdByUserIds?.length) {
    and.push({ createdBy: { in: filters.createdByUserIds } });
  }
  if (filters.opportunityPrefixes?.length) {
    and.push({
      OR: filters.opportunityPrefixes.map((p) => ({
        opportunityNumber: { startsWith: p, mode: "insensitive" },
      })),
    });
  }
  if (filters.demoHeuristics) {
    and.push({
      OR: [
        { opportunityNumber: { startsWith: "DEMO", mode: "insensitive" } },
        { opportunityNumber: { startsWith: "TEST", mode: "insensitive" } },
        { opportunityNumber: { startsWith: "UAT", mode: "insensitive" } },
        { opportunityNumber: { startsWith: "SAMPLE", mode: "insensitive" } },
        { primaryContactName: { startsWith: "Demo", mode: "insensitive" } },
        { primaryContactName: { startsWith: "Test", mode: "insensitive" } },
        { companyName: { startsWith: "Demo", mode: "insensitive" } },
        { createdBy: { in: [...DEMO_SEED_CREATED_BY] } },
        { primaryContactEmail: { contains: ".demo", mode: "insensitive" } },
        { primaryContactEmail: { contains: "demo@", mode: "insensitive" } },
      ],
    });
  }
  return { AND: and };
}

export function dealWhere(
  organizationIds: string[],
  filters: ProductionResetFilters,
): Prisma.EnterpriseDealWhereInput {
  const and: Prisma.EnterpriseDealWhereInput[] = [
    { organizationId: { in: organizationIds } },
    { isDeleted: false },
  ];
  const before = parseCreatedBefore(filters);
  if (before) and.push({ createdAt: { lte: before } });
  if (filters.createdByUserIds?.length) {
    and.push({ createdBy: { in: filters.createdByUserIds } });
  }
  if (filters.importBatchOnly) {
    and.push({ importBatchId: { not: null } });
  }
  if (filters.opportunityPrefixes?.length) {
    and.push({
      OR: filters.opportunityPrefixes.map((p) => ({
        dealNumber: { startsWith: p, mode: "insensitive" },
      })),
    });
  }
  if (filters.demoHeuristics) {
    and.push({
      OR: [
        { dealNumber: { startsWith: "DEMO", mode: "insensitive" } },
        { dealNumber: { startsWith: "TEST", mode: "insensitive" } },
        { dealNumber: { startsWith: "UAT", mode: "insensitive" } },
        { fileNumber: { startsWith: "DEMO", mode: "insensitive" } },
        { fileNumber: { startsWith: "TEST", mode: "insensitive" } },
        { primaryContactName: { startsWith: "Demo", mode: "insensitive" } },
        { importBatchId: { not: null } },
        { createdBy: { in: [...DEMO_SEED_CREATED_BY] } },
      ],
    });
  }
  return { AND: and };
}

export function contactWhere(
  organizationIds: string[],
  filters: ProductionResetFilters,
): Prisma.EcmContactWhereInput {
  const and: Prisma.EcmContactWhereInput[] = [
    { organizationId: { in: organizationIds } },
    { isDeleted: false },
  ];
  const before = parseCreatedBefore(filters);
  if (before) and.push({ createdAt: { lte: before } });
  if (filters.createdByUserIds?.length) {
    and.push({ createdBy: { in: filters.createdByUserIds } });
  }
  if (filters.contactPrefixes?.length) {
    and.push({
      OR: filters.contactPrefixes.map((p) => ({
        name: { startsWith: p, mode: "insensitive" },
      })),
    });
  }
  if (filters.demoHeuristics) {
    and.push({
      OR: [
        { name: { startsWith: "Demo", mode: "insensitive" } },
        { name: { startsWith: "Test", mode: "insensitive" } },
        { name: { startsWith: "UAT", mode: "insensitive" } },
        { name: { startsWith: "Sample", mode: "insensitive" } },
        { personalEmail: { contains: "demo@", mode: "insensitive" } },
        { officialEmail: { contains: "demo@", mode: "insensitive" } },
        { personalEmail: { contains: ".demo", mode: "insensitive" } },
        { officialEmail: { contains: ".demo", mode: "insensitive" } },
        { createdBy: { in: [...DEMO_SEED_CREATED_BY] } },
      ],
    });
  }
  return { AND: and };
}

/** CO-CUTOVER-001 — Company Registry demo heuristics (soft-delete candidates only). */
export function companyWhere(
  organizationIds: string[],
  filters: ProductionResetFilters,
): Prisma.EcmCompanyWhereInput {
  const and: Prisma.EcmCompanyWhereInput[] = [
    { organizationId: { in: organizationIds } },
    { isDeleted: false },
  ];
  const before = parseCreatedBefore(filters);
  if (before) and.push({ createdAt: { lte: before } });
  if (filters.createdByUserIds?.length) {
    and.push({ createdBy: { in: filters.createdByUserIds } });
  }
  if (filters.demoHeuristics) {
    and.push({
      OR: [
        { companyName: { startsWith: "Demo", mode: "insensitive" } },
        { companyName: { startsWith: "Test", mode: "insensitive" } },
        { companyName: { startsWith: "Sample", mode: "insensitive" } },
        { companyName: { startsWith: "UAT", mode: "insensitive" } },
        { createdBy: { in: [...DEMO_SEED_CREATED_BY] } },
        { website: { contains: ".demo", mode: "insensitive" } },
      ],
    });
  }
  return { AND: and };
}

export function looksLikeDemoLabel(value: string | null | undefined): boolean {
  if (!value) return false;
  return DEMO_PREFIX_RE.test(value.trim());
}
