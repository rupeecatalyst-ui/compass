import { successResponse, errorResponse } from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { invitationEngineService, InvitationEngineError } from "@server/services/invitation-engine/invitation-engine.service";
import { ensureWealthPartnerInvitationAdapterRegistered } from "@server/services/invitation-engine/wealth-partner-adapter";

type RouteContext = { params: Promise<{ token: string }> };

function mapError(err: unknown) {
  if (err instanceof InvitationEngineError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const message = err instanceof Error ? err.message : "Activation failed";
  return errorResponse(400, "ACTIVATION_FAILED", message);
}

/** Public — preview invitation by token (no auth). */
export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Activation requires prisma persistence");
    }
    ensureWealthPartnerInvitationAdapterRegistered();
    const { token } = await context.params;
    const preview = await invitationEngineService.previewByToken(decodeURIComponent(token));
    return successResponse(preview);
  } catch (err) {
    return mapError(err);
  }
}

/** Public — complete activation. */
export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Activation requires prisma persistence");
    }
    ensureWealthPartnerInvitationAdapterRegistered();
    const { token } = await context.params;
    const body = await request.json();
    const result = await invitationEngineService.activate({
      token: decodeURIComponent(token),
      password: String(body.password || ""),
      confirmPassword: String(body.confirmPassword || ""),
      acceptTerms: Boolean(body.acceptTerms),
      fullName: body.fullName ? String(body.fullName) : undefined,
      mobile: body.mobile ? String(body.mobile) : undefined,
      profileCity: body.profileCity ? String(body.profileCity) : undefined,
    });
    return successResponse(result);
  } catch (err) {
    return mapError(err);
  }
}
