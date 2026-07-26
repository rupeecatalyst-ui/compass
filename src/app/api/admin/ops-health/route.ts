/**
 * CO-OPS-002 — System Health / operational observability API (administrators).
 * Returns application, database, auth, API, migration posture + recent rings.
 * Never returns secrets, JWTs, or connection strings.
 */

import { formatAuthError } from "@server/validators/auth.validators";
import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { resolveOpsHealthSnapshot } from "@/lib/ops/resolve-ops-health";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Ops Health"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const payload = await resolveOpsHealthSnapshot();
    return successResponse(payload, 200, payload.correlationId);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
