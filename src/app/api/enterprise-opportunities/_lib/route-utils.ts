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
    const status =
      (err as { statusCode?: number }).statusCode === 403 ? 403 : 400;
    return {
      status,
      body: {
        success: false,
        error: {
          code: (err as { code?: string }).code ?? err.code,
          message: err.message,
        },
      },
    };
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as { statusCode?: unknown }).statusCode === "number"
  ) {
    const status = (err as { statusCode: number }).statusCode;
    const code =
      "code" in err && typeof (err as { code?: unknown }).code === "string"
        ? (err as { code: string }).code
        : "OPPORTUNITY_ERROR";
    const message = err instanceof Error ? err.message : "Opportunity request failed";
    return {
      status,
      body: { success: false, error: { code, message } },
    };
  }
  const message = err instanceof Error ? err.message : "Opportunity request failed";
  return {
    status: 500,
    body: { success: false, error: { code: "OPPORTUNITY_ERROR", message } },
  };
}
