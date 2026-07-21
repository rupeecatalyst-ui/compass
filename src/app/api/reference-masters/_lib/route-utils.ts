import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { errorResponse } from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { prisma } from "@server/lib/prisma";

export function referenceMasterPersistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error(
      "Reference Master API requires ENTERPRISE_PERSISTENCE_MODE=prisma",
    );
  }
}

export function requireReferenceMasterAdmin(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can modify reference masters"), {
      status: 403,
      body: {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only administrators can modify reference masters",
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
  const message = err instanceof Error ? err.message : "Reference master request failed";
  return { status: 400, body: { success: false, error: { code: "REF_MASTER_ERROR", message } } };
}

export function notFound() {
  return errorResponse(404, "NOT_FOUND", "Reference master not found");
}
