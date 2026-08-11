import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { errorResponse } from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { prisma } from "@server/lib/prisma";
import {
  WealthPartnerAlreadyExistsError,
  WealthPartnerValidationError,
} from "@server/services/wealth-partner-registry";

export function wealthPartnerPersistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error(
      "Wealth Partner Registry API requires ENTERPRISE_PERSISTENCE_MODE=prisma",
    );
  }
}

export function requireWealthPartnerWriteAccess(actor: { role: string }) {
  const allowed = new Set([
    "SUPER_ADMIN",
    "ADMIN",
    "MANAGER",
    "RM",
    "RELATIONSHIP_MANAGER",
  ]);
  if (!allowed.has(actor.role) && actor.role !== "USER") {
    // Soft: allow authenticated business users; block only if role empty
  }
  if (!actor.role) {
    throw Object.assign(new Error("Forbidden"), {
      status: 403,
      body: {
        success: false,
        error: { code: "FORBIDDEN", message: "Authentication required" },
      } satisfies ApiResponse<unknown>,
    });
  }
}

export async function resolveActorDisplayName(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!user) return undefined;
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

export function parseListQuery(url: URL): {
  page: number;
  pageSize: number;
  search?: string;
  partnerType: string;
  identityKind: "contact" | "company" | "all";
  status: string;
  contactId?: string;
  companyId?: string;
  createdFrom?: string;
  createdTo?: string;
} {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "50");
  const identityKindParam = url.searchParams.get("identityKind");
  const identityKind: "contact" | "company" | "all" =
    identityKindParam === "contact" || identityKindParam === "company"
      ? identityKindParam
      : "all";
  return {
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 50,
    search: url.searchParams.get("search") ?? undefined,
    partnerType: url.searchParams.get("partnerType") ?? "all",
    identityKind,
    status: url.searchParams.get("status") ?? "all",
    contactId: url.searchParams.get("contactId") ?? undefined,
    companyId: url.searchParams.get("companyId") ?? undefined,
    createdFrom: url.searchParams.get("createdFrom") ?? undefined,
    createdTo: url.searchParams.get("createdTo") ?? undefined,
  };
}

function prismaErrorMeta(err: unknown): {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
} {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  const meta =
    typeof err === "object" && err !== null && "meta" in err
      ? ((err as { meta?: Record<string, unknown> }).meta ?? undefined)
      : undefined;
  return { code, message, meta };
}

/**
 * Map Prisma / infra failures to actionable Wealth Partner messages (CO-WP-002 / CO-WP-006).
 * Never return the opaque "Wealth Partner request failed" without a cause.
 */
export function mapRouteError(err: unknown) {
  if (err instanceof WealthPartnerAlreadyExistsError) {
    return {
      status: 409,
      body: {
        success: false,
        error: {
          code: "WEALTH_PARTNER_ALREADY_REGISTERED",
          message: err.message,
          existingWealthPartner: err.existing,
        },
      } satisfies ApiResponse<unknown>,
    };
  }
  if (err instanceof WealthPartnerValidationError) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "VALIDATION_ERROR", message: err.message },
      } satisfies ApiResponse<unknown>,
    };
  }
  if (typeof err === "object" && err !== null && "status" in err) {
    return err as { status: number; body: ApiResponse<unknown> };
  }
  if (err instanceof Error && err.message.includes("ENTERPRISE_PERSISTENCE_MODE")) {
    return {
      status: 503,
      body: {
        success: false,
        error: {
          code: "PERSISTENCE_REQUIRED",
          message:
            "Backend service unavailable: Wealth Partner Registry requires ENTERPRISE_PERSISTENCE_MODE=prisma.",
        },
      } satisfies ApiResponse<unknown>,
    };
  }

  const { code: prismaCode, message, meta } = prismaErrorMeta(err);

  if (
    prismaCode === "P2021" ||
    /table .* does not exist/i.test(message) ||
    /relation .* does not exist/i.test(message)
  ) {
    return {
      status: 503,
      body: {
        success: false,
        error: {
          code: "WEALTH_PARTNER_SCHEMA_REQUIRED",
          message:
            "Unable to save Wealth Partner: database schema is missing. Apply prisma migration 20260728120000_co_wp_001_wealth_partner_registry, then retry.",
        },
      } satisfies ApiResponse<unknown>,
    };
  }

  if (prismaCode === "P2022" || /column .* does not exist/i.test(message)) {
    return {
      status: 503,
      body: {
        success: false,
        error: {
          code: "WEALTH_PARTNER_SCHEMA_INCOMPLETE",
          message:
            "Unable to save Wealth Partner: database schema is incomplete. Apply the latest Wealth Partner prisma migrations, then retry.",
        },
      } satisfies ApiResponse<unknown>,
    };
  }

  if (prismaCode === "P2002") {
    const target = Array.isArray(meta?.target)
      ? meta.target.join(",")
      : String(meta?.target ?? "");
    const isCodeCollision = /code/i.test(target) || target === "";
    return {
      status: 409,
      body: {
        success: false,
        error: {
          code: isCodeCollision
            ? "WEALTH_PARTNER_CODE_COLLISION"
            : "WEALTH_PARTNER_DUPLICATE",
          message: isCodeCollision
            ? "Wealth Partner code collision detected. Retry conversion — a unique code will be generated automatically."
            : "A unique Wealth Partner constraint was violated. Open the existing partner from the Registry if this Contact was already converted.",
        },
      } satisfies ApiResponse<unknown>,
    };
  }

  if (prismaCode === "P2003") {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "WEALTH_PARTNER_FK",
          message:
            "Unable to save Wealth Partner: linked organization or identity reference is invalid.",
        },
      } satisfies ApiResponse<unknown>,
    };
  }

  if (
    prismaCode.startsWith("P100") ||
    /can't reach database|connection|ECONNREFUSED|ETIMEDOUT/i.test(message)
  ) {
    return {
      status: 503,
      body: {
        success: false,
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "Backend service unavailable. Database could not be reached.",
        },
      } satisfies ApiResponse<unknown>,
    };
  }

  return null;
}

export function logWealthPartnerError(
  context: {
    endpoint: string;
    method?: string;
    payload?: unknown;
    responseStatus?: number;
  },
  err: unknown,
) {
  const { code, message, meta } = prismaErrorMeta(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error("[wealth-partner-registry]", {
    endpoint: context.endpoint,
    method: context.method ?? "n/a",
    responseStatus: context.responseStatus,
    payload: context.payload,
    prismaCode: code || undefined,
    message,
    meta,
    stack,
    error: err,
  });
}

export function respondMappedError(
  err: unknown,
  context?: {
    endpoint: string;
    method?: string;
    payload?: unknown;
  },
) {
  const mapped = mapRouteError(err);
  if (mapped) {
    logWealthPartnerError(
      {
        endpoint: context?.endpoint ?? "/api/wealth-partner-registry",
        method: context?.method,
        payload: context?.payload,
        responseStatus: mapped.status,
      },
      err,
    );
    return Response.json(mapped.body, { status: mapped.status });
  }
  logWealthPartnerError(
    {
      endpoint: context?.endpoint ?? "/api/wealth-partner-registry",
      method: context?.method,
      payload: context?.payload,
      responseStatus: 500,
    },
    err,
  );
  const detail =
    err instanceof Error && err.message.trim()
      ? err.message.trim()
      : "Unable to save Wealth Partner.";
  return errorResponse(500, "WEALTH_PARTNER_ERROR", detail);
}
