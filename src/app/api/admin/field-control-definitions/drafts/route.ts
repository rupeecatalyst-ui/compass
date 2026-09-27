import { formatAuthError } from "@server/validators/auth.validators";
import { prisma } from "@server/lib/prisma";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  createCertifiedFieldControlDraft,
  fieldControlDefinitionCreateDelegate,
  type FieldControlCreateResult,
} from "@/lib/field-control-master/production-governance-create";

function toResponse(result: FieldControlCreateResult) {
  if (result.ok) return successResponse(result.data, result.status);
  return errorResponse(result.status, result.code, result.message);
}

export async function POST(request: Request) {
  try {
    const result = await createCertifiedFieldControlDraft(request, {
      authenticate: (incoming) => {
        const token = requireAccessToken(incoming);
        return { role: token.role, userId: token.userId };
      },
      findFirst: (args) => fieldControlDefinitionCreateDelegate(prisma).findFirst(args),
      create: (args) => fieldControlDefinitionCreateDelegate(prisma).create(args),
    });
    return toResponse(result);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
