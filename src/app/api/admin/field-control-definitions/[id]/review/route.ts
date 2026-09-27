import { formatAuthError } from "@server/validators/auth.validators";
import { prisma } from "@server/lib/prisma";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  decideCertifiedFieldControlReview,
  fieldControlDefinitionLifecycleDelegate,
  type FieldControlLifecycleResult,
} from "@/lib/field-control-master/production-governance-lifecycle";

function toResponse(result: FieldControlLifecycleResult) {
  if (result.ok) return successResponse(result.data, result.status);
  return errorResponse(result.status, result.code, result.message);
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const delegate = fieldControlDefinitionLifecycleDelegate(prisma);
    const result = await decideCertifiedFieldControlReview(request, id, {
      authenticate: (incoming) => {
        const token = requireAccessToken(incoming);
        return { role: token.role, userId: token.userId };
      },
      findUnique: (args) => delegate.findUnique(args),
      updateMany: (args) => delegate.updateMany(args),
    });
    return toResponse(result);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
