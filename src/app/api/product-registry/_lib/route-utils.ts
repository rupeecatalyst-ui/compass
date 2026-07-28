import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { errorResponse } from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { prisma } from "@server/lib/prisma";

export function productRegistryPersistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(
      new Error(
        "Product Registry requires ENTERPRISE_PERSISTENCE_MODE=prisma (and NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma). Apply Product Registry migrations, then use Seed / Sync Catalog.",
      ),
      {
        status: 503,
        body: {
          success: false,
          error: {
            code: "PRODUCT_REGISTRY_PERSISTENCE_REQUIRED",
            message:
              "Product Registry requires ENTERPRISE_PERSISTENCE_MODE=prisma (and NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma). Apply Product Registry migrations, then use Seed / Sync Catalog.",
          },
        } satisfies ApiResponse<unknown>,
      },
    );
  }
}

export function requireProductRegistryAdmin(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can modify product registry"), {
      status: 403,
      body: {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only administrators can modify product registry",
        },
      } satisfies ApiResponse<unknown>,
    });
  }
}

export async function resolveActorDisplayName(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!user) return undefined;
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

export function mapRouteError(err: unknown) {
  if (typeof err === "object" && err !== null && "status" in err) {
    return err as { status: number; body: ApiResponse<unknown> };
  }
  const message = err instanceof Error ? err.message : "Product registry request failed";
  const prismaCode =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";
  if (prismaCode === "P2022" || /column .* does not exist/i.test(message)) {
    return {
      status: 503,
      body: {
        success: false,
        error: {
          code: "PRODUCT_REGISTRY_SCHEMA_REQUIRED",
          message:
            "Product Registry schema is incomplete. Apply prisma migrations (CO-ARCH-001 / CO-ADMIN-005), then Seed / Sync Catalog.",
        },
      } satisfies ApiResponse<unknown>,
    };
  }
  return {
    status: 500,
    body: { success: false, error: { code: "PRODUCT_REGISTRY_ERROR", message } },
  };
}

/** Prefer mapped API body; never hide the actionable message behind a fixed string. */
export function productRegistryErrorResponse(
  err: unknown,
  fallbackCode: string,
  fallbackMessage: string,
) {
  const mapped = mapRouteError(err);
  if (mapped.status === 401 || mapped.status === 403) {
    return mapped;
  }
  const message =
    mapped.body?.error?.message ||
    (err instanceof Error ? err.message : null) ||
    fallbackMessage;
  const code = mapped.body?.error?.code || fallbackCode;
  return {
    status: mapped.status >= 400 ? mapped.status : 500,
    body: {
      success: false,
      error: { code, message },
    } satisfies ApiResponse<unknown>,
  };
}

export function notFound(message = "Product registry record not found") {
  return errorResponse(404, "NOT_FOUND", message);
}

export function parseListQuery(url: URL) {
  return {
    page: Number(url.searchParams.get("page") ?? 1),
    pageSize: Number(url.searchParams.get("pageSize") ?? 100),
    search: url.searchParams.get("search") ?? undefined,
    status:
      (url.searchParams.get("status") as "all" | "draft" | "active" | "inactive" | "archived") ??
      "all",
    enabled:
      url.searchParams.get("enabled") === "true"
        ? true
        : url.searchParams.get("enabled") === "false"
          ? false
          : ("all" as const),
    sortBy:
      (url.searchParams.get("sortBy") as
        | "sortOrder"
        | "label"
        | "code"
        | "modifiedOn"
        | "createdOn") ?? "sortOrder",
    sortDir: (url.searchParams.get("sortDir") as "asc" | "desc") ?? "asc",
  };
}
