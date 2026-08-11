/**
 * CO-ORG-001 — Organization API route helpers.
 */
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { ROLES } from "@/constants/roles";
import { errorResponse, requireAccessToken } from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { OrganizationWorkspaceActor } from "@/types/enterprise-organization-workspace";
import { prisma } from "@server/lib/prisma";
import {
  OrganizationWorkspaceError,
} from "@server/services/organization-workspace/organization-workspace.service";

export function guardOrganizationWorkspacePrisma() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(
      new Error("Organization workspace requires ENTERPRISE_PERSISTENCE_MODE=prisma"),
      {
        status: 503,
        body: {
          success: false,
          error: {
            code: "PERSISTENCE_REQUIRED",
            message: "Organization workspace requires ENTERPRISE_PERSISTENCE_MODE=prisma",
          },
        } satisfies ApiResponse<unknown>,
      },
    );
  }
}

export function requireSuperAdmin(request: Request) {
  const actor = requireAccessToken(request);
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw {
      status: 403,
      body: {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Organization workspace is restricted to Super Admin",
        },
      },
    };
  }
  return actor;
}

export async function resolveOrganizationActor(
  request: Request,
): Promise<OrganizationWorkspaceActor> {
  const token = requireSuperAdmin(request);
  const displayName = await resolveActorDisplayName(token.userId);
  return {
    userId: token.userId,
    displayName: displayName ?? token.email,
  };
}

export async function resolveActorDisplayName(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!user) return undefined;
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

export function mapOrganizationRouteError(err: unknown) {
  if (typeof err === "object" && err !== null && "status" in err && "body" in err) {
    return err as { status: number; body: ApiResponse<unknown> };
  }
  if (err instanceof OrganizationWorkspaceError) {
    return {
      status: err.statusCode,
      body: {
        success: false,
        error: { code: err.code, message: err.message },
      } satisfies ApiResponse<unknown>,
    };
  }
  const message = err instanceof Error ? err.message : "Organization workspace request failed";
  return {
    status: 400,
    body: {
      success: false,
      error: { code: "ORG_WORKSPACE_ERROR", message },
    } satisfies ApiResponse<unknown>,
  };
}

export function handleOrganizationRouteError(err: unknown) {
  const mapped = mapOrganizationRouteError(err);
  return errorResponse(
    mapped.status,
    mapped.body.error?.code ?? "ORG_WORKSPACE_ERROR",
    mapped.body.error?.message ?? "Organization workspace request failed",
  );
}
