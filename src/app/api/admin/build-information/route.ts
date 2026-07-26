/**
 * CO-OPS-001 — Build Information API (administrators only).
 * Returns operational build / deployment / database facts. No secrets.
 */
import { formatAuthError } from "@server/validators/auth.validators";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { resolveBuildInformationPayload } from "@/lib/build-information/resolve-server";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Build Information"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const payload = await resolveBuildInformationPayload();
    return successResponse(payload);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
