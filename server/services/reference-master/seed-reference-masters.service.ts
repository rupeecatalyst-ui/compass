/**
 * CO-ARCH-001-I3 — Idempotent Reference Master seed / backfill (Infrastructure).
 */
import type { ReferenceMasterDomain } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { normalizeReferenceMasterCode } from "@server/repositories/reference-master/mappers";
import {
  getAllReferenceMasterSeedDomains,
  getReferenceMasterSeedOptions,
  type ReferenceMasterSeedOption,
} from "./seed-catalog";

export interface ReferenceMasterSeedResult {
  organizationId: string;
  actorId: string;
  created: number;
  updated: number;
  skipped: number;
  byDomain: Record<string, { created: number; updated: number; skipped: number }>;
}

type IdLookup = Map<string, string>;

async function resolveSeedActorId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!admin) {
    throw new Error("No active SUPER_ADMIN user found. Run prisma db seed first.");
  }
  return admin.id;
}

function lookupKey(domain: ReferenceMasterDomain, code: string): string {
  return `${domain}:${code}`;
}

async function upsertSeedOption(
  organizationId: string,
  actorId: string,
  domain: ReferenceMasterDomain,
  option: ReferenceMasterSeedOption,
  ids: IdLookup,
): Promise<"created" | "updated" | "skipped"> {
  const code = normalizeReferenceMasterCode(option.code);
  if (!code) return "skipped";

  const parentId = option.parentCode
    ? option.parentDomain
      ? ids.get(lookupKey(option.parentDomain, option.parentCode)) ?? null
      : null
    : null;

  const existing = await prisma.enterpriseReferenceMaster.findUnique({
    where: {
      organizationId_domain_code: { organizationId, domain, code },
    },
  });

  const data = {
    label: option.label,
    parentId,
    sortOrder: option.sortOrder ?? 0,
    meta: option.meta ? (option.meta as Prisma.InputJsonValue) : undefined,
    enabled: option.enabled !== false,
    status: "active" as const,
    modifiedBy: actorId,
  };

  if (!existing) {
    const created = await prisma.enterpriseReferenceMaster.create({
      data: {
        organizationId,
        domain,
        code,
        description: null,
        createdBy: actorId,
        ...data,
      },
    });
    ids.set(lookupKey(domain, code), created.id);
    return "created";
  }

  const needsUpdate =
    existing.label !== data.label ||
    existing.parentId !== data.parentId ||
    existing.sortOrder !== data.sortOrder ||
    existing.enabled !== data.enabled ||
    existing.status !== data.status;

  if (needsUpdate) {
    const updated = await prisma.enterpriseReferenceMaster.update({
      where: { id: existing.id },
      data,
    });
    ids.set(lookupKey(domain, code), updated.id);
    return "updated";
  }

  ids.set(lookupKey(domain, code), existing.id);
  return "skipped";
}

export async function seedReferenceMasters(): Promise<ReferenceMasterSeedResult> {
  const organizationId = await resolvePilotOrganizationId();
  const actorId = await resolveSeedActorId();
  const ids: IdLookup = new Map();

  const existingRows = await prisma.enterpriseReferenceMaster.findMany({
    where: { organizationId, isDeleted: false },
    select: { id: true, domain: true, code: true },
  });
  for (const row of existingRows) {
    ids.set(lookupKey(row.domain, row.code), row.id);
  }

  const result: ReferenceMasterSeedResult = {
    organizationId,
    actorId,
    created: 0,
    updated: 0,
    skipped: 0,
    byDomain: {},
  };

  for (const domain of getAllReferenceMasterSeedDomains()) {
    const domainStats = { created: 0, updated: 0, skipped: 0 };
    const options = getReferenceMasterSeedOptions(domain);

    for (const option of options) {
      const outcome = await upsertSeedOption(
        organizationId,
        actorId,
        domain,
        option,
        ids,
      );
      domainStats[outcome] += 1;
      result[outcome] += 1;
    }

    result.byDomain[domain] = domainStats;
  }

  return result;
}
