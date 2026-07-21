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

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdmin(actor);
    const url = new URL(request.url);
    const users = await userAdminService.list({
      search: url.searchParams.get("search") ?? undefined,
      role: (url.searchParams.get("role") as Role | "all") ?? "all",
      status: (url.searchParams.get("status") as "all" | "active" | "inactive") ?? "all",
    });
    return successResponse({ users });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdmin(actor);
    const body = await request.json();
    const result = await userAdminService.create({
      fullName: String(body.fullName ?? "").trim(),
      email: String(body.email ?? "").trim(),
      employeeId: body.employeeId ? String(body.employeeId) : undefined,
      mobile: body.mobile ? String(body.mobile) : undefined,
      role: (body.role as Role) || "VIEWER",
      reportingManagerId: body.reportingManagerId ?? null,
      createdByUserId: actor.userId,
    });
    return successResponse(result, 201);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
