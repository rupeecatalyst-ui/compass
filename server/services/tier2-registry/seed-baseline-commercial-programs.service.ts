/**
 * CO-PROG-004 — One-time baseline seed for Supported Products + Commercial Programs.
 * Create-missing only. Never overwrites administrator commercial configuration.
 * Never auto-syncs from lender websites.
 */
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { normalizeLenderRegistryCode } from "@server/repositories/lender-registry/mappers";
import {
  CO_PROG_004_SEED_TAG,
  getBaselineCommercialProgramSeeds,
  normalizeSupportedProductCodes,
} from "@/constants/enterprise-lender-registry/baseline-commercial-program-seed";
import { LENDER_MASTER_SEED_CATALOG } from "@/constants/enterprise-lender-registry/master-seed-catalog";

export interface BaselineCommercialProgramSeedResult {
  organizationId: string;
  actorId: string;
  seedTag: string;
  lendersScanned: number;
  capabilityFilled: number;
  capabilityNormalized: number;
  capabilitySkipped: number;
  programsCreated: number;
  programsSkipped: number;
  programsMissingLender: number;
}

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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

function sameCodeSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

export async function seedBaselineCommercialPrograms(): Promise<BaselineCommercialProgramSeedResult> {
  const organizationId = await resolvePilotOrganizationId();
  const actorId = await resolveSeedActorId();

  let capabilityFilled = 0;
  let capabilityNormalized = 0;
  let capabilitySkipped = 0;
  let programsCreated = 0;
  let programsSkipped = 0;
  let programsMissingLender = 0;

  const lenders = await prisma.enterpriseLender.findMany({
    where: { organizationId, isDeleted: false },
    select: {
      id: true,
      code: true,
      productsSupported: true,
      shortName: true,
      displayName: true,
      label: true,
    },
  });

  const lendersByCode = new Map(
    lenders.map((l) => [normalizeLenderRegistryCode(l.code), l]),
  );

  // —— Capability (Supported Products) ——
  for (const catalog of LENDER_MASTER_SEED_CATALOG) {
    const code = normalizeLenderRegistryCode(catalog.seedKey);
    const lender = lendersByCode.get(code);
    if (!lender) continue;

    const baseline = normalizeSupportedProductCodes(catalog.productsSupported);
    const existing = normalizeSupportedProductCodes(asStringArray(lender.productsSupported));

    if (existing.length === 0 && baseline.length > 0) {
      await prisma.enterpriseLender.update({
        where: { id: lender.id },
        data: {
          productsSupported: baseline,
          modifiedBy: actorId,
        },
      });
      capabilityFilled += 1;
      lender.productsSupported = baseline;
      continue;
    }

    if (existing.length > 0) {
      const raw = asStringArray(lender.productsSupported);
      const normalized = normalizeSupportedProductCodes(raw);
      // Normalize alias codes only — do not add/remove admin selections.
      if (!sameCodeSet(raw.map((c) => c.trim()), normalized) && normalized.length > 0) {
        // Prefer preserving admin membership: map each raw → canonical when known
        const preserved = normalizeSupportedProductCodes(raw);
        if (!sameCodeSet(existing, preserved) || raw.some((r) => !preserved.includes(r) && resolveNeedsNorm(r))) {
          await prisma.enterpriseLender.update({
            where: { id: lender.id },
            data: {
              productsSupported: preserved,
              modifiedBy: actorId,
            },
          });
          capabilityNormalized += 1;
          lender.productsSupported = preserved;
          continue;
        }
      }
      // Simpler path: if raw differs from normalized canonical list of same membership
      if (!sameCodeSet(raw, existing) && existing.length > 0) {
        await prisma.enterpriseLender.update({
          where: { id: lender.id },
          data: {
            productsSupported: existing,
            modifiedBy: actorId,
          },
        });
        capabilityNormalized += 1;
        lender.productsSupported = existing;
        continue;
      }
    }

    capabilitySkipped += 1;
  }

  // —— Commercial Programs (create-missing) ——
  const existingPrograms = await prisma.enterpriseLenderProgram.findMany({
    where: { organizationId, isDeleted: false },
    select: { id: true, code: true, lenderId: true, productCode: true },
  });
  const byCode = new Set(existingPrograms.map((p) => normalizeLenderRegistryCode(p.code)));
  const byLenderProduct = new Set(
    existingPrograms
      .filter((p) => p.productCode)
      .map((p) => `${p.lenderId}::${normalizeLenderRegistryCode(p.productCode!)}`),
  );

  const productRows = await prisma.enterpriseProduct.findMany({
    where: { organizationId, isDeleted: false },
    select: { id: true, code: true },
  });
  const productIdByCode = new Map(
    productRows.map((p) => [normalizeLenderRegistryCode(p.code), p.id]),
  );

  for (const seed of getBaselineCommercialProgramSeeds()) {
    const lender = lendersByCode.get(normalizeLenderRegistryCode(seed.lenderCode));
    if (!lender) {
      programsMissingLender += 1;
      continue;
    }
    const programCode = normalizeLenderRegistryCode(seed.code);
    const productCode = normalizeLenderRegistryCode(seed.productCode);
    const lenderProductKey = `${lender.id}::${productCode}`;

    if (byCode.has(programCode) || byLenderProduct.has(lenderProductKey)) {
      programsSkipped += 1;
      continue;
    }

    await prisma.enterpriseLenderProgram.create({
      data: {
        organizationId,
        lenderId: lender.id,
        productId: productIdByCode.get(productCode) ?? null,
        productCode,
        code: programCode,
        label: seed.label,
        description: seed.description,
        lifecycleStatus: "active",
        status: "active",
        enabled: true,
        notes: seed.notes,
        createdBy: actorId,
        modifiedBy: actorId,
      },
    });
    byCode.add(programCode);
    byLenderProduct.add(lenderProductKey);
    programsCreated += 1;
  }

  return {
    organizationId,
    actorId,
    seedTag: CO_PROG_004_SEED_TAG,
    lendersScanned: lenders.length,
    capabilityFilled,
    capabilityNormalized,
    capabilitySkipped,
    programsCreated,
    programsSkipped,
    programsMissingLender,
  };
}

function resolveNeedsNorm(raw: string): boolean {
  const upper = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return raw.trim() !== upper || raw.includes(" ");
}
