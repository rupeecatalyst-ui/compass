import { formatAuthError } from "@server/validators/auth.validators";
import { prisma } from "@server/lib/prisma";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  createCustomFieldDraft,
  type CustomFieldDesignDelegate,
  type CustomFieldDesignResult,
} from "@/lib/field-control-master/custom-field-design";

function delegate(db: object): CustomFieldDesignDelegate {
  const model = (db as { fieldControlDefinition?: CustomFieldDesignDelegate }).fieldControlDefinition;
  if (!model || typeof model.findFirst !== "function" || typeof model.create !== "function") {
    throw new Error("Certified Field Control definitions are not available from the database client.");
  }
  return model;
}

function toResponse(result: CustomFieldDesignResult) {
  if (result.ok) return successResponse(result.data, result.status);
  return errorResponse(result.status, result.code, result.message);
}

export async function POST(request: Request) {
  try {
    const model = delegate(prisma);
    const result = await createCustomFieldDraft(request, {
      authenticate: (incoming) => {
        const token = requireAccessToken(incoming);
        return { role: token.role, userId: token.userId };
      },
      findFirst: (args) => model.findFirst(args),
      create: (args) => model.create(args),
    });
    return toResponse(result);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
