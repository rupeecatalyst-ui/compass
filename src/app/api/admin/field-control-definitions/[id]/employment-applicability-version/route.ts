import { formatAuthError } from "@server/validators/auth.validators";
import { prisma } from "@server/lib/prisma";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  createCertifiedFieldEmploymentApplicabilityVersion,
  fieldControlDefinitionApplicabilityDelegate,
  type FieldControlApplicabilityResult,
} from "@/lib/field-control-master/production-governance-applicability";

function toResponse(result: FieldControlApplicabilityResult) {
  if (result.ok) return successResponse(result.data, result.status);
  return errorResponse(result.status, result.code, result.message);
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const delegate = fieldControlDefinitionApplicabilityDelegate(prisma);
    const result = await createCertifiedFieldEmploymentApplicabilityVersion(request, id, {
      authenticate: (incoming) => {
        const token = requireAccessToken(incoming);
        return { role: token.role, userId: token.userId };
      },
      findUnique: (args) => delegate.findUnique(args),
      findMany: (args) => delegate.findMany(args),
      create: (args) => delegate.create(args as Parameters<typeof delegate.create>[0]),
    });
    return toResponse(result);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
