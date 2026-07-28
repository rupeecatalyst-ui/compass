/**
 * CO-ADMIN-005 — Product × Lender matrix (capability mapping via productsSupported).
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import { productRegistryService } from "@server/services/product-registry/product-registry.service";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Requires ENTERPRISE_PERSISTENCE_MODE=prisma"), {
      statusCode: 503,
      code: "PERSISTENCE_REQUIRED",
    });
  }
}

export async function GET(request: Request) {
  try {
    guard();
    requireAccessToken(request);
    const products = await productRegistryService.queryProducts({
      pageSize: 200,
      enabled: true,
      sortBy: "sortOrder",
      sortDir: "asc",
    });
    const lenders = await lenderRegistryService.queryLenders({
      pageSize: 200,
      enabled: true,
      sortBy: "sortOrder",
      sortDir: "asc",
    });

    const matrix = lenders.items.map((lender) => ({
      lenderId: lender.id,
      lenderCode: lender.code,
      lenderLabel: lender.label,
      institutionCategory: lender.institutionCategory,
      productsSupported: lender.productsSupported ?? [],
    }));

    return successResponse({
      products: products.items.map((p) => ({
        id: p.id,
        code: p.code,
        label: p.label,
        isSecured: p.isSecured,
      })),
      lenders: matrix,
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to load matrix";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 500;
    return errorResponse(statusCode, "MATRIX_GET_FAILED", message);
  }
}

export async function PUT(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
      return errorResponse(403, "FORBIDDEN", "Admin role required");
    }
    const body = await request.json();
    const lenderId = String(body.lenderId ?? "");
    const productCodes = Array.isArray(body.productCodes)
      ? body.productCodes.map(String)
      : null;
    if (!lenderId || !productCodes) {
      return errorResponse(400, "INVALID_BODY", "lenderId and productCodes[] required");
    }

    const updated = await lenderRegistryService.updateLender(
      lenderId,
      {
        productsSupported: productCodes,
        modifiedBy: actor.userId,
      },
      undefined,
    );

    // Ensure programs exist for newly linked product codes (lightweight)
    const organizationId = await resolvePilotOrganizationId();
    const products = await prisma.enterpriseProduct.findMany({
      where: {
        organizationId,
        code: { in: productCodes },
        isDeleted: false,
      },
      select: { id: true, code: true, label: true },
    });
    for (const product of products) {
      const existing = await prisma.enterpriseLenderProgram.findFirst({
        where: {
          organizationId,
          lenderId,
          productCode: product.code,
          isDeleted: false,
        },
      });
      if (!existing) {
        await prisma.enterpriseLenderProgram.create({
          data: {
            organizationId,
            lenderId,
            productId: product.id,
            productCode: product.code,
            code: `PRG_${lenderId.slice(-6)}_${product.code}`.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 48),
            label: `${product.label} Program`,
            lifecycleStatus: "active",
            status: "active",
            enabled: true,
            createdBy: actor.userId,
            modifiedBy: actor.userId,
          },
        });
      }
    }

    return successResponse({
      lenderId: updated.id,
      productsSupported: updated.productsSupported ?? [],
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to update matrix";
    return errorResponse(400, "MATRIX_UPDATE_FAILED", message);
  }
}
