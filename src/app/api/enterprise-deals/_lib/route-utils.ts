/**
 * CO-ARCH-002-W2 — Enterprise Deal API route helpers.
 * Gates: ENTERPRISE_PERSISTENCE_MODE=prisma + DEAL_REGISTRY_API_ENABLED (default OFF).
 */
import {
  isDealRegistryApiEnabled,
} from "@/constants/enterprise-deal-registry";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { errorResponse } from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { DealIncludeOption, EnterpriseDealSearchQuery } from "@/types/enterprise-deal";
import { prisma } from "@server/lib/prisma";
import {
  DealConflictError,
  DealForbiddenError,
  DealNotFoundError,
  DealValidationError,
} from "@server/services/enterprise-deal/deal-validation";
import { resolveEffectiveDealSearchScope } from "@server/services/enterprise-case-visibility/build-visibility-where";

export function enterpriseDealApiGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(
      new Error("Enterprise Deal API requires ENTERPRISE_PERSISTENCE_MODE=prisma"),
      {
        status: 503,
        body: {
          success: false,
          error: {
            code: "PERSISTENCE_MODE_REQUIRED",
            message: "Enterprise Deal API requires ENTERPRISE_PERSISTENCE_MODE=prisma",
          },
        } satisfies ApiResponse<unknown>,
      },
    );
  }
  if (!isDealRegistryApiEnabled()) {
    throw Object.assign(new Error("Enterprise Deal API is disabled"), {
      status: 404,
      body: {
        success: false,
        error: {
          code: "DEAL_API_DISABLED",
          message:
            "Enterprise Deal API is disabled (DEAL_REGISTRY_API_ENABLED=false). Wave 2 idle until certified enablement.",
        },
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

export function mapDealRouteError(err: unknown): {
  status: number;
  body: ApiResponse<unknown>;
} {
  if (typeof err === "object" && err !== null && "status" in err && "body" in err) {
    return err as { status: number; body: ApiResponse<unknown> };
  }
  if (err instanceof DealNotFoundError) {
    return {
      status: 404,
      body: { success: false, error: { code: err.code, message: err.message } },
    };
  }
  if (err instanceof DealConflictError) {
    return {
      status: 409,
      body: { success: false, error: { code: err.code, message: err.message } },
    };
  }
  if (err instanceof DealForbiddenError) {
    return {
      status: 403,
      body: { success: false, error: { code: err.code, message: err.message } },
    };
  }
  if (err instanceof DealValidationError) {
    return {
      status: 400,
      body: { success: false, error: { code: err.code, message: err.message } },
    };
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 501
  ) {
    const e = err as { status: number; code?: string; message: string };
    return {
      status: 501,
      body: {
        success: false,
        error: {
          code: e.code ?? "NOT_IMPLEMENTED",
          message: e.message,
        },
      },
    };
  }
  const message = err instanceof Error ? err.message : "Enterprise Deal request failed";
  return {
    status: 400,
    body: { success: false, error: { code: "DEAL_API_ERROR", message } },
  };
}

export function dealNotFound(message = "Deal not found") {
  return errorResponse(404, "DEAL_NOT_FOUND", message);
}

export function parseInclude(url: URL): DealIncludeOption[] {
  const raw = url.searchParams.get("include") ?? "";
  if (!raw.trim()) return [];
  const allowed = new Set<DealIncludeOption>([
    "counterparties",
    "documents",
    "tasks",
    "activities",
    "timeline",
    "snapshots",
    "siblings",
  ]);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is DealIncludeOption => allowed.has(s as DealIncludeOption));
}

export function parseDealSearchQuery(
  url: URL,
  scopeUserId?: string,
  role?: string | null,
): EnterpriseDealSearchQuery {
  const archivedParam = url.searchParams.get("archived");
  const requestedScope =
    (url.searchParams.get("scope") as EnterpriseDealSearchQuery["scope"]) ?? "all";
  const scope = resolveEffectiveDealSearchScope(requestedScope, role);
  return {
    q: url.searchParams.get("q") ?? undefined,
    legacyLoanFileId: url.searchParams.get("legacyLoanFileId") ?? undefined,
    productFamily: (url.searchParams.get("productFamily") as EnterpriseDealSearchQuery["productFamily"]) ?? undefined,
    productId: url.searchParams.get("productId") ?? undefined,
    grossStage: url.searchParams.get("grossStage") ?? undefined,
    subStage: url.searchParams.get("subStage") ?? undefined,
    lifecycleStatus:
      (url.searchParams.get("lifecycleStatus") as EnterpriseDealSearchQuery["lifecycleStatus"]) ??
      undefined,
    operationalStatus:
      (url.searchParams.get(
        "operationalStatus",
      ) as EnterpriseDealSearchQuery["operationalStatus"]) ?? undefined,
    priority: (url.searchParams.get("priority") as EnterpriseDealSearchQuery["priority"]) ?? undefined,
    assignedRmUserId: url.searchParams.get("assignedRmUserId") ?? undefined,
    primaryContactId: url.searchParams.get("primaryContactId") ?? undefined,
    counterpartyType:
      (url.searchParams.get("counterpartyType") as EnterpriseDealSearchQuery["counterpartyType"]) ??
      undefined,
    counterpartyId: url.searchParams.get("counterpartyId") ?? undefined,
    dateCreatedFrom: url.searchParams.get("dateCreatedFrom") ?? undefined,
    dateCreatedTo: url.searchParams.get("dateCreatedTo") ?? undefined,
    updatedFrom: url.searchParams.get("updatedFrom") ?? undefined,
    updatedTo: url.searchParams.get("updatedTo") ?? undefined,
    archived:
      archivedParam === "true" ? true : archivedParam === "false" ? false : undefined,
    scope,
    scopeUserId,
    page: Number(url.searchParams.get("page") ?? 1),
    pageSize: Number(url.searchParams.get("pageSize") ?? 25),
    sort: (url.searchParams.get("sort") as EnterpriseDealSearchQuery["sort"]) ?? "updatedAt_desc",
    view: (url.searchParams.get("view") as EnterpriseDealSearchQuery["view"]) ?? undefined,
  };
}
