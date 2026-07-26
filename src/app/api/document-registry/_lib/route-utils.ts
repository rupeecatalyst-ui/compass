import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { errorResponse } from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { prisma } from "@server/lib/prisma";

export function documentRegistryPersistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error(
      "Document Registry API requires ENTERPRISE_PERSISTENCE_MODE=prisma",
    );
  }
}

export function requireDocumentRegistryAdmin(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can modify document registry"), {
      status: 403,
      body: {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only administrators can modify document registry",
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
  const message = err instanceof Error ? err.message : "Document registry request failed";
  return { status: 400, body: { success: false, error: { code: "DOCUMENT_REGISTRY_ERROR", message } } };
}

export function notFound(message = "Document registry record not found") {
  return errorResponse(404, "NOT_FOUND", message);
}

export function parseListQuery(url: URL) {
  return {
    page: Number(url.searchParams.get("page") ?? 1),
    pageSize: Number(url.searchParams.get("pageSize") ?? 100),
    search: url.searchParams.get("search") ?? undefined,
    status:
      (url.searchParams.get("status") as "all" | "draft" | "active" | "inactive" | "archived") ??
      "active",
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
