import type { Role } from "@prisma/client";
import { formatAuthError } from "@server/validators/auth.validators";
import { userAdminService } from "@server/services/user-admin.service";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";

function requireAdmin(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage users"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = requireAccessToken(request);
    requireAdmin(actor);
    const { userId } = await context.params;
    const user = await userAdminService.getById(userId);
    if (!user) return errorResponse(404, "NOT_FOUND", "User not found");
    return successResponse({ user });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = requireAccessToken(request);
    requireAdmin(actor);
    const { userId } = await context.params;
    const body = await request.json();

    if (body.action === "activate") {
      const user = await userAdminService.setActive(userId, true);
      return successResponse({ user });
    }
    if (body.action === "deactivate") {
      const user = await userAdminService.setActive(userId, false);
      return successResponse({ user });
    }
    if (body.action === "resetPassword") {
      const result = await userAdminService.resetPassword(userId);
      return successResponse(result);
    }

    const user = await userAdminService.update(userId, {
      fullName: body.fullName,
      email: body.email,
      employeeId: body.employeeId,
      mobile: body.mobile,
      role: body.role as Role | undefined,
      reportingManagerId: body.reportingManagerId,
      isActive: body.isActive,
    });
    return successResponse({ user });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
