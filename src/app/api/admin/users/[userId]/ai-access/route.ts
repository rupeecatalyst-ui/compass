import { formatAuthError } from "@server/validators/auth.validators";
import { enterpriseAiAccessService } from "@server/services/enterprise-ai-access/ai-access.service";
import { canGrantAiAccess } from "@/constants/enterprise-ai-access";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";

type RouteContext = { params: Promise<{ userId: string }> };

function requireAiAccessGrantor(actor: { role: string }) {
  if (!canGrantAiAccess(actor.role)) {
    throw Object.assign(new Error("Only administrators can manage AI access"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = requireAccessToken(request);
    requireAiAccessGrantor(actor);
    const { userId } = await context.params;
    const aiAccess = await enterpriseAiAccessService.getForUser(userId);
    if (!aiAccess) return errorResponse(404, "NOT_FOUND", "User not found");
    return successResponse({ aiAccess });
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
    requireAiAccessGrantor(actor);
    const { userId } = await context.params;
    const body = await request.json();

    const aiAccess = await enterpriseAiAccessService.updateForUser({
      userId,
      patch: {
        AI_ACCESS: body.AI_ACCESS,
        AI_TEXT: body.AI_TEXT,
        AI_VOICE: body.AI_VOICE,
        AI_CHANAKYA: body.AI_CHANAKYA,
        AI_CATALYST_INTELLIGENCE: body.AI_CATALYST_INTELLIGENCE,
        AI_ACTIONS: false,
      },
      actorUserId: actor.userId,
    });

    return successResponse({ aiAccess });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
