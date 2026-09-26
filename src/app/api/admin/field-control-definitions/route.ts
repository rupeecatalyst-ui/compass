import { formatAuthError } from "@server/validators/auth.validators";
import { prisma } from "@server/lib/prisma";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  fieldControlDefinitionReader,
  readCertifiedFieldControlList,
  type FieldControlReadResult,
} from "@/lib/field-control-master/production-governance-read";

function toResponse<T>(result: FieldControlReadResult<T>) {
  if (result.ok) return successResponse(result.data);
  return errorResponse(result.status, result.code, result.message);
}

export async function GET(request: Request) {
  try {
    const result = await readCertifiedFieldControlList(request, {
      authenticate: (incoming) => requireAccessToken(incoming),
      findMany: (args) => fieldControlDefinitionReader(prisma).findMany(args),
    });
    return toResponse(result);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
