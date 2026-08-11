/**
 * CO-MASTER-005A — invite ↔ Product Master join helpers.
 * Scope is invitation-product rows only (never live Matrix expansion after invite create).
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeProductRegistryCode } from "@server/repositories/product-registry/mappers";

export type InviteProductSnapshot = {
  productId: string;
  productCode: string;
  productLabel: string;
};

type Db = PrismaClient | Prisma.TransactionClient;

function asSupportedCodes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((c) => String(c ?? "").trim())
          .filter(Boolean)
          .map((c) => normalizeProductRegistryCode(c) || c),
      ),
    );
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return asSupportedCodes(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeInviteProductIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = typeof item === "string" ? item.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Resolve Product Master rows currently mapped to a lender via Product–Lender Matrix. */
export async function resolveMatrixProductsForLender(input: {
  db: Db;
  organizationId: string;
  lenderId: string;
}): Promise<InviteProductSnapshot[]> {
  const lender = await input.db.enterpriseLender.findFirst({
    where: { id: input.lenderId, organizationId: input.organizationId },
    select: { productsSupported: true },
  });
  if (!lender) {
    throw Object.assign(new Error("Lender not found."), { statusCode: 404 });
  }

  const codes = asSupportedCodes(lender.productsSupported);
  if (codes.length === 0) return [];

  const codeSet = new Set(codes.map((c) => c.toLowerCase()));
  const products = await input.db.enterpriseProduct.findMany({
    where: {
      organizationId: input.organizationId,
      isDeleted: false,
      enabled: true,
    },
    select: { id: true, code: true, label: true, status: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  const out: InviteProductSnapshot[] = [];
  const seenIds = new Set<string>();
  for (const product of products) {
    const normalized = normalizeProductRegistryCode(product.code) || product.code;
    if (!codeSet.has(normalized.toLowerCase()) && !codeSet.has(product.code.toLowerCase())) {
      continue;
    }
    if (seenIds.has(product.id)) continue;
    seenIds.add(product.id);
    out.push({
      productId: product.id,
      productCode: product.code,
      productLabel: product.label,
    });
  }
  return out;
}

export async function assertProductsInMatrix(input: {
  db: Db;
  organizationId: string;
  lenderId: string;
  productIds: string[];
}): Promise<InviteProductSnapshot[]> {
  const matrix = await resolveMatrixProductsForLender(input);
  const byId = new Map(matrix.map((p) => [p.productId, p]));
  const missing: string[] = [];
  const selected: InviteProductSnapshot[] = [];
  for (const id of input.productIds) {
    const hit = byId.get(id);
    if (!hit) {
      missing.push(id);
      continue;
    }
    selected.push(hit);
  }
  if (missing.length > 0) {
    throw Object.assign(
      new Error(
        "One or more products are not mapped to this lender in the Product–Lender Matrix.",
      ),
      {
        statusCode: 400,
        code: "PRODUCT_NOT_IN_MATRIX",
        missingProductIds: missing,
      },
    );
  }
  if (selected.length === 0) {
    throw Object.assign(new Error("Select at least one product for the invitation."), {
      statusCode: 400,
      code: "PRODUCT_REQUIRED",
    });
  }
  return selected;
}

export async function listInviteProductRows(
  db: Db,
  inviteId: string,
): Promise<InviteProductSnapshot[]> {
  const rows = await db.lenderProgramPortalInviteProduct.findMany({
    where: { inviteId },
    orderBy: [{ sortOrder: "asc" }, { productLabel: "asc" }],
    select: {
      productId: true,
      productCode: true,
      productLabel: true,
    },
  });
  return rows.map((r) => ({
    productId: r.productId,
    productCode: r.productCode,
    productLabel: r.productLabel,
  }));
}

export function inviteAllowsProductId(
  inviteProducts: InviteProductSnapshot[],
  productId: string,
): boolean {
  return inviteProducts.some((p) => p.productId === productId);
}

export function inviteAllowsProductCode(
  inviteProducts: InviteProductSnapshot[],
  productCode: string,
): InviteProductSnapshot | null {
  const needle = (normalizeProductRegistryCode(productCode) || productCode).toLowerCase();
  return (
    inviteProducts.find((p) => {
      const code = (normalizeProductRegistryCode(p.productCode) || p.productCode).toLowerCase();
      return code === needle;
    }) ?? null
  );
}

/**
 * BC-3: one-time Matrix snapshot onto invites that have zero invite-product rows.
 * Does not invent products. Returns stopped invite ids when Matrix has no Product Master match.
 */
export async function backfillLegacyInviteProductsBc3(input: {
  db: PrismaClient;
  organizationId?: string;
}): Promise<{
  scanned: number;
  backfilled: number;
  alreadyScoped: number;
  stopped: Array<{
    inviteId: string;
    inviteTokenPreview: string;
    lenderId: string;
    lenderName: string;
    reason: string;
  }>;
  productRowsCreated: number;
}> {
  const invites = await input.db.lenderProgramPortalInvite.findMany({
    where: input.organizationId
      ? { organizationId: input.organizationId }
      : undefined,
    include: {
      products: { select: { id: true } },
      lender: { select: { id: true, displayName: true, legalName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  let backfilled = 0;
  let alreadyScoped = 0;
  let productRowsCreated = 0;
  const stopped: Array<{
    inviteId: string;
    inviteTokenPreview: string;
    lenderId: string;
    lenderName: string;
    reason: string;
  }> = [];

  for (const invite of invites) {
    if (invite.products.length > 0) {
      alreadyScoped += 1;
      continue;
    }

    const matrix = await resolveMatrixProductsForLender({
      db: input.db,
      organizationId: invite.organizationId,
      lenderId: invite.lenderId,
    });

    const lenderName =
      invite.lender.displayName || invite.lender.legalName || invite.lenderId;

    if (matrix.length === 0) {
      stopped.push({
        inviteId: invite.id,
        inviteTokenPreview: `${invite.token.slice(0, 8)}…`,
        lenderId: invite.lenderId,
        lenderName,
        reason:
          "No Product Master products mapped for this lender in the Product–Lender Matrix. Cannot invent products for BC-3 snapshot.",
      });
      continue;
    }

    await input.db.$transaction(async (tx) => {
      let sortOrder = 0;
      for (const product of matrix) {
        await tx.lenderProgramPortalInviteProduct.create({
          data: {
            organizationId: invite.organizationId,
            inviteId: invite.id,
            productId: product.productId,
            productCode: product.productCode,
            productLabel: product.productLabel,
            sortOrder,
          },
        });
        sortOrder += 1;
        productRowsCreated += 1;
      }
    });
    backfilled += 1;
  }

  return {
    scanned: invites.length,
    backfilled,
    alreadyScoped,
    stopped,
    productRowsCreated,
  };
}
