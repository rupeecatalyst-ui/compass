/**
 * CO-ARCH-003 Phase 2A — Opportunity API route helpers.
 */
import {
  isOpportunityRegistryApiEnabled,
} from "@/constants/enterprise-opportunity-registry";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { ApiResponse } from "@/types/api";
import {
  OpportunityActiveDuplicateError,
  OpportunityConflictError,
  OpportunityNotFoundError,
  OpportunityValidationError,
} from "@server/services/enterprise-opportunity/opportunity-validation";

export function enterpriseOpportunityApiGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(
      new Error("Opportunity API requires ENTERPRISE_PERSISTENCE_MODE=prisma"),
      {
        status: 503,
        body: {
          success: false,
          error: {
            code: "PERSISTENCE_MODE_REQUIRED",
            message: "Opportunity API requires ENTERPRISE_PERSISTENCE_MODE=prisma",
          },
        } satisfies ApiResponse<unknown>,
      },
    );
  }
  if (!isOpportunityRegistryApiEnabled()) {
    throw Object.assign(new Error("Opportunity Registry API is disabled"), {
      status: 404,
      body: {
        success: false,
        error: {
          code: "OPPORTUNITY_API_DISABLED",
          message:
            "Opportunity Registry API is disabled (OPPORTUNITY_REGISTRY_API_ENABLED=false).",
        },
      } satisfies ApiResponse<unknown>,
    });
  }
}

export function mapOpportunityRouteError(err: unknown): {
  status: number;
  body: ApiResponse<unknown>;
} {
  if (typeof err === "object" && err !== null && "status" in err && "body" in err) {
    return err as { status: number; body: ApiResponse<unknown> };
  }
  if (err instanceof OpportunityNotFoundError) {
    return {
      status: 404,
      body: { success: false, error: { code: err.code, message: err.message } },
    };
  }
  if (err instanceof OpportunityActiveDuplicateError) {
    return {
      status: 409,
      body: {
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
        data: {
          existingOpportunityId: err.existingOpportunityId,
          existingOpportunityNumber: err.existingOpportunityNumber,
          productLabel: err.productLabel,
          existing: err.existing,
        },
      },
    };
  }
  if (err instanceof OpportunityConflictError) {
    return {
      status: 409,
      body: { success: false, error: { code: err.code, message: err.message } },
    };
  }
  if (err instanceof OpportunityValidationError) {
    return {
      status: 400,
      body: { success: false, error: { code: err.code, message: err.message } },
    };
  }
  const message = err instanceof Error ? err.message : "Opportunity request failed";
  return {
    status: 500,
    body: { success: false, error: { code: "OPPORTUNITY_ERROR", message } },
  };
}
