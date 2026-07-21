import type { Role } from "@prisma/client";
import { userProvisioningService } from "@server/services/user-provisioning.service";
import { formatAuthError, provisionUserSchema } from "@server/validators/auth.validators";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";

/** Pilot — provision login credentials for an Enterprise User (SUPER_ADMIN only). */
export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
      return errorResponse(403, "FORBIDDEN", "Only administrators can provision users.");
    }

    const body = provisionUserSchema.parse(await request.json());
    const result = await userProvisioningService.provision({
      ...body,
      role: (body.role ?? "VIEWER") as Role,
      createdByUserId: actor.userId,
    });

    return successResponse({
      ...result,
      createdBy: actor.userId,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      "body" in err
    ) {
      const authErr = err as { status: number; body: { success: false; error: { code: string; message: string } } };
      return fromAuthError(authErr);
    }
    return fromAuthError(formatAuthError(err));
  }
}
