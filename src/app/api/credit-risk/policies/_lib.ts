import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { errorResponse, fromAuthError, requireAccessToken } from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { PolicyAdminError } from "@server/services/credit-risk-policy/policy-admin.service";

export function requirePolicyAdmin(request: Request) {
  const actor = requireAccessToken(request);
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw new PolicyAdminError(403, "FORBIDDEN", "Policy administration requires an administrator.");
  }
  if (!isEnterprisePersistencePrisma()) {
    throw new PolicyAdminError(503, "POLICY_PERSISTENCE_UNAVAILABLE", "Durable policy persistence is unavailable.");
  }
  return actor;
}

export function policyRouteError(error: unknown) {
  if (error && typeof error === "object" && "status" in error && "body" in error) {
    return fromAuthError(error as Parameters<typeof fromAuthError>[0]);
  }
  if (error instanceof PolicyAdminError) return errorResponse(error.statusCode, error.code, error.message);
  if (error instanceof ZodError) return errorResponse(400, "INVALID_POLICY_INPUT", "Check the policy fields and try again.");
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return errorResponse(409, "POLICY_CODE_EXISTS", "A policy with this code already exists.");
  }
  return errorResponse(500, "POLICY_ADMIN_FAILED", "Policy operation failed.");
}
